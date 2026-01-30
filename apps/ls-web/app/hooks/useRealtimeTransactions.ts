'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { deriveAsyncStatus } from '@/app/components/transactions/status'

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

export function useRealtimeTransactions(organizationId?: string) {
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

    mountedRef.current = true
    isCleaningUpRef.current = false
    hadChannelErrorRef.current = false

    // Initial load
    const loadTransactions = async () => {
      try {
        const query = supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', organizationId) // organizationId is guaranteed to exist here
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .limit(50)

        const { data, error } = await query

        if (error) {
          console.error('[RealtimeTransactions] Load error:', error)
          if (mountedRef.current) {
            setIsLoading(false)
          }
          return
        }

        if (mountedRef.current) {
          // Use Map for upsert logic to prevent duplicates (ID-based deduplication)
          // CRITICAL: Filter out deleted items (eye-out-of-sight)
          const transactionMap = new Map<string, Transaction>()
          ;(data || []).forEach((tx: Transaction) => {
            // Only add non-deleted transactions to the map
            if (!tx.deleted_at) {
              transactionMap.set(tx.id, tx) // If ID exists, it will be overwritten (upsert)
            }
          })
          const uniqueTransactions = Array.from(transactionMap.values())
          
          setTransactions(uniqueTransactions)
          const pending = uniqueTransactions.filter((t: Transaction) => deriveAsyncStatus(t) === 'pending').length
          setPendingCount(pending)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('[RealtimeTransactions] Load error:', error)
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()
    
    // CRITICAL: Listen for custom events as fallback if Realtime is delayed
    const handleTransactionAnalyzed = () => {
      void loadTransactions()
    }
    
    window.addEventListener('transaction-analyzed', handleTransactionAnalyzed)
    
    // CRITICAL: Set up periodic refresh as fallback if Realtime doesn't work
    // This ensures UI updates even if Realtime events are missed
    // Use a shorter interval (5 seconds) to catch analyze completion faster
    const refreshInterval = setInterval(() => {
      if (mountedRef.current && organizationId) {
        void loadTransactions()
      }
    }, 5000) // Refresh every 5 seconds as fallback

    // CRITICAL: Check if channel already exists to prevent duplicate subscriptions
    if (channelRef.current) {
      return () => {
        clearInterval(refreshInterval)
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
            // Use functional update with Map-based upsert
            setTransactions((prev) => {
              const transactionMap = new Map<string, Transaction>()
              // Add existing transactions (only non-deleted ones)
              prev.forEach((tx) => {
                // Filter out deleted items immediately (eye-out-of-sight)
                if (!tx.deleted_at) {
                  transactionMap.set(tx.id, tx)
                }
              })
              
              // Upsert new/updated transaction (only if not deleted)
              if (payload.new) {
                const newTx = payload.new as Transaction
                // Only add if not deleted (or if deleted_at was cleared - restore)
                if (!newTx.deleted_at) {
                  transactionMap.set(newTx.id, newTx)
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
      clearInterval(refreshInterval) // Clear periodic refresh
      window.removeEventListener('transaction-analyzed', handleTransactionAnalyzed)
      mountedRef.current = false
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (error) {
          console.error('[RealtimeTransactions] Error removing channel:', error)
        }
        channelRef.current = null
      }
    }
    // CRITICAL: Only depend on organizationId (channelName is derived from it)
    // This prevents unnecessary re-subscriptions when channelName string changes but orgId is the same
  }, [organizationId, supabase]) // organizationId and supabase (both stable)

  return {
    transactions,
    pendingCount,
    isLoading,
  }
}
