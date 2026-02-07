/**
 * SnapEvidence Upload Queue
 * Manages background photo uploads with state machine, retry logic, and concurrency control
 *
 * State machine: pending → uploading → uploaded | failed
 * Failed items can be retried: failed → pending → uploading → ...
 */

import type { PhotoItem, PhotoStatus } from './types'
import { UPLOAD_CONFIG, VALID_TRANSITIONS } from './types'
import {
  getPhotosByStatus,
  getPhotoItem,
  getPhotoBlob,
  updatePhotoStatus,
} from './local-store'

type UploadProgressCallback = (item: PhotoItem, progress: number) => void
type UploadCompleteCallback = (item: PhotoItem, success: boolean) => void

class UploadQueue {
  private running: Set<string> = new Set()
  private paused = false
  private onProgress?: UploadProgressCallback
  private onComplete?: UploadCompleteCallback
  private watermarkWorker?: Worker

  /**
   * Set callbacks for upload progress and completion
   */
  setCallbacks(
    onProgress?: UploadProgressCallback,
    onComplete?: UploadCompleteCallback
  ) {
    this.onProgress = onProgress
    this.onComplete = onComplete
  }

  /**
   * Initialize watermark worker
   */
  initWatermarkWorker() {
    if (typeof Worker !== 'undefined' && !this.watermarkWorker) {
      try {
        this.watermarkWorker = new Worker(
          new URL('./watermark.worker.ts', import.meta.url)
        )
      } catch (e) {
        console.warn('Could not create watermark worker:', e)
      }
    }
  }

  /**
   * Validate state transition
   */
  private canTransition(from: PhotoStatus, to: PhotoStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false
  }

  /**
   * Process the upload queue
   * Called by SyncOrchestrator on various triggers
   */
  async processQueue(): Promise<void> {
    if (this.paused) return

    // Get pending items
    const pending = await getPhotosByStatus('pending', 10)

    for (const item of pending) {
      // Concurrency control
      if (this.running.size >= UPLOAD_CONFIG.maxConcurrent) {
        break
      }

      // Skip if already running
      if (this.running.has(item.id)) {
        continue
      }

      this.running.add(item.id)

      // Start upload in background
      this.uploadOne(item)
        .finally(() => {
          this.running.delete(item.id)
          // Continue processing queue
          if (!this.paused) {
            this.processQueue()
          }
        })
    }
  }

