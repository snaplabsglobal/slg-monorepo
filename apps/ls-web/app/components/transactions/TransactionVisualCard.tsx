// components/transactions/TransactionVisualCard.tsx
// Visual Card View - 卡片模式（UX：弱化 GST、状态圆点、层级清晰）

'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Transaction } from './TransactionList'
import { getReceiptStatus, getReceiptStatusUI, getTransactionTaxAndConfidence } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'
import { formatDateOnly } from '@/app/lib/utils/format'

export interface TransactionVisualCardProps {
  transaction: Transaction
  onClick: () => void
  priority?: boolean
}

// Clock icon SVG
const ClockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// Building icon SVG
const BuildingIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

function formatAmount(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** 状态小圆点：绿=已就绪，黄=待确认，灰=解析中，红=失败（不遮挡缩略图） */
function StatusDot({ status }: { status: ReturnType<typeof getReceiptStatus> }) {
  const ui = getReceiptStatusUI(status)
  return (
    <span
      className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
      style={{ backgroundColor: ui.color }}
      title={ui.label}
      aria-hidden
    />
  )
}

export function TransactionVisualCard({ transaction, onClick, priority }: TransactionVisualCardProps) {
  const [imageError, setImageError] = useState(false)
  const receiptStatus = getReceiptStatus(toReceiptLike(transaction as any))
  const { gst } = getTransactionTaxAndConfidence(transaction as any)
  const showGst = gst != null && gst > 0

  const projectName =
    (transaction as any).project_name || (transaction as any).raw_data?.project?.name || null

  const isRefund =
    Boolean((transaction as any).raw_data?.is_refund) ||
    (transaction.direction === 'expense' && (transaction.total_amount ?? 0) < 0)
  const isIncome = transaction.direction === 'income'
  const amount = Math.abs(transaction.total_amount || 0)
  const totalColorClass = isIncome ? 'text-green-700' : isRefund ? 'text-emerald-700' : 'text-gray-900'
  const sign = isIncome ? '+' : isRefund ? '−' : ''

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
    >
      <div className="flex">
        {/* 左侧：收据缩略图，无文字遮挡；仅右上角状态小圆点 */}
        <div className="w-1/3 relative bg-gray-100 min-h-[120px] shrink-0">
          {(transaction as any).attachment_url && !imageError ? (
            <Image
              src={(transaction as any).attachment_url}
              alt="Receipt"
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-4xl">📄</span>
            </div>
          )}
          <StatusDot status={receiptStatus} />
        </div>

        {/* 右侧：Vendor（加粗）→ Date（灰）→ Total（大字）→ GST 灰色小字；hover 显示可抵扣 */}
        <div className="flex-1 p-4 flex flex-col justify-between min-h-[120px] min-w-0">
          <div>
            <h3 className="font-bold text-gray-900 line-clamp-1 text-lg">
              {transaction.vendor_name || 'Unknown Vendor'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
              <div className="flex items-center gap-1">
                <ClockIcon />
                <span>{formatDateOnly(transaction.transaction_date)}</span>
              </div>
              {projectName && (
                <div className="flex items-center gap-1">
                  <BuildingIcon />
                  <span className="line-clamp-1">{projectName}</span>
                </div>
              )}
            </div>
            {isRefund && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                Refund
              </span>
            )}
          </div>

          {/* Total 为主视觉；GST 弱化为灰色小字 */}
          <div className="mt-3">
            <p className={`text-xl font-bold ${totalColorClass}`}>
              {sign}{formatAmount(amount, transaction.currency)}
            </p>
            {showGst && (
              <p className="text-xs text-gray-500 mt-0.5">
                (Incl. GST {formatAmount(gst, transaction.currency)}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">可抵扣</span>)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
