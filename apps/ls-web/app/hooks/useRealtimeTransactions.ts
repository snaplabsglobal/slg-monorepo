'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { deriveAsyncStatus } from '@/app/components/transactions/status'
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

  // Create Supabase client once (memoized) - stable reference to prevent re-subscription
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    [] // Empty deps - client should never change
  )
  
  // Memoize channel name to prevent recreation
  const channelName = useMemo(
    () => (organizationId ? `transactions-${organizationId}` : 'transactions-global'),
    [organizationId]
  )

  useEffect(() => {
    // CRITICAL: Early return if organizationId is undefined - don't subscribe without it
    if (!organizationId) {
      setIsLoading(false)
      return
    }

    // Offline: do not fetch and do not start 5s polling (avoid "hitting the wall" every 5s)
    if (isOffline) {
      setIsLoading(false)
      return
    }

    mountedRef.current = true
    isCleaningUpRef.current = false
    hadChannelErrorRef.current = false

    const loadTransactions = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        onOfflineRefetch?.()
        return
      }
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
          if (mountedRef.current) setIsLoading(false)
          return
        }

        if (mountedRef.current) {
          const transactionMap = new Map<string, Transaction>()
          ;(data || []).forEach((tx: Transaction) => {
            if (!tx.deleted_at) transactionMap.set(tx.id, tx)
          })
          const uniqueTransactions = Array.from(transactionMap.values())
          setTransactions(uniqueTransactions)
          const pending = uniqueTransactions.filter((t: Transaction) => deriveAsyncStatus(t) === 'pending').length
          setPendingCount(pending)
          setIsLoading(false)

          // Non-blocking: cache summaries for offline detail (list seen once = detail openable offline)
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
                // Ignore cache errors; do not block UI
              }
            })()
          }
        }
      } catch (err) {
        console.error('[RealtimeTransactions] Load error:', err)
        if (mountedRef.current) setIsLoading(false)
      }
    }

    void loadTransactions()

    const handleTransactionAnalyzed = () => {
      void loadTransactions()
    }
    window.addEventListener('transaction-analyzed', handleTransactionAnalyzed)

    // Only run 5s polling when online; offline branch above returns early so no interval
    const refreshInterval = setInterval(() => {
      if (mountedRef.current && organizationId && typeof navigator !== 'undefined' && navigator.onLine) {
        void loadTransactions()
      }
    }, 5000)

    // CRITICAL: Check if channel already exists to prevent duplicate subscriptions
    if (channelRef.current) {
      return () => {
        clearInterval(refreshInterval)
        window.removeEventListener('transaction-analyzed', handleTransactionAnalyzed)
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transactions',
          // Note: Filter by organization_id in the callback instead of in the subscription
          // This ensures we get all events and filter client-side
        },
        (payload) => {
          // Filter by organization_id if specified
          const newRow = payload.new as Record<string, unknown> | null
          const oldRow = payload.old as Record<string, unknown> | null
          const txOrgId = (newRow?.organization_id || oldRow?.organization_id) as string | undefined
          if (organizationId && txOrgId !== organizationId) {
            return
          }
          
          // Update state using upsert logic (Map by ID) to prevent duplicates
          if (mountedRef.current) {
            // Data lock: critical fields only when existing tx is already "Ready" (approved)
            // to avoid flicker from minor Realtime updates (e.g. ai_confidence, raw_data)
            const CRITICAL_KEYS = [
              'deleted_at', 'voided_at', 'status', 'needs_review', 'vendor_name',
              'total_amount', 'transaction_date', 'tax_details', 'updated_at',
              'category_user', 'attachment_url', 'is_suspected_duplicate',
            ] as const

            setTransactions((prev) => {
              const transactionMap = new Map<string, Transaction>()
              prev.forEach((tx) => {
                if (!tx.deleted_at) {
                  transactionMap.set(tx.id, tx)
                }
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
              
              // Remove deleted transaction (UPDATE with deleted_at)
              if (payload.eventType === 'UPDATE' && payload.new?.deleted_at) {
                transactionMap.delete(payload.new.id)
              }
              
              // Remove deleted transaction (DELETE event)
              if (payload.eventType === 'DELETE' && payload.old?.id) {
                transactionMap.delete(payload.old.id)
              }
              
              const updated = Array.from(transactionMap.values())
              
              // Update pending count based on updated transactions
              const pending = updated.filter((t: Transaction) => deriveAsyncStatus(t) === 'pending').length
              setPendingCount(pending)
              return updated
            })
            
            // CRITICAL: DO NOT call loadTransactions() here - it causes infinite loops
            // The upsert logic above is sufficient to keep state in sync
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          hadChannelErrorRef.current = true
          console.error('[RealtimeTransactions] ❌ Channel error - Realtime may not be enabled for table "transactions" (check Supabase Dashboard → Database → Replication)')
        } else if (status === 'TIMED_OUT') {
          hadChannelErrorRef.current = true
          console.error('[RealtimeTransactions] ⏱️ Subscription timed out')
          // We do NOT clear transactions or clearInterval(refreshInterval): local state and
          // manual polling backup keep the UI working; Realtime may reconnect on next effect.
        } else if (status === 'CLOSED') {
          // Skip redundant warn when close is due to a prior error, or during our own cleanup
          if (!isCleaningUpRef.current && !hadChannelErrorRef.current) {
            console.warn('[RealtimeTransactions] ⚠️ Channel closed')
          }
          // CRITICAL: DO NOT trigger reconnection here - it causes loops
          // Supabase will handle reconnection automatically, or useEffect will re-run if orgId changes
          // Removing the manual reconnect logic to prevent the "Cleaning up channel" loop
        }
      })

    channelRef.current = channel

    // CRITICAL: Cleanup function - only runs on unmount or when organizationId/channelName actually changes
    return () => {
      isCleaningUpRef.current = true
      clearInterval(refreshInterval)
      window.removeEventListener('transaction-analyzed', handleTransactionAnalyzed)
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
