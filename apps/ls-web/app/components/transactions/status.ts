export type AsyncReceiptStatus = 'pending' | 'needs_review' | 'approved' | 'error' | 'warning'

export const STATUS_CONFIG: Record<
  AsyncReceiptStatus,
  {
    bg: string
    text: string
    border: string
    icon: string
    label: string
    description: string
    canExport: boolean
  }
> = {
  pending: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    icon: '⚙️',
    label: 'AI 深度解析中...',
    description: '正在识别收据信息',
    canExport: false,
  },
  needs_review: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    icon: '⚠️',
    label: '需要您的确认',
    description: '请检查供应商名称和金额',
    canExport: false,
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    icon: '⚠️',
    label: '疑似重复',
    description: '发现可能重复的单据，请确认',
    canExport: false,
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    icon: '✓',
    label: '数据已就绪',
    description: 'Tax Ready - 可以导出',
    canExport: true,
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: '✕',
    label: '识别失败',
    description: '请重新上传或手动输入',
    canExport: false,
  },
}

export function deriveAsyncStatus(t: {
  status?: string | null
  needs_review?: boolean | null
  vendor_name?: string | null
  ai_confidence?: number | null
  raw_data?: any
  is_suspected_duplicate?: boolean | null
}): AsyncReceiptStatus {
  // Hard error
  if (t.status === 'error') return 'error'
  if (t.status === 'rejected') return 'error'

  // Warning: suspected duplicate (yellow card)
  if (t.status === 'warning' || t.is_suspected_duplicate) return 'warning'

  // Processing heuristic: pending + placeholder vendor or zero confidence
  const vendor = (t.vendor_name || '').toLowerCase()
  const looksProcessing =
    t.status === 'pending' &&
    (vendor === 'analyzing...' || vendor === 'processing...' || (t.ai_confidence ?? 0) === 0)

  if (looksProcessing) return 'pending'

  // Needs review: explicit flag or special status
  if (t.status === 'needs_review' || t.needs_review) return 'needs_review'

  // Approved: green
  if (t.status === 'approved') return 'approved'

  // Default: treat pending as needs_review (user action)
  if (t.status === 'pending') return 'needs_review'

  return 'needs_review'
}

