// packages/shared-utils/src/receipts/status.ts

export type ReceiptLike = {
  id: string
  // DB truth
  is_verified?: boolean | null

  // Optional fields your app may have
  ai_status?: 'processing' | 'draft' | 'failed' | 'done' | null
  user_confirmed_at?: string | null // or confirmed_by_user boolean
  accountant_verified_at?: string | null // if exists
  has_required_fields?: boolean | null // optional precomputed
}

export type ReceiptStatus =
  | 'READY' // green
  | 'NEEDS_CONFIRM' // yellow
  | 'PROCESSING' // gray/blue
  | 'FAILED' // red
  | 'UNKNOWN' // gray

export function getReceiptStatus(receipt?: ReceiptLike | null): ReceiptStatus {
  // 0) data not loaded yet -> UNKNOWN (prevents "瞬黄")
  if (!receipt) return 'UNKNOWN'

  // 1) SINGLE SOURCE OF TRUTH: if is_verified === true -> READY everywhere
  if (receipt.is_verified === true) return 'READY'

  // 2) processing / failed (if you have ai_status)
  if (receipt.ai_status === 'processing') return 'PROCESSING'
  if (receipt.ai_status === 'failed') return 'FAILED'

  // 3) if not verified, treat as needs confirm by default
  //    (You can tighten this based on required fields)
  return 'NEEDS_CONFIRM'
}

export function getReceiptStatusUI(status: ReceiptStatus) {
  // centralize label + color token; UI can map to actual tailwind classes
  switch (status) {
    case 'READY':
      return { label: '数据就绪', color: '#10b981' } // finance green
    case 'NEEDS_CONFIRM':
      return { label: '需要确认', color: '#f59e0b' }
    case 'PROCESSING':
      return { label: '识别中', color: '#64748b' }
    case 'FAILED':
      return { label: '识别失败', color: '#ef4444' }
    default:
      return { label: '加载中', color: '#94a3b8' }
  }
}
