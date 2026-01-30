import type { ReceiptQueueItem } from './types'
import { putBlob, putItem } from './store'
import { startQueueTriggers } from './triggers'

function uuid(): string {
  return crypto.randomUUID()
}

export async function enqueueReceipt(params: {
  file: File
  projectId?: string
}): Promise<ReceiptQueueItem> {
  const id = uuid()
  const clientId = `client-${id}`
  const item: ReceiptQueueItem = {
    id,
    clientId,
    projectId: params.projectId,
    fileName: params.file.name || `receipt-${id}.jpg`,
    mimeType: params.file.type || 'image/jpeg',
    size: params.file.size,
    transactionId: undefined,
    status: 'queued',
    message: undefined,
    retryCount: 0,
    nextAttemptAt: Date.now(),
    analyzeRetryCount: 0,
    analyzeNextAttemptAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await putBlob(id, params.file)
  await putItem(item)
  startQueueTriggers()
  return item
}

export { startQueueTriggers, stopQueueTriggers } from './triggers'
export { runQueueOnce } from './worker'
export { listItems } from './store'
export type { ReceiptQueueItem, QueueStatus } from './types'
