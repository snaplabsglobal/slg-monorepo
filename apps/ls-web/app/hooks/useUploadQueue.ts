'use client'

import { useEffect, useState } from 'react'
import type { ReceiptQueueItem } from '@/app/lib/upload-queue/types'
import { listItems } from '@/app/lib/upload-queue/store'
import { startQueueTriggers } from '@/app/lib/upload-queue/triggers'

export function useUploadQueue(pollMs = 1200): {
  items: ReceiptQueueItem[]
  queued: number
  uploading: number
  analyzing: number
  retryable: number
} {
  const [items, setItems] = useState<ReceiptQueueItem[]>([])

  useEffect(() => {
    startQueueTriggers()
    let alive = true
    const tick = async () => {
      const all = await listItems()
      if (!alive) return
      setItems(all.sort((a, b) => b.createdAt - a.createdAt))
    }
    void tick()
    const id = window.setInterval(() => void tick(), pollMs)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [pollMs])

  const queued = items.filter((i) => i.status === 'queued').length
  const uploading = items.filter((i) => i.status === 'uploading').length
  const analyzing = items.filter((i) => i.status === 'analyzing').length
  const retryable = items.filter((i) => i.status === 'failed_retryable').length

  return { items, queued, uploading, analyzing, retryable }
}
