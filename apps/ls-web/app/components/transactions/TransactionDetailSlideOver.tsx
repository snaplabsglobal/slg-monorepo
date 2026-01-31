'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptImagePanel } from './ReceiptImagePanel'
import { TransactionDataForm, type TransactionDetail } from './TransactionDataForm'
import { PermanentDeleteDialog } from './PermanentDeleteDialog'
import { fetchWithOffline } from '@/app/lib/utils/fetchWithOffline'
import { getTransaction, putTransaction } from '@/app/lib/offline-cache/transactions'
import { useOffline } from '@/app/hooks/useOffline'
import { ReceiptDetailSkeleton } from '@/app/components/ui/LoadingSkeleton'
import { getReceiptStatus } from '@slo/shared-utils'
import { useSubscribeTransaction } from '@/app/hooks/useSubscribeTransaction'
import { ConfirmDataButton } from './ConfirmDataButton'

interface TransactionDetailSlideOverProps {
  transactionId: string | null
  onClose: () => void
  onConfirmed?: (updated?: TransactionDetail | null) => void
  /** When true (e.g. Recycle Bin), fetch with includeDeleted so deleted transactions load */
  includeDeleted?: boolean
}

export function TransactionDetailSlideOver({
  transactionId,
  onClose,
  onConfirmed,
  includeDeleted = false,
}: TransactionDetailSlideOverProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const isOffline = useOffline()
  /** Keep current detail so we never set loading during refetch (keep old data on screen) */
  const detailRef = useRef<{ id: string; data: TransactionDetail } | null>(null)
  if (transaction) detailRef.current = { id: transaction.id, data: transaction }
  else if (!transactionId) detailRef.current = null

  const open = !!transactionId
  const isRecycleBin = includeDeleted && !!transaction?.deleted_at
  const isOfflineCachedOnly = isOffline && !!transaction
  const receiptStatus = getReceiptStatus(transaction ?? undefined)

  // Realtime: 一端 Confirm 写 Supabase 后，此端立刻变色
  useSubscribeTransaction(transactionId, (row) => setTransaction(row as unknown as TransactionDetail))

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!transactionId) {
      setTransaction(null)
      setError(null)
      return
    }

    const id = transactionId
    let cancelled = false
    async function run() {
      try {
        setError(null)
        const url = includeDeleted
          ? `/api/transactions/${id}?includeDeleted=true`
          : `/api/transactions/${id}`

        const cached = await getTransaction(id)
        if (!cancelled && cached) {
          setTransaction(cached as unknown as TransactionDetail)
        }
        const hasDataForThisId = detailRef.current?.id === id && detailRef.current?.data
        if (!cancelled && !cached && !hasDataForThisId) setLoading(true)

        const res = await fetchWithOffline(url)
        if ('offline' in res) {
          if (!cancelled) {
            if (!cached) setError('离线模式：此收据详情尚未本地化')
            setLoading(false)
          }
          return
        }

        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!includeDeleted && res.status === 404 && json?.error?.includes('deleted')) {
            if (!cancelled) {
              onClose()
              return
            }
          }
          if (!cancelled) setError(json?.error || `加载失败 (${res.status})`)
          return
        }
        if (!cancelled) {
          if (!includeDeleted && json.transaction?.deleted_at) {
            onClose()
            return
          }
          const tx = json.transaction
          const prev = detailRef.current?.id === id ? detailRef.current?.data : null
          const unchanged = prev && (prev as any).updated_at === (tx as any)?.updated_at
          if (!unchanged) setTransaction(tx)
          if (tx?.id) void putTransaction(tx).catch(() => {})
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '加载失败'
          setError(msg === 'Failed to fetch' ? '暂时无法获取详情，请稍后重试' : msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [transactionId, includeDeleted, onClose])

  const title = useMemo(() => {
    if (!transaction) return 'Receipt detail'
    return transaction.vendor_name ? `Receipt detail — ${transaction.vendor_name}` : 'Receipt detail — Unknown vendor'
  }, [transaction])

  /** Never send tax as 0 for "unknown": only patch tax_details when we have real values. */
  function sanitizePatch(updates: Partial<TransactionDetail>): Partial<TransactionDetail> {
    const out = { ...updates }
    if (out.tax_details != null && typeof out.tax_details === 'object') {
      const td = { ...(out.tax_details as Record<string, unknown>) }
      if (td.gst_amount === 0) delete td.gst_amount
      if (td.gst_cents === 0) delete td.gst_cents
      if (td.pst_amount === 0) delete td.pst_amount
      if (td.pst_cents === 0) delete td.pst_cents
      out.tax_details = Object.keys(td).length > 0 ? (td as TransactionDetail['tax_details']) : undefined
      if (out.tax_details === undefined) delete (out as Record<string, unknown>).tax_details
    }
    return out
  }

  /** Patch only meaningful fields; on failure we do not update state so tax display stays unchanged. */
  async function patch(updates: Partial<TransactionDetail>) {
    if (!transactionId) return
    setSaving(true)
    try {
      const body = sanitizePatch(updates)
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Update failed (${res.status})`)
      }
      setTransaction(json.transaction)
      return json.transaction as TransactionDetail
    } finally {
      setSaving(false)
    }
  }

  async function softDelete() {
    if (!transactionId) return
    setSaving(true)
    try {
      // Simple soft delete - no reason required
      const res = await fetch(`/api/transactions/${transactionId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Delete failed (${res.status})`)
      
      // Close slideover immediately after deletion (eye-out-of-sight)
      onClose()
      
      // Force page reload to ensure deleted item disappears from list
      // This ensures the UI is immediately updated even if Realtime is delayed
      window.location.reload()
      
      return json.transaction as TransactionDetail
    } finally {
      setSaving(false)
    }
  }

  async function restore() {
    if (!transactionId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/restore`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Restore failed (${res.status})`)
      onClose()
      onConfirmed?.(json.transaction || null)
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  async function voidRecord() {
    if (!transactionId) return
    const reason = window.prompt('作废原因（会计师可见）：') || ''
    if (!reason) return
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Void failed (${res.status})`)
      setTransaction(json.transaction)
      return json.transaction as TransactionDetail
    } finally {
      setSaving(false)
    }
  }

  async function replaceImage(file: File) {
    if (!transactionId) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('reason', 'User retook photo')
      const res = await fetch(`/api/transactions/${transactionId}/replace`, { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Replace failed (${res.status})`)
      setTransaction(json.transaction)
      return json.transaction as TransactionDetail
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl border-l border-gray-200 flex flex-col">
        <div className="h-14 px-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold truncate" style={{ color: '#0b1220' }}>{title}</h2>
          <div className="flex items-center gap-2">
            {transaction && receiptStatus === 'READY' && !isRecycleBin && (
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="编辑"
                title="编辑"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {/* Recycle Bin: only Permanent Delete + Close */}
            {isRecycleBin ? (
              <>
                <button
                  type="button"
                  onClick={() => setPermanentDeleteOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                  disabled={saving}
                >
                  永久删除
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                {/* Replace (Layer 2) - hide in recycle bin */}
                <label className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer">
                  重拍
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) replaceImage(f)
                      e.currentTarget.value = ''
                    }}
                    disabled={saving || !transaction || transaction.status === 'exported' || transaction.status === 'locked' || transaction.status === 'voided'}
                  />
                </label>

                {/* Delete / Restore (Layer 1) */}
                {transaction?.deleted_at ? (
                  <button
                    type="button"
                    onClick={() => restore()}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                    disabled={saving}
                  >
                    恢复
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('确定要删除这条记录吗？')) {
                        softDelete()
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                    disabled={saving || !transaction || transaction.status === 'exported' || transaction.status === 'locked'}
                  >
                    删除
                  </button>
                )}

                {/* Void (Layer 3) */}
                {(transaction?.status === 'exported' || transaction?.status === 'locked') && (
                  <button
                    type="button"
                    onClick={() => voidRecord()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
                    disabled={saving}
                  >
                    作废
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {loading && !transaction && (
            <div className="h-full overflow-auto">
              <ReceiptDetailSkeleton />
            </div>
          )}
          {loading && transaction && (
            <div className="absolute top-2 left-4 right-4 rounded-lg bg-gray-100/90 text-gray-600 text-xs py-1.5 text-center z-10">
              刷新中…
            </div>
          )}
          {error && !transaction ? (
            <div
              className={
                error.startsWith('离线模式：')
                  ? 'h-full flex items-center justify-center text-sm text-amber-700'
                  : 'h-full flex items-center justify-center text-sm text-red-600'
              }
            >
              {error}
            </div>
          ) : !transaction ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">No data</div>
          ) : (
            <div className="h-full flex flex-col">
              {isOfflineCachedOnly && (
                <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm mx-4 mt-2">
                  离线模式：显示最近缓存版本（网络恢复后将自动更新）
                </div>
              )}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden min-h-0">
                {/* Left: image (60%) */}
                <div className="lg:col-span-3 p-6 overflow-hidden">
                  <ReceiptImagePanel imageUrl={transaction.attachment_url || null} />
                </div>

                {/* Right: form (40%) */}
                <div className="lg:col-span-2 p-6 border-t lg:border-t-0 lg:border-l border-gray-200 overflow-auto">
                  <TransactionDataForm
                    transaction={transaction}
                    saving={saving}
                    readOnly={isRecycleBin}
                    showStatusSkeleton={loading}
                    onSave={async (updates) => {
                      await patch(updates)
                    }}
                  />
                  {receiptStatus === 'NEEDS_CONFIRM' && !isRecycleBin && (
                    <div className="receipt-detail__footer shrink-0 mt-4 pt-4 border-t border-gray-100">
                      <ConfirmDataButton
                        transactionId={String(transaction.id)}
                        onDone={() => {
                          onClose()
                          onConfirmed?.(undefined)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Recycle Bin footer: 返回回收站 + 还原收据 */}
              {isRecycleBin && (
                <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    ← 返回回收站
                  </button>
                  <button
                    type="button"
                    onClick={() => restore()}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 font-semibold disabled:opacity-60"
                  >
                    🔄 还原收据
                  </button>
                </div>
              )}
            </div>
          )}

          {transactionId && (
            <PermanentDeleteDialog
              open={permanentDeleteOpen}
              onClose={() => setPermanentDeleteOpen(false)}
              transactionId={transactionId}
              vendorName={transaction?.vendor_name}
              onDeleted={() => {
                setPermanentDeleteOpen(false)
                onClose()
                window.location.reload()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