  /**
   * Upload a single photo
   */
  private async uploadOne(item: PhotoItem): Promise<void> {
    try {
      // 1. Transition to uploading
      if (!this.canTransition(item.status, 'uploading')) {
        console.warn(`Invalid transition: ${item.status} → uploading`)
        return
      }

      await updatePhotoStatus(item.id, 'uploading')
      this.onProgress?.(item, 0)

      // 2. Get blob and prepare (add watermark if needed)
      const blob = await this.prepareBlob(item)
      if (!blob) {
        throw new Error('Photo blob not found')
      }

      this.onProgress?.(item, 20)

      // 3. Upload to server
      const response = await this.uploadToServer(blob, item)

      this.onProgress?.(item, 90)

      // 4. Success - update status
      await updatePhotoStatus(item.id, 'uploaded', {
        uploaded_at: new Date().toISOString(),
        server_file_id: response.file_id,
      })

      this.onProgress?.(item, 100)
      this.onComplete?.(item, true)

    } catch (error) {
      // 5. Failure - handle retry
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Upload failed for ${item.id}:`, errorMessage)

      item.attempts = (item.attempts || 0) + 1

      if (item.attempts >= UPLOAD_CONFIG.maxRetries) {
        // Max retries reached - mark as failed
        await updatePhotoStatus(item.id, 'failed', {
          attempts: item.attempts,
          last_error: errorMessage,
        })
      } else {
        // Reset to pending for retry
        await updatePhotoStatus(item.id, 'pending', {
          attempts: item.attempts,
          last_error: errorMessage,
        })

        // Schedule retry with exponential backoff
        const delay = UPLOAD_CONFIG.retryDelays[item.attempts - 1] || 30000
        setTimeout(() => this.processQueue(), delay)
      }

      this.onComplete?.(item, false)
    }
  }

  /**
   * Prepare blob for upload (add watermark if needed)
   */
  private async prepareBlob(item: PhotoItem): Promise<Blob | null> {
    const blobRecord = await getPhotoBlob(item.id)
    if (!blobRecord) return null

    const originalBlob = blobRecord.blob

    // Add watermark if not already done
    if (!item.watermark_version) {
      try {
        const watermarkedBlob = await this.addWatermark(originalBlob, item)
        await updatePhotoStatus(item.id, item.status, {
          watermark_version: 'v1',
        })
        return watermarkedBlob
      } catch (e) {
        console.warn('Watermark failed, using original:', e)
        return originalBlob
      }
    }

    return originalBlob
  }

  /**
   * Add watermark to image
   */
  private async addWatermark(blob: Blob, item: PhotoItem): Promise<Blob> {
    // Try worker first
    if (this.watermarkWorker) {
      return this.addWatermarkViaWorker(blob, item)
    }

    // Fallback to main thread
    return this.addWatermarkMainThread(blob, item)
  }

  /**
   * Add watermark via Web Worker
   */
  private addWatermarkViaWorker(blob: Blob, item: PhotoItem): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.watermarkWorker) {
        reject(new Error('No watermark worker'))
        return
      }

      const handler = (e: MessageEvent) => {
        if (e.data.id === item.id) {
          this.watermarkWorker?.removeEventListener('message', handler)
          if (e.data.error) {
            reject(new Error(e.data.error))
          } else {
            resolve(e.data.watermarkedBlob)
          }
        }
      }

      this.watermarkWorker.addEventListener('message', handler)
      this.watermarkWorker.postMessage({
        id: item.id,
        imageBlob: blob,
        text: this.getWatermarkText(item),
      })

      // Timeout
      setTimeout(() => {
        this.watermarkWorker?.removeEventListener('message', handler)
        reject(new Error('Watermark worker timeout'))
      }, 30000)
    })
  }

  /**
   * Add watermark on main thread (fallback)
   */
  private async addWatermarkMainThread(blob: Blob, item: PhotoItem): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        URL.revokeObjectURL(url)

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Draw watermark
        const text = this.getWatermarkText(item)
        const fontSize = Math.max(12, Math.min(24, img.width / 50))

        ctx.font = `${fontSize}pt system-ui`
        ctx.textAlign = 'right'

        const x = img.width - 16
        let y = img.height - 16

        // Draw text with outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.lineWidth = 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'

        for (let i = text.length - 1; i >= 0; i--) {
          ctx.strokeText(text[i], x, y)
          ctx.fillText(text[i], x, y)
          y -= fontSize * 1.4
        }

        canvas.toBlob(
          (watermarkedBlob) => {
            if (watermarkedBlob) {
              resolve(watermarkedBlob)
            } else {
              reject(new Error('Failed to create watermarked blob'))
            }
          },
          'image/jpeg',
          0.9
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image for watermark'))
      }

      img.src = url
    })
  }

  /**
   * Get watermark text lines
   */
  private getWatermarkText(item: PhotoItem): string[] {
    const lines: string[] = []

    // Job name or ID
    if (item.job_name) {
      lines.push(item.job_name)
    } else {
      lines.push(`Job: ${item.job_id.substring(0, 8)}`)
    }

    // Timestamp in PST
    const date = new Date(item.taken_at)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short',
    }
    lines.push(date.toLocaleString('en-US', options))

    // Location
    lines.push(item.location || 'Vancouver, BC')

    return lines
  }

  /**
   * Upload blob to server
   */
  private async uploadToServer(
    blob: Blob,
    item: PhotoItem
  ): Promise<{ file_id: string }> {
    // 1. Get presigned URL
    const presignRes = await fetch(`/api/jobs/${item.job_id}/photos/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `photo-${item.id}.jpg`,
        contentType: blob.type || 'image/jpeg',
      }),
    })

    if (!presignRes.ok) {
      const error = await presignRes.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to get upload URL')
    }

    const { presignedUrl, fileUrl } = await presignRes.json()

    // 2. Upload to R2 with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPLOAD_CONFIG.timeout)

    try {
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
        },
        signal: controller.signal,
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`)
      }
    } finally {
      clearTimeout(timeout)
    }

    // 3. Create photo record in database
    const createRes = await fetch(`/api/jobs/${item.job_id}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: fileUrl,
        file_size: blob.size,
        mime_type: blob.type || 'image/jpeg',
        taken_at: item.taken_at,
        stage: item.stage,
        area: item.area_id,
        trade: item.trade_id,
      }),
    })

    if (!createRes.ok) {
      const error = await createRes.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to create photo record')
    }

    const photo = await createRes.json()
    return { file_id: photo.id }
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(id: string): Promise<void> {
    const item = await getPhotoItem(id)
    if (!item || item.status !== 'failed') return

    // Reset to pending
    await updatePhotoStatus(id, 'pending', {
      attempts: 0,
      last_error: undefined,
    })

    // Trigger queue processing
    this.processQueue()
  }

  /**
   * Retry all failed uploads
   */
  async retryAllFailed(): Promise<void> {
    const failed = await getPhotosByStatus('failed')

    for (const item of failed) {
      await updatePhotoStatus(item.id, 'pending', {
        attempts: 0,
        last_error: undefined,
      })
    }

    this.processQueue()
  }

  /**
   * Pause uploads
   */
  pause() {
    this.paused = true
  }

  /**
   * Resume uploads
   */
  resume() {
    this.paused = false
    this.processQueue()
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.running.size > 0
  }

  /**
   * Get current running count
   */
  getRunningCount(): number {
    return this.running.size
  }

  /**
   * Cleanup worker on unmount
   */
  destroy() {
    this.watermarkWorker?.terminate()
    this.watermarkWorker = undefined
  }
}

// Singleton instance
export const uploadQueue = new UploadQueue()

// Initialize on import
if (typeof window !== 'undefined') {
  uploadQueue.initWatermarkWorker()
}
