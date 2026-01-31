'use client'

import { useRouter } from 'next/navigation'
import { useRealtimeTransactions } from '@/app/hooks/useRealtimeTransactions'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getReceiptStatus } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'

const FISCAL_GREEN = '#10b981'

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

  const { pendingCount, transactions } = useRealtimeTransactions(organizationId)
  const [retrying, setRetrying] = useState(false)
  const prevPendingRef = useRef(0)
  const [justCompleted, setJustCompleted] = useState(false)

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

  // When pending goes from >0 to 0: show success flash twice then hide
  useEffect(() => {
    const prev = prevPendingRef.current
    prevPendingRef.current = pendingCount
    if (prev > 0 && pendingCount === 0) {
      setJustCompleted(true)
      const t = setTimeout(() => setJustCompleted(false), 1800)
      return () => clearTimeout(t)
    }
  }, [pendingCount])

  // Auto-retry analyze for stuck pending transactions
  useEffect(() => {
    if (pendingCount === 0 || retrying) return
    if (!organizationId) return

    const pendingTxs = transactions.filter((t) => {
      const status = getReceiptStatus(toReceiptLike(t as any))
      return status === 'PROCESSING' && t.status === 'pending'
    })

    if (pendingTxs.length === 0) return

    const now = Date.now()
    const stuckTxs = pendingTxs.filter((t) => {
      const createdAt = new Date(t.created_at).getTime()
      const ageSeconds = (now - createdAt) / 1000
      if (t.status !== 'pending') return false
      const vendor = (t.vendor_name || '').toLowerCase()
      return (
        ageSeconds > 30 &&
        (vendor === 'processing...' ||
          vendor === 'analyzing...' ||
          !t.vendor_name ||
          (t.ai_confidence ?? 0) === 0)
      )
    })

    if (stuckTxs.length > 0) {
      setRetrying(true)
      Promise.all(
        stuckTxs.map((tx) =>
          fetch(`/api/receipts/${tx.id}/analyze`, { method: 'POST' })
            .then(async (res) => {
              if (!res.ok) return { id: tx.id, success: false }
              const result = await res.json().catch(() => ({}))
              return { id: tx.id, success: true, status: result.status }
            })
            .catch(() => ({ id: tx.id, success: false }))
        )
      ).finally(() => {
        setTimeout(() => setRetrying(false), 5000)
      })
    }
  }, [pendingCount, transactions, retrying, organizationId])

  const showBar = pendingCount > 0 || justCompleted
  if (!showBar) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: FISCAL_GREEN }}
      role="status"
      aria-live="polite"
    >
      {/* Thin progress bar: pulse when loading, flash twice when just completed */}
      <div
        className={`h-1 w-full ${justCompleted ? 'status-bar-success-flash' : 'animate-pulse'}`}
        style={{
          background: justCompleted ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
        }}
      />
      <div className="flex w-full max-w-7xl items-center justify-between px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          {!justCompleted && (
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-white/90 border-t-transparent animate-spin"
              aria-hidden
            />
          )}
          <span className="text-sm font-medium">
            {justCompleted
              ? '✓ 识别完成'
              : `AI 正在抓取數據… ${pendingCount} 张收据`}
            {retrying && !justCompleted && (
              <span className="ml-2 text-white/90">(正在重试…)</span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push('/transactions')}
          className="text-sm font-medium text-white/95 underline hover:text-white"
        >
          查看详情
        </button>
      </div>
    </div>
  )
}
