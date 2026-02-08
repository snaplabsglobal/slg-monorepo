/**
 * SnapEvidence Local Store
 * IndexedDB-based persistent storage for offline-first photo capture
 *
 * Core principle: Photos are written locally first, uploaded in background
 */

import type { PhotoItem, PhotoBlob, PhotoStatus } from './types'
import { STORAGE_TTL_CONFIG } from './types'

const DB_NAME = 'jobsite_snap'
const DB_VERSION = 1
const STORE_ITEMS = 'photo_items'
const STORE_BLOBS = 'photo_blobs'

let dbInstance: IDBDatabase | null = null

/**
 * Open or get existing database connection
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create photo_items store
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' })
        itemStore.createIndex('by_job', 'job_id', { unique: false })
        itemStore.createIndex('by_status', 'status', { unique: false })
        itemStore.createIndex('by_taken_at', 'taken_at', { unique: false })
      }

      // Create photo_blobs store
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Save a new photo to local storage
 * This is the fast path - called immediately on shutter click
 */
export async function savePhoto(
  jobId: string,
  blob: Blob,
  options: {
    stage?: PhotoItem['stage']
    areaId?: string
    tradeId?: string
    jobName?: string
    location?: string
  } = {}
): Promise<PhotoItem> {
  const db = await getDB()
  const id = generateUUID()
  const now = new Date().toISOString()

  const item: PhotoItem = {
    id,
    job_id: jobId,
    taken_at: now,
    stage: options.stage || 'during',
    area_id: options.areaId,
    trade_id: options.tradeId,
    status: 'pending',
    attempts: 0,
    mime_type: blob.type || 'image/jpeg',
    byte_size: blob.size,
    job_name: options.jobName,
    location: options.location,
  }

  const photoBlob: PhotoBlob = {
    id,
    blob,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS, STORE_BLOBS], 'readwrite')

    tx.onerror = () => {
      console.error('Save photo transaction error:', tx.error)
      reject(tx.error)
    }

    tx.oncomplete = () => {
      resolve(item)
    }

    tx.objectStore(STORE_ITEMS).put(item)
    tx.objectStore(STORE_BLOBS).put(photoBlob)
  })
}

/**
 * Get a photo item by ID
 */
export async function getPhotoItem(id: string): Promise<PhotoItem | undefined> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly')
    const request = tx.objectStore(STORE_ITEMS).get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Get photo blob by ID
 */
export async function getPhotoBlob(id: string): Promise<PhotoBlob | undefined> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly')
    const request = tx.objectStore(STORE_BLOBS).get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Get all photos for a job
 */
export async function getPhotosByJob(jobId: string): Promise<PhotoItem[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly')
    const index = tx.objectStore(STORE_ITEMS).index('by_job')
    const request = index.getAll(IDBKeyRange.only(jobId))

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      // Sort by taken_at descending
      const items = request.result as PhotoItem[]
      items.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
      resolve(items)
    }
  })
}

/**
 * Get photos by status
 */
export async function getPhotosByStatus(status: PhotoStatus, limit?: number): Promise<PhotoItem[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly')
    const index = tx.objectStore(STORE_ITEMS).index('by_status')
    const request = index.getAll(IDBKeyRange.only(status))

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      let items = request.result as PhotoItem[]
      if (limit && items.length > limit) {
        items = items.slice(0, limit)
      }
      resolve(items)
    }
  })
}

/**
 * Update photo item status
 */
export async function updatePhotoStatus(
  id: string,
  status: PhotoStatus,
  extra?: Partial<Pick<PhotoItem,
    | 'attempts'
    | 'last_error'
    | 'uploaded_at'
    | 'server_file_id'
    | 'watermark_version'
    // Phase 1.5: Compression metadata
    | 'original_hash'
    | 'original_size'
    | 'compressed_size'
    | 'compression_params'
  >>
): Promise<PhotoItem | undefined> {
  const db = await getDB()
  const item = await getPhotoItem(id)

  if (!item) return undefined

  const updated: PhotoItem = {
    ...item,
    status,
    ...extra,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    const request = tx.objectStore(STORE_ITEMS).put(updated)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(updated)
  })
}

/**
 * Update photo blob (e.g., with watermarked version)
 */
export async function updatePhotoBlob(id: string, blob: Blob, thumbnail?: Blob): Promise<void> {
  const db = await getDB()
  const existing = await getPhotoBlob(id)

  if (!existing) return

  const updated: PhotoBlob = {
    id,
    blob,
    thumbnail: thumbnail || existing.thumbnail,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite')
    const request = tx.objectStore(STORE_BLOBS).put(updated)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Delete photo (both item and blob)
 */
export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS, STORE_BLOBS], 'readwrite')

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve()

    tx.objectStore(STORE_ITEMS).delete(id)
    tx.objectStore(STORE_BLOBS).delete(id)
  })
}

/**
 * Recover orphaned photos on app startup
 * Resets 'uploading' status to 'pending' to avoid stuck uploads
 */
