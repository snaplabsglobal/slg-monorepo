import { listItems, putItem, getBlob, deleteItem, deleteBlob } from './store'
import type { ReceiptQueueItem } from './types'

let isRunning = false
const now = () => Date.now()

function uploadBackoffMs(retryCount: number): number {
  return Math.min(30_000 * Math.pow(2, retryCount), 10 * 60_000)
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function runQuickUpload(
  item: ReceiptQueueItem
): Promise<
  | { kind: 'skipped_duplicate'; message: string }
  | { kind: 'success'; transactionId: string; idempotentDuplicate: boolean }
> {
  const blob = await getBlob(item.id)
  if (!blob) throw new Error('Missing local blob')
  const file = new File([blob], item.fileName, { type: item.mimeType })
  const formData = new FormData()
  formData.append('file', file)
  formData.append('client_id', item.clientId)
  if (item.projectId) formData.append('projectId', item.projectId)
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30_000)
  const response = await fetch('/api/receipts/quick-upload', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
    credentials: 'same-origin',
  }).finally(() => clearTimeout(t))
  const json = await response.json().catch(() => ({} as Record<string, unknown>))
  if (response.status === 409 && json?.error === 'DUPLICATE_IMAGE') {
    return {
      kind: 'skipped_duplicate',
      message: (json?.message as string) || '这张收据已经上传过了',
    }
  }
  if (!response.ok || !json?.success || !(json?.transaction as { id?: string })?.id) {
    throw new Error(
      (json?.message as string) || (json?.error as string) || `Upload failed ${response.status}`
    )
  }
  const transactionId = String((json.transaction as { id: string }).id)
  return {
    kind: 'success',
    transactionId,
    idempotentDuplicate: !!(json.duplicate as boolean),
  }
}

/** CTO#1: Register transaction for async analysis (cron will call analyze). */
async function registerPendingAnalysis(transactionId: string): Promise<void> {
  const res = await fetch(`/api/receipts/${transactionId}/pending-analysis`, {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!res.ok) {
    throw new Error(`pending-analysis failed: ${res.status}`)
  }
}

export async function runQueueOnce(): Promise<void> {
  if (isRunning) return
  if (!isOnline()) return
  isRunning = true
  try {
    const items = await listItems()
    const candidate = items
      .filter((i) => i.status !== 'done' && i.status !== 'failed_fatal')
      .filter((i) => i.nextAttemptAt <= now())
      .sort((a, b) => a.createdAt - b.createdAt)[0]
    if (!candidate) return

    // Already uploaded (e.g. from previous run): register for cron and remove from queue
    if (candidate.transactionId) {
      try {
        await registerPendingAnalysis(candidate.transactionId)
      } catch {
        // retry next time
        await putItem({
          ...candidate,
          nextAttemptAt: now() + 60_000,
          updatedAt: now(),
        })
        return
      }
      await deleteItem(candidate.id)
      return
    }

    await putItem({ ...candidate, status: 'uploading', updatedAt: now() })
    try {
      const result = await runQuickUpload(candidate)
      if (result.kind === 'skipped_duplicate') {
        await putItem({
          ...candidate,
          status: 'skipped_duplicate',
          message: result.message,
          updatedAt: now(),
        })
        await deleteItem(candidate.id)
        return
      }
      const next: ReceiptQueueItem = {
        ...candidate,
        status: 'received',
        transactionId: result.transactionId,
        message: result.idempotentDuplicate ? '幂等重复：使用已存在交易' : '已收到，后台识别',
        updatedAt: now(),
        analyzeRetryCount: 0,
        analyzeNextAttemptAt: now(),
        nextAttemptAt: now(),
      }
      await deleteBlob(candidate.id)
      await putItem(next)
      try {
        await registerPendingAnalysis(result.transactionId)
      } catch {
        // keep item in queue so we retry registering
        await putItem({
          ...next,
          nextAttemptAt: now() + 60_000,
          updatedAt: now(),
        })
        return
      }
      await deleteItem(candidate.id)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      const retryCount = candidate.retryCount + 1
      const nextAttemptAt = now() + uploadBackoffMs(candidate.retryCount)
      const msg =
        e?.name === 'AbortError'
          ? '上传超时，稍后自动重试'
          : (e?.message || '上传失败，稍后重试')
      const fatal = typeof msg === 'string' && (msg.includes('401') || msg.includes('403'))
      await putItem({
        ...candidate,
        status: fatal ? 'failed_fatal' : 'failed_retryable',
        message: msg,
        retryCount,
        nextAttemptAt,
        updatedAt: now(),
      })
    }
  } finally {
    isRunning = false
  }
}
