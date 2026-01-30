// components/transactions/MobileBottomSheet.tsx
// 移动端底部抽屉组件

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { TransactionDataForm, type TransactionDataFormHandle, type TransactionDetail } from './TransactionDataForm'
import { PermanentDeleteDialog } from './PermanentDeleteDialog'

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
  const [sheetHeight, setSheetHeight] = useState('70%')
  const [fullscreenImage, setFullscreenImage] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const formRef = useRef<TransactionDataFormHandle>(null)

  const isRecycleBin = includeDeleted && !!transaction?.deleted_at

  useEffect(() => {
    if (!transactionId || !isOpen) {
      setTransaction(null)
      setError(null)
      return
    }

    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const url = includeDeleted
          ? `/api/transactions/${transactionId}?includeDeleted=true`
          : `/api/transactions/${transactionId}`
        const res = await fetch(url)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!includeDeleted && res.status === 404 && json?.error?.includes('deleted')) {
            if (!cancelled) {
              onClose()
              return
            }
          }
          throw new Error(json?.error || `Failed to load transaction (${res.status})`)
        }
        if (!cancelled) {
          if (!includeDeleted && json.transaction?.deleted_at) {
            onClose()
            return
          }
          setTransaction(json.transaction)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load transaction')
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

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white rounded-t-3xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ height: sheetHeight, maxHeight: '90vh' }}
      >
        {/* 顶部拖拽条 */}
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />
          
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
        
        {/* 可滚动内容 */}
        <div className="overflow-y-auto h-full pb-24 px-6" style={{ maxHeight: `calc(${sheetHeight} - 80px)` }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {transaction && (
            <>
              {/* 顶部：收据预览图（点击可放大）— COO 移动端布局 */}
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

              {/* 中部：AI 核心数据 + 小 Edit 图标；底部单一确认 — CEO/COO 瘦身 */}
              <TransactionDataForm
                ref={formRef}
                transaction={transaction}
                onSave={handleSave}
                onConfirm={handleConfirm}
                saving={loading}
                compactForMobile
              />
            </>
          )}
        </div>
        
        {/* 底部固定按钮 */}
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
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
              >
                确认
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