export async function recoverOrphanedPhotos(): Promise<number> {
  const db = await getDB()
  const orphaned = await getPhotosByStatus('uploading')

  if (orphaned.length === 0) return 0

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    const store = tx.objectStore(STORE_ITEMS)
    let recovered = 0

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => {
      console.log(`Recovered ${recovered} orphaned photos`)
      resolve(recovered)
    }

    for (const item of orphaned) {
      item.status = 'pending'
      item.attempts = 0
      store.put(item)
      recovered++
    }
  })
}

/**
 * Get pending upload count
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPhotosByStatus('pending')
  return pending.length
}

/**
 * Get all local photos count by status
 */
export async function getStatusCounts(): Promise<Record<PhotoStatus, number>> {
  const pending = await getPhotosByStatus('pending')
  const uploading = await getPhotosByStatus('uploading')
  const uploaded = await getPhotosByStatus('uploaded')
  const failed = await getPhotosByStatus('failed')

  return {
    pending: pending.length,
    uploading: uploading.length,
    uploaded: uploaded.length,
    failed: failed.length,
  }
}

/**
 * Create thumbnail from blob
 */
export async function createThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
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

      // Calculate scaled dimensions
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (thumbnailBlob) => {
          if (thumbnailBlob) {
            resolve(thumbnailBlob)
          } else {
            reject(new Error('Failed to create thumbnail'))
          }
        },
        'image/jpeg',
        0.7
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for thumbnail'))
    }

    img.src = url
  })
}

/**
 * Save thumbnail for a photo
 */
export async function saveThumbnail(id: string, thumbnail: Blob): Promise<void> {
  const db = await getDB()
  const existing = await getPhotoBlob(id)

  if (!existing) return

  const updated: PhotoBlob = {
    ...existing,
    thumbnail,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite')
    const request = tx.objectStore(STORE_BLOBS).put(updated)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Set expiry date on photo blob (called after successful upload)
 * Phase 1.5: Original images expire 7 days after upload
 */
export async function setPhotoBlobExpiry(id: string): Promise<void> {
  const db = await getDB()
  const existing = await getPhotoBlob(id)

  if (!existing) return

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + STORAGE_TTL_CONFIG.originalRetentionDays)

  const updated: PhotoBlob = {
    ...existing,
    expires_at: expiresAt.toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite')
    const request = tx.objectStore(STORE_BLOBS).put(updated)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clean up expired original blobs
 * Phase 1.5: Deletes original blobs that have passed their 7-day TTL
 * Keeps the photo item metadata for reference
 */
export async function cleanupExpiredOriginals(): Promise<number> {
  const db = await getDB()
  const now = new Date()
  let cleanedCount = 0

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS, STORE_BLOBS], 'readwrite')
    const blobStore = tx.objectStore(STORE_BLOBS)
    const cursorRequest = blobStore.openCursor()

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => {
      if (cleanedCount > 0) {
        console.log(`[Cleanup] Removed ${cleanedCount} expired original blobs`)
      }
      resolve(cleanedCount)
    }

    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const blobRecord = cursor.value as PhotoBlob

        // Check if blob has expiry and is expired
        if (blobRecord.expires_at) {
          const expiresAt = new Date(blobRecord.expires_at)
          if (expiresAt < now) {
            // Delete the blob record (keeps PhotoItem for metadata)
            cursor.delete()
            cleanedCount++
          }
        }

        cursor.continue()
      }
    }
  })
}

/**
 * Get storage statistics
 * Returns total size of blobs in IndexedDB
 */
export async function getStorageStats(): Promise<{
  totalBlobs: number
  totalSize: number
  expiredCount: number
  pendingCleanupSize: number
}> {
  const db = await getDB()
  const now = new Date()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly')
    const store = tx.objectStore(STORE_BLOBS)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const blobs = request.result as PhotoBlob[]
      let totalSize = 0
      let expiredCount = 0
      let pendingCleanupSize = 0

      for (const blob of blobs) {
        const blobSize = blob.blob?.size || 0
        const thumbSize = blob.thumbnail?.size || 0
        const compressedSize = blob.compressed?.size || 0
        const recordSize = blobSize + thumbSize + compressedSize

        totalSize += recordSize

        if (blob.expires_at) {
          const expiresAt = new Date(blob.expires_at)
          if (expiresAt < now) {
            expiredCount++
            pendingCleanupSize += recordSize
          }
        }
      }

      resolve({
        totalBlobs: blobs.length,
        totalSize,
        expiredCount,
        pendingCleanupSize,
      })
    }
  })
}

/**
 * Initialize cleanup on app startup
 * Should be called once when the app initializes
 */
export async function initStorageCleanup(): Promise<void> {
  try {
    // Run cleanup immediately
    await cleanupExpiredOriginals()

    // Log storage stats
    const stats = await getStorageStats()
    console.log(
      `[Storage] ${stats.totalBlobs} photos, ` +
      `${(stats.totalSize / 1024 / 1024).toFixed(1)}MB total`
    )
  } catch (e) {
    console.warn('[Storage] Cleanup init failed:', e)
  }
}
