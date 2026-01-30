// components/transactions/MobileBottomSheet.tsx
// 移动端底部抽屉：两段式拉伸 (60% 快速浏览 / 95% 全屏编辑)

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { TransactionDataForm, type TransactionDataFormHandle, type TransactionDetail } from './TransactionDataForm'
import { PermanentDeleteDialog } from './PermanentDeleteDialog'
import { fetchWithOffline } from '@/app/lib/utils/fetchWithOffline'
import { getTransaction, putTransaction } from '@/app/lib/offline-cache/transactions'
import { useOffline } from '@/app/hooks/useOffline'

const SNAP_QUICK = '60%'   // 默认：缩略图 + 核心数据
const SNAP_FULL = '95vh'   // 全屏：编辑 / 地址等详情

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
  const [sheetHeight, setSheetHeight] = useState(SNAP_QUICK)
  const [fullscreenImage, setFullscreenImage] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const [addressExpanded, setAddressExpanded] = useState(false)
  const formRef = useRef<TransactionDataFormHandle>(null)
  const isOffline = useOffline()

  const isRecycleBin = includeDeleted && !!transaction?.deleted_at
  const isOfflineCachedOnly = isOffline && !!transaction
  const isFullHeight = sheetHeight === SNAP_FULL

  /** 点开时默认 60%；切换交易时重置 */
  useEffect(() => {
    if (transactionId != null && isOpen) {
      setSheetHeight(SNAP_QUICK)
      setAddressExpanded(false)
    }
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
        setLoading(true)
        setError(null)
        const url = includeDeleted
          ? `/api/transactions/${id}?includeDeleted=true`
          : `/api/transactions/${id}`

        const cached = await getTransaction(id)
        if (!cancelled && cached) {
          setTransaction(cached as unknown as TransactionDetail)
        }

        const res = await fetchWithOffline(url)
        if (res.offline) {
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
          setTransaction(tx)
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

  const handleConfirm = async () => {
    if (!transaction) return
    if (isRecycleBin) return // Restore is handled by footer button

    // Update status to approved if pending/needs_review
    if (transaction.status === 'pending' || transaction.status === 'needs_review' || transaction.needs_review) {
      try {
        const res = await fetch(`/api/transactions/${transaction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved', needs_review: false }),
        })
        const json = await res.json()
        if (res.ok) {
          setTransaction(json.transaction)
          onConfirmed?.(json.transaction)
        }
      } catch (e) {
        console.error('Failed to confirm transaction:', e)
      }
    } else {
      onConfirmed?.(transaction)
    }

    setTimeout(() => onClose(), 300)
  }

  const handleSave = async (updates: Partial<TransactionDetail>) => {
    if (!transaction?.id) return
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (res.ok && json.transaction) {
        setTransaction(json.transaction)
      }
    } catch (e) {
      console.error('Failed to save transaction:', e)
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

  const toggleSnap = () => {
    setSheetHeight((h) => (h === SNAP_FULL ? SNAP_QUICK : SNAP_FULL))
  }
  const handleRequestExpand = () => setSheetHeight(SNAP_FULL)
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
      
      {/* Bottom Sheet — 两段式 60% / 95% */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white rounded-t-3xl
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ height: sheetHeight, maxHeight: '100vh' }}
      >
        {/* 顶部拖拽条：点击切换高度 */}
        <div className="flex-shrink-0 bg-white rounded-t-3xl z-10 pb-2">
          <button
            type="button"
            onClick={toggleSnap}
            className="w-full pt-3 pb-2 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
            aria-label={isFullHeight ? '收起' : '上滑展开'}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            <span className="text-xs text-gray-400">{isFullHeight ? '下滑收起' : '上滑展开'}</span>
          </button>
          <div className="flex items-center justify-between px-6 pb-2">
            <h2 className="text-lg font-bold text-gray-900">收据详情</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <XIcon />
            </button>
          </div>
        </div>
        
        {/* 可滚动内容；pb-28 避免被底部按钮遮挡 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-28">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
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
              离线显示缓存版本
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
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">供应商信息（备审计）</p>
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
                onConfirm={handleConfirm}
                saving={loading}
                compactForMobile
                onStartEdit={handleRequestExpand}
              />
            </>
          )}
        </div>
        
        {/* 底部固定按钮；有待处理项时显示红色角标 */}
        {transaction && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
            {isRecycleBin ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  ← 返回回收站
                </button>
                <button
                  type="button"
                  onClick={handleRestore}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
                >
                  🔄 还原收据
                </button>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                className="relative w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
              >
                确认
                {(transaction.needs_review || transaction.status === 'error' || (transaction as any).is_suspected_duplicate) && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white ring-2 ring-white">
                    1
                  </span>
                )}
              </button>
            )}
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
