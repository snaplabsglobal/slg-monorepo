'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { getBrowserSupabase } from '@/app/lib/supabase/browser'
import { getReceiptStatus } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'
import { useOffline } from '@/app/hooks/useOffline'
import { putTransaction, toTransactionSummary } from '@/app/lib/offline-cache/transactions'

type Transaction = {
  id: string
  organization_id: string
  transaction_date: string
  vendor_name: string | null
  total_amount: number
  currency: string
  direction: 'income' | 'expense'
  status: string
  is_verified?: boolean | null
  needs_review?: boolean | null
  ai_confidence?: number | null
  raw_data?: any
  created_at: string
  deleted_at?: string | null
}

export type UseRealtimeTransactionsOptions = {
  onOfflineRefetch?: () => void
}

export function useRealtimeTransactions(
  organizationId?: string,
  options?: UseRealtimeTransactionsOptions
) {
  const { onOfflineRefetch } = options ?? {}
  const isOffline = useOffline()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)
  const channelRef = useRef<any>(null)
  const isCleaningUpRef = useRef(false)
  const hadChannelErrorRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  /** Keep latest list for silent refresh: only update state when data actually changed (by updated_at) */
  const transactionsRef = useRef<Transaction[]>([])
  transactionsRef.current = transactions

  // Single browser Supabase client (same as subscribeTransaction) to avoid "Subscription timed out" from multiple connections
  const supabase = useMemo(
    () => (typeof window !== 'undefined' ? getBrowserSupabase() : null),
    []
  )

  const channelName = useMemo(
    () => (organizationId ? `transactions-${organizationId}` : 'transactions-global'),
    [organizationId]
  )

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false)
      return
    }
    if (isOffline) {
      setIsLoading(false)
      return
    }
    if (!supabase) return

    mountedRef.current = true
    isCleaningUpRef.current = false
    hadChannelErrorRef.current = false
    initialLoadDoneRef.current = false

    const loadTransactions = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        onOfflineRefetch?.()
        return
      }
      const isInitial = !initialLoadDoneRef.current
      if (isInitial && mountedRef.current) setIsLoading(true)
      try {
        const query = supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .limit(50)

        const { data, error } = await query

        if (error) {
          console.error('[RealtimeTransactions] Load error:', error)
          if (mountedRef.current && isInitial) {
            initialLoadDoneRef.current = true
            setIsLoading(false)
          }
          return
        }

        if (mountedRef.current) {
          const transactionMap = new Map<string, Transaction>()
          ;(data || []).forEach((tx: Transaction) => {
            if (!tx.deleted_at) transactionMap.set(tx.id, tx)
          })
          const uniqueTransactions = Array.from(transactionMap.values())
          const prev = transactionsRef.current
          /** Only trigger re-render when data actually changed (compare id + updated_at) */
          const same =
            prev.length === uniqueTransactions.length &&
            uniqueTransactions.every((t) => {
              const p = prev.find((x) => x.id === t.id)
              return p && (p as any).updated_at === (t as any).updated_at
            })
          if (!same) {
            setTransactions(uniqueTransactions)
            const pending = uniqueTransactions.filter(
              (t: Transaction) => getReceiptStatus(toReceiptLike(t as any)) === 'PROCESSING'
            ).length
            setPendingCount(pending)
          }
          initialLoadDoneRef.current = true
          setIsLoading(false)

          if (uniqueTransactions.length > 0) {
            void (async () => {
              try {
                const MAX_CACHE = 50
                const list = uniqueTransactions.slice(0, MAX_CACHE)
                for (const tx of list) {
                  const summary = toTransactionSummary(tx)
                  if (summary?.id) await putTransaction(summary)
                }
              } catch {
                // Ignore cache errors
              }
            })()
          }
        }
      } catch (err) {
        console.error('[RealtimeTransactions] Load error:', err)
        if (mountedRef.current && isInitial) {
          initialLoadDoneRef.current = true
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    const handleTransactionAnalyzed = () => {
      void loadTransactions()
    }
    const handleTransactionVerified = (e: Event) => {
      const id = (e as CustomEvent<{ transactionId?: string }>)?.detail?.transactionId
      if (id && mountedRef.current) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_verified: true } : t))
        )
      }
      if (typeof navigator !== 'undefined' && navigator.onLine) void loadTransactions()
    }
    window.addEventListener('transaction-analyzed', handleTransactionAnalyzed)
    window.addEventListener('transaction-verified', handleTransactionVerified)

    // Only run 5s polling when online; offline branch above returns early so no interval
    const refreshInterval = setInterval(() => {
      if (mountedRef.current && organizationId && typeof navigator !== 'undefined' && navigator.onLine) {
        void loadTransactions()
      }
    }, 30000)

    let retry = 0
    const sub = () => {
      if (isCleaningUpRef.current || !mountedRef.current) return
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          /* ignore */
        }
        channelRef.current = null
      }

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
          },
          (payload) => {
            const newRow = payload.new as Record<string, unknown> | null
            const oldRow = payload.old as Record<string, unknown> | null
            const txOrgId = (newRow?.organization_id || oldRow?.organization_id) as string | undefined
            if (organizationId && txOrgId !== organizationId) return

            if (mountedRef.current) {
              const CRITICAL_KEYS = [
                'deleted_at', 'voided_at', 'status', 'needs_review', 'is_verified', 'vendor_name',
                'total_amount', 'transaction_date', 'tax_details', 'updated_at',
                'category_user', 'attachment_url', 'is_suspected_duplicate',
              ] as const

              setTransactions((prev) => {
                const transactionMap = new Map<string, Transaction>()
                prev.forEach((tx) => {
                  if (!tx.deleted_at) transactionMap.set(tx.id, tx)
                })

                if (payload.new) {
                  const newTx = payload.new as Transaction
                  if (!newTx.deleted_at) {
                    const existing = transactionMap.get(newTx.id)
                    const isStable = existing?.status === 'approved'
                    if (isStable && existing) {
                      const merged = { ...existing } as Transaction
                      CRITICAL_KEYS.forEach((key) => {
                        if (key in newTx && (newTx as any)[key] !== undefined) {
                          (merged as any)[key] = (newTx as any)[key]
                        }
                      })
                      transactionMap.set(newTx.id, merged)
                    } else {
                      transactionMap.set(newTx.id, newTx)
                    }
                  } else {
                    transactionMap.delete(newTx.id)
                  }
                }
                if (payload.eventType === 'UPDATE' && payload.new?.deleted_at) {
                  transactionMap.delete(payload.new.id)
                }
                if (payload.eventType === 'DELETE' && payload.old?.id) {
                  transactionMap.delete(payload.old.id)
                }
                const updated = Array.from(transactionMap.values())
                const pending = updated.filter(
                  (t: Transaction) => getReceiptStatus(toReceiptLike(t as any)) === 'PROCESSING'
                ).length
                setPendingCount(pending)
                return updated
              })
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') retry = 0
          if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            hadChannelErrorRef.current = true
            if (isCleaningUpRef.current) return
            const wait = Math.min(30000, 500 * Math.pow(2, retry++))
            setTimeout(() => {
              if (isCleaningUpRef.current) return
              sub()
            }, wait)
          }
        })

      channelRef.current = channel
    }

    sub()

    const onOnline = () => {
      if (isCleaningUpRef.current) return
      sub()
    }
    window.addEventListener('online', onOnline)

    return () => {
      isCleaningUpRef.current = true
      window.removeEventListener('online', onOnline)
      clearInterval(refreshInterval)
      window.removeEventListener('transaction-analyzed', handleTransactionAnalyzed)
      window.removeEventListener('transaction-verified', handleTransactionVerified)
      mountedRef.current = false
      if (channelRef.current) {
        const ch = channelRef.current
        channelRef.current = null
        // Fire-and-forget: avoid "WebSocket closed before connection established" when navigating away quickly
        void Promise.resolve().then(() => {
          try {
            supabase.removeChannel(ch)
          } catch {
            // ignore cleanup errors
          }
        })
      }
    }
    // Re-run when isOffline flips to false so we start polling and refresh once (online recovery)
  }, [organizationId, isOffline, supabase])

  return {
    transactions,
    pendingCount,
    isLoading,
  }
}
