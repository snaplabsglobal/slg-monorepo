'use client'

import { memo } from 'react'
import { getReceiptStatus, getReceiptStatusUI } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'

export const StatusBadge = memo(function StatusBadge({
  transaction,
  showDescription = false,
}: {
  transaction?: {
    id: string
    status?: string | null
    is_verified?: boolean | null
    [key: string]: unknown
  } | null
  showDescription?: boolean
}) {
  const receiptLike = transaction ? toReceiptLike(transaction) : undefined
  const status = getReceiptStatus(receiptLike)
  if (status === 'UNKNOWN') return null

  const ui = getReceiptStatusUI(status)
  const icon =
    status === 'READY' ? '✓' : status === 'NEEDS_CONFIRM' ? '⚠️' : status === 'FAILED' ? '✕' : status === 'PROCESSING' ? null : '·'

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
        style={{
          backgroundColor: `${ui.color}20`,
          color: ui.color,
          borderColor: `${ui.color}60`,
        }}
      >
        {icon != null && <span aria-hidden>{icon}</span>}
        {ui.label}
      </span>
      {status === 'PROCESSING' && (
        <span
          className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-label="processing"
          style={{ borderColor: ui.color }}
        />
      )}
      {showDescription && <span className="text-xs text-gray-500">{ui.label}</span>}
    </div>
  )
})
