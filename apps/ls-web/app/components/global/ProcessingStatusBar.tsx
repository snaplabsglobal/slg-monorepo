'use client'

import { useRouter } from 'next/navigation'
import { useRealtimeTransactions } from '@/app/hooks/useRealtimeTransactions'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { deriveAsyncStatus } from '@/app/components/transactions/status'

export function ProcessingStatusBar() {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined)
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  // Get current user's organization
  useEffect(() => {
    let mounted = true
    async function fetchOrg() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || !mounted) return

        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (mounted && membership?.organization_id) {
          setOrganizationId(membership.organization_id)
        }
      } catch (error) {
        console.error('[ProcessingStatusBar] Error fetching organization:', error)
      }
    }
    void fetchOrg()
    return () => {
      mounted = false
    }
  }, [supabase])

  const { pendingCount, transactions } = useRealtimeTransactions(organizationId)
  const [retrying, setRetrying] = useState(false)
  
  // Debug: log pending transactions
  useEffect(() => {
    const pendingTxs = transactions.filter((t) => {
      const status = deriveAsyncStatus(t)
      return status === 'pending'
    })
    if (pendingTxs.length > 0) {
      console.log('[ProcessingStatusBar] Pending transactions:', pendingTxs.length, pendingTxs.map(t => ({
        id: t.id,
        status: t.status,
        vendor_name: t.vendor_name,
        ai_confidence: t.ai_confidence,
        created_at: t.created_at,
      })))
    }
  }, [transactions])

  // Auto-retry analyze for stuck pending transactions
  useEffect(() => {
    if (pendingCount === 0 || retrying) return
    if (!organizationId) return

    // Find pending transactions that might be stuck
    const pendingTxs = transactions.filter((t) => {
      const status = deriveAsyncStatus(t)
      return status === 'pending' && t.status === 'pending'
    })

    console.log('[ProcessingStatusBar] Checking for stuck transactions:', {
      pendingCount,
      pendingTxsCount: pendingTxs.length,
      organizationId,
    })

    if (pendingTxs.length === 0) return

    // Check if any have been pending for more than 30 seconds without analysis
    const now = Date.now()
    const stuckTxs = pendingTxs.filter((t) => {
      const createdAt = new Date(t.created_at).getTime()
      const ageSeconds = (now - createdAt) / 1000
      // If pending for > 30 seconds and vendor_name is 'Processing...' or similar, likely stuck
      // BUT: Skip if status is not 'pending' (may have been updated but Realtime hasn't synced yet)
      if (t.status !== 'pending') {
        return false // Not stuck if status changed
      }
      
      const vendor = (t.vendor_name || '').toLowerCase()
      const isStuck =
        ageSeconds > 30 &&
        (vendor === 'processing...' ||
          vendor === 'analyzing...' ||
          !t.vendor_name ||
          (t.ai_confidence ?? 0) === 0)
      
      if (isStuck) {
        console.log('[ProcessingStatusBar] Found stuck transaction:', {
          id: t.id,
          age: Math.round(ageSeconds) + 's',
          vendor_name: t.vendor_name,
          ai_confidence: t.ai_confidence,
        })
      }
      
      return isStuck
    })

    if (stuckTxs.length > 0) {
      console.log(`[ProcessingStatusBar] Found ${stuckTxs.length} stuck pending transactions, retrying analyze...`, stuckTxs.map(t => ({ id: t.id, age: Math.round((now - new Date(t.created_at).getTime()) / 1000) + 's' })))
      setRetrying(true)

      // Retry analyze for ALL stuck transactions
      Promise.all(
        stuckTxs.map((tx) =>
          fetch(`/api/receipts/${tx.id}/analyze`, { method: 'POST' })
            .then(async (res) => {
              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                console.error(`[ProcessingStatusBar] Retry analyze failed for ${tx.id}:`, res.status, errorData)
                return { id: tx.id, success: false }
              } else {
                const result = await res.json().catch(() => ({}))
                console.log(`[ProcessingStatusBar] ✅ Retry analyze completed for ${tx.id}:`, result)
                // If analyze succeeded, the transaction should be updated in DB
                // Realtime should push the update, but we'll also trigger a manual refresh
                return { id: tx.id, success: true, status: result.status }
              }
            })
            .catch((err) => {
              console.error(`[ProcessingStatusBar] Retry analyze error for ${tx.id}:`, err)
              return { id: tx.id, success: false }
            })
        )
      ).then((results) => {
        const successCount = results.filter((r) => r.success).length
        console.log(`[ProcessingStatusBar] Retry completed: ${successCount}/${stuckTxs.length} succeeded`)
        
        // Note: Realtime should automatically update the UI when DB changes
        // If Realtime doesn't work, the hook will refresh on next check
      }).finally(() => {
        // Reset retrying flag after 5 seconds (shorter delay since we're not waiting for results)
        setTimeout(() => setRetrying(false), 5000)
      })
    }
  }, [pendingCount, transactions, retrying, organizationId])

  if (pendingCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-white/90 border-t-transparent animate-spin"
            aria-label="processing"
          />
          <span className="font-semibold">
            正在处理 {pendingCount} 张收据…
            {retrying && <span className="text-xs opacity-75 ml-2">(正在重试分析...)</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push('/transactions')}
          className="text-sm font-semibold underline hover:text-blue-100"
        >
          查看详情
        </button>
      </div>
    </div>
  )
}
