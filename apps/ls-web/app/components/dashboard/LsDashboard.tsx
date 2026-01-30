'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ActionAlerts, type ActionAlert } from './ActionAlerts'
import { ProjectBreakdownPlaceholder } from './ProjectBreakdownPlaceholder'
import { formatDateOnly } from '@/app/lib/utils/format'

type DashboardStats = {
  totalTransactions: number
  needsReview: number
  approved: number
  totalGST: number
  totalPST: number
  monthlyTotal: number
  avgConfidence?: number
}

type Transaction = {
  id: string
  vendor_name: string | null
  transaction_date: string
  total_amount: number
  currency: string
  status: string
  needs_review?: boolean
  ai_confidence?: number | null
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function LsDashboard() {
  const month = useMemo(() => monthKey(new Date()), [])

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Transaction[]>([])

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        setLoading(true)

        const [statsRes, txRes] = await Promise.all([
          fetch(`/api/accountant/stats?month=${month}`),
          fetch(`/api/transactions?limit=5&direction=expense`),
        ])

        if (!mounted) return

        if (statsRes.ok) {
          setStats(await statsRes.json())
        } else {
          setStats(null)
        }

        if (txRes.ok) {
          const txJson = await txRes.json()
          console.log('[Dashboard] Transactions fetched:', {
            count: txJson.transactions?.length || 0,
            transactions: txJson.transactions,
            pagination: txJson.pagination,
          })
          
          // Ensure all transactions have required fields
          const validTransactions = (txJson.transactions || []).map((tx: any) => ({
            ...tx,
            transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
            total_amount: tx.total_amount ? Number(tx.total_amount) : 0,
            currency: tx.currency || 'CAD',
            status: tx.status || 'pending',
          }))
          
          console.log('[Dashboard] Valid transactions:', validTransactions)
          setRecent(validTransactions)
        } else {
          const errorData = await txRes.json().catch(() => ({}))
          console.error('[Dashboard] Failed to fetch transactions:', {
            status: txRes.status,
            error: errorData,
          })
          setRecent([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [month])

  // Build action alerts from recent + stats
  const alerts = useMemo((): ActionAlert[] => {
    const list: ActionAlert[] = []
    const unknownVendors = recent.filter(
      (t) => !t.vendor_name || String(t.vendor_name).toLowerCase().includes('unknown')
    )
    if (unknownVendors.length > 0) {
      list.push({
        id: 'unknown-vendors',
        type: 'warning',
        icon: '⚠️',
        message: `${unknownVendors.length} 张单据需要补充供应商信息`,
        description: '完善信息后可以更准确地分类和导出',
        actionLabel: '立即处理',
        href: '/transactions',
      })
    }
    const pendingCount = stats?.needsReview ?? 0
    if (pendingCount > 0) {
      list.push({
        id: 'pending-review',
        type: 'info',
        icon: '🔍',
        message: `${pendingCount} 张单据等待您的审核`,
        description: 'AI 已完成识别，请确认信息是否正确',
        actionLabel: '去审核',
        href: '/review',
      })
    }
    return list
  }, [recent, stats?.needsReview])

  return (
    <div className="space-y-8">
      <ActionAlerts alerts={alerts} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            This month: <span className="font-medium">{month}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/transactions/upload"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-colors"
          >
            Upload Receipt
          </Link>
          <Link
            href="/review"
            className="px-4 py-2 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold transition-colors"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {/* Stats - avoid raw $0.00, use guided copy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Monthly Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading
              ? '—'
              : (stats?.monthlyTotal ?? 0) > 0
                ? `$${(stats!.monthlyTotal).toFixed(2)}`
                : '开始记录'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {(stats?.monthlyTotal ?? 0) > 0 ? 'Receipts (CAD)' : '上传第一张收据'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Receipts</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? '—' : String(stats?.totalTransactions ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Needs Review</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {loading ? '—' : (stats?.needsReview ?? 0) > 0 ? String(stats!.needsReview) : '全部完成 ✓'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {(stats?.needsReview ?? 0) > 0 ? '需要您确认' : '保持整洁'}
          </p>
        </div>
      </div>

      {/* Project placeholder (GST/Tax summary moved to Reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectBreakdownPlaceholder />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link
          href="/transactions/upload"
          className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow"
        >
          <p className="text-sm font-medium text-white/80">Snap & Upload</p>
          <p className="text-2xl font-bold mt-2">Upload a receipt</p>
          <p className="text-sm text-white/80 mt-2">
            AI will extract vendor, date, taxes, and category.
          </p>
        </Link>

        <Link
          href="/transactions"
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-600">Receipts</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">View receipts</p>
          <p className="text-sm text-gray-600 mt-2">
            Purchases, refunds, tags, and categories.
          </p>
        </Link>

        <Link
          href="/review"
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-600">Review</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">Review Queue</p>
          <p className="text-sm text-gray-600 mt-2">
            Confirm receipts and export for your accountant.
          </p>
        </Link>
      </div>

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent transactions</h2>
            <p className="text-sm text-gray-600">Latest 5</p>
          </div>
          <Link href="/transactions" prefetch={false} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            View all
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {recent.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">
              {loading ? 'Loading…' : 'No transactions yet. Upload your first receipt.'}
            </div>
          ) : (
            recent.map((tx) => (
              <Link
                key={tx.id}
                href="/transactions"
                prefetch={false}
                className="p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {tx.vendor_name || 'Unknown vendor'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {tx.transaction_date 
                      ? formatDateOnly(tx.transaction_date) 
                      : 'No date'} · {tx.status || 'pending'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">
                    ${Number(tx.total_amount || 0).toFixed(2)} {tx.currency || 'CAD'}
                  </p>
                  {typeof tx.ai_confidence === 'number' && (
                    <p className="text-xs text-gray-500">
                      AI {(tx.ai_confidence * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

