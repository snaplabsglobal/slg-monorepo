// lib/storage/upload.ts
// Client-side file upload utilities (no @slo/snap-storage dependency)

export interface UploadOptions {
  folder?: string
  transactionId?: string
  projectId?: string
  contentType?: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload file directly to R2 using presigned URL
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder = 'site-photos', transactionId, projectId, contentType, onProgress } = options

  const params = new URLSearchParams({
    filename: file.name,
    contentType: contentType || file.type || 'application/octet-stream',
    folder,
    expiresIn: '3600',
  })
  if (transactionId) params.append('transactionId', transactionId)
  if (projectId) params.append('projectId', projectId)

  const presignedResponse = await fetch(`/api/upload/presigned?${params}`)
  if (!presignedResponse.ok) {
    const error = (await presignedResponse.json()) as { error?: string }
    throw new Error(error.error || 'Failed to get presigned URL')
  }

  const { presignedUrl, fileUrl, path } = (await presignedResponse.json()) as {
    presignedUrl: string
    fileUrl: string
    path: string
  }

  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType || file.type || 'application/octet-stream',
    },
  })
  if (!uploadResponse.ok) throw new Error('Failed to upload file to R2')
  if (onProgress) onProgress(100)

  return { url: fileUrl, path }
}

/**
 * Upload file via server-side API (with progress)
 */
export async function uploadFileViaAPI(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder = 'site-photos', transactionId, projectId, onProgress } = options

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  if (transactionId) formData.append('transactionId', transactionId)
  if (projectId) formData.append('projectId', projectId)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e: ProgressEvent<XMLHttpRequestEventTarget>) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve({ url: response.url, path: response.path })
      } else {
        const error = JSON.parse(xhr.responseText) as { error?: string }
        reject(new Error(error.error || 'Upload failed'))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  })
}

/**
 * Delete file from R2
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = (await response.json()) as { error?: string }
    throw new Error(error.error || 'Failed to delete file')
  }
}
