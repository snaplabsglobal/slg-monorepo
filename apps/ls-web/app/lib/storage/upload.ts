// lib/storage/upload.ts
// Client-side file upload utilities (no @slo/snap-storage dependency)

export interface UploadOptions {
  folder?: string
  transactionId?: string
  contentType?: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload file directly to R2 using presigned URL
 * 
 * @param file - File to upload
 * @param options - Upload options
 * @returns Public URL of uploaded file
 */
export async function uploadFile(
  file: File,
  options: {
    folder?: string
    transactionId?: string
    contentType?: string
    onProgress?: (progress: number) => void
  } = {}
): Promise<{ url: string; path: string }> {
  const { folder = 'receipts', transactionId, contentType, onProgress } = options

  // Step 1: Get presigned URL
  const params = new URLSearchParams({
    filename: file.name,
    contentType: contentType || file.type || 'application/octet-stream',
    folder,
    expiresIn: '3600',
  })

  if (transactionId) {
    params.append('transactionId', transactionId)
  }

  const presignedResponse = await fetch(`/api/upload/presigned?${params}`)
  if (!presignedResponse.ok) {
    const error = await presignedResponse.json()
    throw new Error(error.error || 'Failed to get presigned URL')
  }

  const { presignedUrl, fileUrl, path } = await presignedResponse.json()

  // Step 2: Upload file to R2 using presigned URL
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType || file.type || 'application/octet-stream',
    },
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to R2')
  }

  // Simulate progress (since we can't track actual upload progress with PUT)
  if (onProgress) {
    onProgress(100)
  }

  return { url: fileUrl, path }
}

/**
 * Upload file via server-side API (for smaller files or when presigned URL is not available)
 * 
 * @param file - File to upload
 * @param options - Upload options
 * @returns Public URL of uploaded file
 */
export async function uploadFileViaAPI(
  file: File,
  options: {
    folder?: string
    transactionId?: string
    onProgress?: (progress: number) => void
  } = {}
): Promise<{ url: string; path: string }> {
  const { folder = 'receipts', transactionId, onProgress } = options

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  if (transactionId) {
    formData.append('transactionId', transactionId)
  }

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve({ url: response.url, path: response.path })
      } else {
        const error = JSON.parse(xhr.responseText)
        reject(new Error(error.error || 'Upload failed'))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  })
}

/**
 * Delete file from R2
 * 
 * @param path - File path in R2
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete file')
  }
}
