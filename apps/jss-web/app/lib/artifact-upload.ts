/**
 * Artifact Upload Client
 *
 * This is the client-side interface to the Artifact Service.
 * Use this for ALL file uploads in JSS (and other apps).
 *
 * Usage:
 * ```ts
 * const result = await uploadArtifact({
 *   file: photoBlob,
 *   kind: 'photo',
 *   capturedAt: new Date().toISOString(),
 *   jobId: 'job-123',
 * })
 * ```
 */

import { ulid } from '@slo/shared-utils'
import type { ArtifactKind, SourceApp, ULID } from '@slo/snap-types'

// ============================================================================
// Types
// ============================================================================

export interface UploadArtifactInput {
  // Required
  file: Blob | File
  kind: ArtifactKind
  capturedAt: string // ISO timestamp - CRITICAL: use capture time, not upload time!

  // Optional metadata
  geoLat?: number
  geoLng?: number
  deviceId?: string
  deviceLocalTime?: string
  tzOffset?: string

  // Context
  propertyId?: string
  projectId?: string
  jobId?: string

  // Callbacks
  onProgress?: (progress: number) => void
}

export interface UploadArtifactResult {
  artifactId: ULID
  sha256: string
  eventId: ULID
  fileUrl: string
  deduplicated: boolean
}

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_APP: SourceApp = 'jss' // This file is in jss-web

// ============================================================================
// Main Upload Function
// ============================================================================

/**
 * Upload an artifact through the Artifact Service
 *
 * This is the ONLY way to upload files in SLG.
 * Any direct R2 upload is a violation of the architecture.
 */
export async function uploadArtifact(
  input: UploadArtifactInput
): Promise<UploadArtifactResult> {
  const idempotencyKey = ulid() // Unique per upload attempt

  // 1. Request upload URL from server
  const requestBody = {
    idempotency_key: idempotencyKey,
    kind: input.kind,
    mime_type: getMimeType(input.file),
    byte_size: input.file.size,
    source_app: SOURCE_APP,
    captured_at: input.capturedAt,
    geo_lat: input.geoLat,
    geo_lng: input.geoLng,
    device_id: input.deviceId,
    device_local_time: input.deviceLocalTime,
    tz_offset: input.tzOffset,
    property_id: input.propertyId,
    project_id: input.projectId,
    job_id: input.jobId,
  }

  const requestRes = await fetch('/api/artifacts/upload-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!requestRes.ok) {
    const error = await requestRes.json()
    throw new Error(error.error || 'Failed to request upload URL')
  }

  const uploadRequest = await requestRes.json()

  // If deduplicated, we're done (no upload needed)
  if (uploadRequest.deduplicated) {
    return {
      artifactId: uploadRequest.artifact_id,
      sha256: '', // Dedup doesn't return sha256
      eventId: '' as ULID,
      fileUrl: uploadRequest.file_url,
      deduplicated: true,
    }
  }

  // 2. Upload directly to R2 using presigned URL
  input.onProgress?.(0)

  const uploadRes = await uploadToR2(
    uploadRequest.upload_url,
    input.file,
    input.onProgress
  )

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file to storage')
  }

  input.onProgress?.(90)

  // 3. Confirm upload with server
  const confirmBody = {
    artifact_id: uploadRequest.artifact_id,
    source_app: SOURCE_APP,
    property_id: input.propertyId,
    project_id: input.projectId,
    job_id: input.jobId,
  }

  const confirmRes = await fetch('/api/artifacts/confirm-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmBody),
  })

  if (!confirmRes.ok) {
    const error = await confirmRes.json()
    throw new Error(error.error || 'Failed to confirm upload')
  }

  const confirmed = await confirmRes.json()
  input.onProgress?.(100)

  return {
    artifactId: confirmed.artifact_id,
    sha256: confirmed.sha256,
    eventId: confirmed.event_id,
    fileUrl: confirmed.file_url,
    deduplicated: confirmed.deduplicated,
  }
}

// ============================================================================
// Batch Upload Function
// ============================================================================

/**
 * Upload multiple artifacts in parallel
 */
export async function uploadArtifacts(
  inputs: UploadArtifactInput[],
  options?: {
    concurrency?: number
    onItemComplete?: (index: number, result: UploadArtifactResult | Error) => void
  }
): Promise<(UploadArtifactResult | Error)[]> {
  const concurrency = options?.concurrency || 3
  const results: (UploadArtifactResult | Error)[] = []
  let currentIndex = 0

  async function processNext(): Promise<void> {
    const index = currentIndex++
    if (index >= inputs.length) return

    try {
      const result = await uploadArtifact(inputs[index])
      results[index] = result
      options?.onItemComplete?.(index, result)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      results[index] = err
      options?.onItemComplete?.(index, err)
    }

    await processNext()
  }

  // Start `concurrency` parallel workers
  const workers = Array(Math.min(concurrency, inputs.length))
    .fill(null)
    .map(() => processNext())

  await Promise.all(workers)
  return results
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMimeType(file: Blob | File): string {
  if (file.type) return file.type

  // Fallback based on file extension
  if (file instanceof File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      pdf: 'application/pdf',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
    }
    if (ext && mimeMap[ext]) return mimeMap[ext]
  }

  return 'application/octet-stream'
}

/**
 * Upload file to R2 using presigned URL with progress tracking
 */
async function uploadToR2(
  presignedUrl: string,
  file: Blob | File,
  onProgress?: (progress: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        // Scale to 0-80% (leave room for confirmation step)
        const progress = Math.round((e.loaded / e.total) * 80)
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(null, { status: xhr.status }))
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', getMimeType(file))
    xhr.send(file)
  })
}

// ============================================================================
// Offline Queue Integration (for future Step 4)
// ============================================================================

/**
 * Queue an artifact for upload when offline
 * (Placeholder for Step 4 implementation)
 */
export function queueArtifactForUpload(
  input: UploadArtifactInput & { offlineId: string }
): void {
  // TODO: Step 4 - Offline queue implementation
  // This will store the file in IndexedDB with metadata
  // and process when network is restored
  console.log('[Artifact Queue] Queued for offline upload:', input.offlineId)
}
