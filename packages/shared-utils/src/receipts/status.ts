/**
 * Receipt status for LS list/detail UI. Used with toReceiptLike(transaction).
 */
export type ReceiptLike = {
  id: string
  is_verified?: boolean | null
  ai_status?: 'processing' | 'failed'
}

export type ReceiptStatus =
  | 'PROCESSING'
  | 'NEEDS_CONFIRM'
  | 'READY'
  | 'FAILED'
  | 'UNKNOWN'

export function getReceiptStatus(tx: ReceiptLike | undefined): ReceiptStatus {
  if (!tx) return 'UNKNOWN'
  if (tx.is_verified === true) return 'READY'
  if (tx.ai_status === 'processing') return 'PROCESSING'
  if (tx.ai_status === 'failed') return 'FAILED'
  return 'NEEDS_CONFIRM'
}

const STATUS_UI: Record<ReceiptStatus, { color: string; label: string }> = {
  PROCESSING: { color: '#2563eb', label: 'AI 深度解析中...' },
  NEEDS_CONFIRM: { color: '#ca8a04', label: '需要您的确认' },
  READY: { color: '#10b981', label: '数据已就绪' },
  FAILED: { color: '#dc2626', label: '识别失败' },
  UNKNOWN: { color: '#6b7280', label: '—' },
}

export function getReceiptStatusUI(status: ReceiptStatus) {
  return STATUS_UI[status] ?? STATUS_UI.UNKNOWN
}
