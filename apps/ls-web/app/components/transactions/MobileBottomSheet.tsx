// components/transactions/MobileBottomSheet.tsx
// 移动端收据详情：全屏模态，财稅綠主按钮，Deep Navy 标题

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { TransactionDataForm, type TransactionDataFormHandle, type TransactionDetail } from './TransactionDataForm'
import { PermanentDeleteDialog } from './PermanentDeleteDialog'
import { fetchWithOffline } from '@/app/lib/utils/fetchWithOffline'
import { getTransaction, putTransaction } from '@/app/lib/offline-cache/transactions'
import { useOffline } from '@/app/hooks/useOffline'
import { ReceiptDetailSkeleton } from '@/app/components/ui/LoadingSkeleton'
import { getReceiptStatus } from '@slo/shared-utils'
import { useSubscribeTransaction } from '@/app/hooks/useSubscribeTransaction'
import { ConfirmDataButton } from './ConfirmDataButton'

const DEEP_NAVY = '#0b1220'
const FINANCIAL_GREEN = '#10b981'

// X icon SVG
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface MobileBottomSheetProps {
  transactionId: string | null
  isOpen: boolean
  onClose: () => void
  onConfirmed?: (updated?: TransactionDetail | null) => void
  includeDeleted?: boolean
}

export function MobileBottomSheet({
  transactionId,
  isOpen,
  onClose,
  onConfirmed,
  includeDeleted = false,
}: MobileBottomSheetProps) {
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const [addressExpanded, setAddressExpanded] = useState(false)
  const formRef = useRef<TransactionDataFormHandle>(null)
  const isOffline = useOffline()
  /** Keep current detail so we never set loading during refetch (keep old data on screen) */
  const detailRef = useRef<{ id: string; data: TransactionDetail } | null>(null)
  if (transaction) detailRef.current = { id: transaction.id, data: transaction }
  else if (!transactionId || !isOpen) detailRef.current = null

  const isRecycleBin = includeDeleted && !!transaction?.deleted_at
  const isOfflineCachedOnly = isOffline && !!transaction
  const receiptStatus = getReceiptStatus(transaction ?? undefined)

  // Realtime: 一端 Confirm 写 Supabase 后，此端立刻变色
  useSubscribeTransaction(
    transactionId && isOpen ? transactionId : null,
    (row) => setTransaction(row as unknown as TransactionDetail)
  )

  useEffect(() => {
    if (transactionId != null && isOpen) setAddressExpanded(false)
  }, [transactionId, isOpen])

  useEffect(() => {
    if (!transactionId || !isOpen) {
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
  }, [transactionId, isOpen, onClose, includeDeleted])

  /** Never send tax as 0; on failure do not update state so tax display stays unchanged. */
  const sanitizePatch = (u: Partial<TransactionDetail>): Partial<TransactionDetail> => {
    const out = { ...u }
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

  const handleSave = async (updates: Partial<TransactionDetail>) => {
    if (!transaction?.id) return
    try {
      const body = sanitizePatch(updates)
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Update failed (${res.status})`)
      if (json.transaction) setTransaction(json.transaction)
    } catch (e) {
      console.error('Failed to save transaction:', e)
      // Do not update state on failure so tax display stays unchanged
    }
  }

  const handleRestore = async () => {
    if (!transaction?.id) return
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/restore`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        onClose()
        onConfirmed?.(json.transaction || null)
        window.location.reload()
      } else {
        alert(json?.error || '还原失败')
      }
    } catch (e) {
      alert('还原失败，请重试')
    }
  }

  if (!isOpen) return null

  const rawData = transaction?.raw_data as Record<string, unknown> | undefined
  const vendorAddress =
    typeof rawData?.vendor_address === 'string'
      ? rawData.vendor_address
      : typeof rawData?.address === 'string'
        ? rawData.address
        : typeof rawData?.store_address === 'string'
          ? rawData.store_address
          : null
  const gstNumber =
    typeof rawData?.gst_number === 'string'
      ? rawData.gst_number
      : typeof rawData?.gst_hst_number === 'string'
        ? rawData.gst_hst_number
        : null

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Full-screen modal — 100% height immediately */}
      <div
        className={`
          fixed inset-0 z-50
          bg-white
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Header: Deep Navy title; READY → Edit icon (placeholder) */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold truncate pr-2" style={{ color: DEEP_NAVY }}>
            {transaction?.vendor_name || '收据详情'}
          </h2>
          <div className="flex items-center gap-1">
            {transaction && receiptStatus === 'READY' && (
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                aria-label="编辑"
                title="编辑"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="关闭"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Scrollable content — primary button at end of form, no fixed bottom */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8 relative">
          {loading && !transaction && <ReceiptDetailSkeleton />}
          {loading && transaction && (
            <div className="absolute top-2 left-6 right-6 rounded-lg bg-gray-100/90 text-gray-600 text-xs py-1.5 text-center">
              刷新中…
            </div>
          )}

          {error && (
            <div
              className={
                error.startsWith('离线模式：')
                  ? 'bg-amber-50 border border-amber-200 rounded-lg p-4 my-4'
                  : 'bg-red-50 border border-red-200 rounded-lg p-4 my-4'
              }
            >
              <p
                className={
                  error.startsWith('离线模式：')
                    ? 'text-amber-800 text-sm'
                    : 'text-red-800 text-sm'
                }
              >
                {error}
              </p>
            </div>
          )}

          {isOfflineCachedOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm my-2">
              离线模式：显示最近缓存版本（网络恢复后将自动更新）
            </div>
          )}

          {transaction && (
            <>
              {transaction.attachment_url && (
                <button
                  type="button"
                  className="w-full mb-4 rounded-xl overflow-hidden bg-gray-100 block text-left"
                  onClick={() => setFullscreenImage(true)}
                >
                  <div className="relative h-56">
                    <Image
                      src={transaction.attachment_url}
                      alt="Receipt"
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                  </div>
                  <span className="block py-2 text-center text-sm text-gray-500">点击放大</span>
                </button>
              )}

              {/* 供应商地址（CRA 合规）：智能折叠 */}
              {(vendorAddress || gstNumber) && (
                <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold mb-1" style={{ color: DEEP_NAVY }}>供应商信息（备审计）</p>
                  {vendorAddress && (
                    <button
                      type="button"
                      onClick={() => setAddressExpanded((e) => !e)}
                      className="text-left w-full text-sm text-gray-700"
                    >
                      {addressExpanded ? (
                        vendorAddress
                      ) : (
                        <span className="line-clamp-1">{vendorAddress}</span>
                      )}
                      <span className="ml-1 text-gray-400 text-xs">{addressExpanded ? '收起' : '展开'}</span>
                    </button>
                  )}
                  {gstNumber && (
                    <p className="text-xs text-gray-600 mt-1">GST/HST # {gstNumber}</p>
                  )}
                </div>
              )}

              <TransactionDataForm
                ref={formRef}
                transaction={transaction}
                onSave={handleSave}
                saving={loading}
                compactForMobile
                showStatusSkeleton={loading}
              />

              {/* Primary actions: Recycle Bin only; confirm 確認數據 is in receipt-detail__footer */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                {isRecycleBin && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                      ← 返回回收站
                    </button>
                    <button
                      type="button"
                      onClick={handleRestore}
                      className="flex-1 px-4 py-3.5 text-white rounded-xl font-bold transition-colors hover:opacity-95"
                      style={{ backgroundColor: FINANCIAL_GREEN }}
                    >
                      🔄 还原收据
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* receipt-detail__footer: 唯一底部容器，僅「確認數據」按鈕 #10b981 */}
        {transaction && receiptStatus === 'NEEDS_CONFIRM' && !isRecycleBin && (
          <div className="receipt-detail__footer shrink-0 p-4 border-t bg-[#0b1220]">
            <ConfirmDataButton transactionId={String(transaction.id)} onDone={onClose} />
          </div>
        )}

        {transaction?.id && (
          <PermanentDeleteDialog
            open={permanentDeleteOpen}
            onClose={() => setPermanentDeleteOpen(false)}
            transactionId={transaction.id}
            vendorName={transaction.vendor_name}
            onDeleted={() => {
              setPermanentDeleteOpen(false)
              onClose()
              window.location.reload()
            }}
          />
        )}
      </div>
      
      {/* 全屏照片查看 */}
      {fullscreenImage && transaction?.attachment_url && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setFullscreenImage(false)}
        >
          <div className="relative w-full h-full">
            <Image
              src={transaction.attachment_url}
              alt="Receipt"
              fill
              className="object-contain"
              sizes="100vw"
            />
            <button
              onClick={() => setFullscreenImage(false)}
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
