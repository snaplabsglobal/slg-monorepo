/**
 * Mock Storage for Local Development
 * SEOS: Self-contained, no external dependencies
 *
 * When R2 is not configured, this module provides mock upload functionality
 * that stores images as data URLs in memory (for development/testing only).
 */

// In-memory storage for mock uploads
const mockStorage = new Map<string, {
  dataUrl: string
  contentType: string
  uploadedAt: string
  metadata: Record<string, string>
}>()

/**
 * Check if mock storage should be used
 * Returns true when R2 is not configured
 */
export function shouldUseMockStorage(): boolean {
  const hasR2 = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_BUCKET_SNAP_EVIDENCE &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL_SNAP_EVIDENCE
  )
  return !hasR2
}

/**
 * Generate a mock presigned URL
 * In mock mode, we return a special URL that the client can POST to
 */
export function generateMockPresignedUrl(
  r2Key: string,
  contentType: string,
  metadata?: Record<string, string>
): {
  presignedUrl: string
  fileUrl: string
  r2Key: string
  bucket: string
} {
  // The "presigned URL" is actually our mock upload endpoint
  const presignedUrl = `/api/mock-storage/upload?key=${encodeURIComponent(r2Key)}`

  // The file URL will be our mock retrieval endpoint
  const fileUrl = `/api/mock-storage/file/${encodeURIComponent(r2Key)}`

  console.log(`[MockStorage] Generated mock presigned URL for key: ${r2Key}`)

  return {
    presignedUrl,
    fileUrl,
    r2Key,
    bucket: 'mock-storage',
  }
}

/**
 * Store a file in mock storage
 */
export function storeMockFile(
  key: string,
  dataUrl: string,
  contentType: string,
  metadata?: Record<string, string>
): void {
  mockStorage.set(key, {
    dataUrl,
    contentType,
    uploadedAt: new Date().toISOString(),
    metadata: metadata || {},
  })
  console.log(`[MockStorage] Stored file: ${key} (${contentType})`)
}

/**
 * Retrieve a file from mock storage
 */
export function getMockFile(key: string): {
  dataUrl: string
  contentType: string
  uploadedAt: string
  metadata: Record<string, string>
} | null {
  return mockStorage.get(key) || null
}

/**
 * Delete a file from mock storage
 */
export function deleteMockFile(key: string): boolean {
  const existed = mockStorage.has(key)
  mockStorage.delete(key)
  if (existed) {
    console.log(`[MockStorage] Deleted file: ${key}`)
  }
  return existed
}

/**
 * List all files in mock storage (for debugging)
 */
export function listMockFiles(): string[] {
  return Array.from(mockStorage.keys())
}

/**
 * Clear all mock storage (for testing)
 */
export function clearMockStorage(): void {
  mockStorage.clear()
  console.log('[MockStorage] Cleared all files')
}
