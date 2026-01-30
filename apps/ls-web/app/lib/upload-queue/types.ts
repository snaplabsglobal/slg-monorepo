export type QueueStatus =
  | 'queued'
  | 'uploading'
  | 'received'
  | 'analyzing'
  | 'failed_retryable'
  | 'failed_fatal'
  | 'skipped_duplicate'
  | 'done'

export type ReceiptQueueItem = {
  id: string
  clientId: string
  projectId?: string
  fileName: string
  mimeType: string
  size: number
  transactionId?: string
  status: QueueStatus
  message?: string
  retryCount: number
  nextAttemptAt: number
  analyzeRetryCount: number
  analyzeNextAttemptAt: number
  createdAt: number
  updatedAt: number
}
