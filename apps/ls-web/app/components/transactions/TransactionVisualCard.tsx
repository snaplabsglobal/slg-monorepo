// components/transactions/TransactionVisualCard.tsx
// Visual Card View - 卡片模式（替代大长条列表）

'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Transaction } from './TransactionList'
import { StatusBadge } from './StatusBadge'
import { deriveAsyncStatus } from './status'

export interface TransactionVisualCardProps {
  transaction: Transaction
  onClick: () => void
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

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAmount(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function TransactionVisualCard({ transaction, onClick, priority }: TransactionVisualCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Get tax details
  const taxDetails = (transaction as any).tax_details || {}
  const gstAmount = typeof taxDetails.gst_amount === 'number' 
    ? taxDetails.gst_amount 
    : (Number(taxDetails.gst_cents || 0) / 100)
  
  // Get project name from raw_data or project_id
  const projectName = (transaction as any).project_name || 
    (transaction as any).raw_data?.project?.name || 
    null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
    >
      <div className="flex">
        {/* 左侧：收据缩略图（1/3）*/}
        <div className="w-1/3 relative bg-gray-100 min-h-[120px]">
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
          
          {/* 状态角标 */}
          <div className="absolute top-2 left-2">
            <StatusBadge 
              transaction={transaction as any} 
            />
          </div>
        </div>
        
        {/* 右侧：信息（2/3）*/}
        <div className="flex-1 p-4 flex flex-col justify-between min-h-[120px]">
          {/* 顶部：供应商 + Refund 角标 + 日期 */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                {transaction.vendor_name || 'Unknown Vendor'}
              </h3>
              {((): boolean => {
                const raw = (transaction as any).raw_data
                return Boolean(raw?.is_refund) || (transaction.direction === 'expense' && (transaction.total_amount ?? 0) < 0)
              })() && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Refund
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              {/* 日期 */}
              <div className="flex items-center gap-1">
                <ClockIcon />
                <span>{formatDate(transaction.transaction_date)}</span>
              </div>
              
              {/* 项目 */}
              {projectName && (
                <div className="flex items-center gap-1">
                  <BuildingIcon />
                  <span className="line-clamp-1">{projectName}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 底部：金额 + GST（Refund = 绿色负号） */}
          <div className="flex items-end justify-between mt-3">
            {/* 总额 */}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              {(() => {
                const isRefund = Boolean((transaction as any).raw_data?.is_refund) || (transaction.direction === 'expense' && (transaction.total_amount ?? 0) < 0)
                const isIncome = transaction.direction === 'income'
                const amount = Math.abs(transaction.total_amount || 0)
                const colorClass = isIncome ? 'text-green-700' : isRefund ? 'text-emerald-700' : 'text-gray-900'
                const sign = isIncome ? '+' : isRefund ? '−' : ''
                return (
                  <p className={`text-2xl font-bold ${colorClass}`}>
                    {sign}{formatAmount(amount, transaction.currency)}
                  </p>
                )
              })()}
            </div>
            
            {/* GST（加拿大特色 - 高亮）⭐ */}
            {gstAmount > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-3 py-2 rounded-lg border border-green-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-green-700 font-medium">GST</span>
                  <span className="text-base font-bold text-green-700">
                    {formatAmount(gstAmount, transaction.currency)}
                  </span>
                </div>
                <p className="text-xs text-green-600">可抵扣</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
