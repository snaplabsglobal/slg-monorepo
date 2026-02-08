/**
 * SnapEvidence Image Compression
 * Phase 1.5: Moderate compression for upload stability
 *
 * Strategy:
 * - Max dimension: 2048px (preserves detail)
 * - JPEG quality: 0.75 (optimal balance)
 * - Target size: 300-600KB
 * - Original preserved locally with 7-day TTL
 */

/**
 * Compression configuration
 */
export const COMPRESSION_CONFIG = {
  maxDimension: 2048,    // Max width or height
  quality: 0.75,         // JPEG quality (0.75 is optimal balance)
  targetMinKB: 300,      // Target minimum size
  targetMaxKB: 600,      // Target maximum size
  mimeType: 'image/jpeg' as const,
} as const

/**
 * Compression result with metadata
 */
export interface CompressionResult {
  blob: Blob
  originalSize: number
  compressedSize: number
  originalHash: string
  dimensions: {
    original: { width: number; height: number }
    compressed: { width: number; height: number }
  }
  compressionRatio: number
}

/**
 * Calculate SHA-256 hash of a blob
 */
async function calculateHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compress an image blob
 * Resizes to max 2048px and encodes as JPEG at quality 0.75
 *
 * @param originalBlob - The original image blob
 * @returns CompressionResult with compressed blob and metadata
 */
export async function compressImage(originalBlob: Blob): Promise<CompressionResult> {
  const startTime = performance.now()
  const originalSize = originalBlob.size

  // Calculate hash of original for traceability
  const originalHash = await calculateHash(originalBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(originalBlob)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        const originalWidth = img.width
        const originalHeight = img.height

        // Calculate new dimensions
        let newWidth = originalWidth
        let newHeight = originalHeight

        if (originalWidth > COMPRESSION_CONFIG.maxDimension || originalHeight > COMPRESSION_CONFIG.maxDimension) {
          if (originalWidth > originalHeight) {
            newWidth = COMPRESSION_CONFIG.maxDimension
            newHeight = Math.round((originalHeight / originalWidth) * COMPRESSION_CONFIG.maxDimension)
          } else {
            newHeight = COMPRESSION_CONFIG.maxDimension
            newWidth = Math.round((originalWidth / originalHeight) * COMPRESSION_CONFIG.maxDimension)
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Convert to JPEG blob
        canvas.toBlob(
          (compressedBlob) => {
            if (!compressedBlob) {
              reject(new Error('Failed to create compressed blob'))
              return
            }

            const compressedSize = compressedBlob.size
            const compressionRatio = originalSize / compressedSize

            const elapsed = performance.now() - startTime
            console.log(
              `[Compression] ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB ` +
              `(${compressionRatio.toFixed(1)}x) in ${elapsed.toFixed(0)}ms`
            )

            resolve({
              blob: compressedBlob,
              originalSize,
              compressedSize,
              originalHash,
              dimensions: {
                original: { width: originalWidth, height: originalHeight },
                compressed: { width: newWidth, height: newHeight },
              },
              compressionRatio,
            })
          },
          COMPRESSION_CONFIG.mimeType,
          COMPRESSION_CONFIG.quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = url
  })
}

/**
 * Check if compression is needed
 * Returns true if image exceeds target size or dimensions
 */
export function needsCompression(blob: Blob): boolean {
  // Always compress if over 600KB
  return blob.size > COMPRESSION_CONFIG.targetMaxKB * 1024
}

/**
 * Compress image using OffscreenCanvas if available (for Worker)
 * Falls back to regular canvas on main thread
 */
export async function compressImageOffscreen(originalBlob: Blob): Promise<CompressionResult> {
  // Check if OffscreenCanvas is available
  if (typeof OffscreenCanvas !== 'undefined') {
    return compressWithOffscreenCanvas(originalBlob)
  }

  // Fallback to main thread compression
  return compressImage(originalBlob)
}

/**
 * Compress using OffscreenCanvas (can run in Worker)
 */
async function compressWithOffscreenCanvas(originalBlob: Blob): Promise<CompressionResult> {
  const startTime = performance.now()
  const originalSize = originalBlob.size
  const originalHash = await calculateHash(originalBlob)

  // Create ImageBitmap from blob
  const imageBitmap = await createImageBitmap(originalBlob)

  const originalWidth = imageBitmap.width
  const originalHeight = imageBitmap.height

  // Calculate new dimensions
  let newWidth = originalWidth
  let newHeight = originalHeight

  if (originalWidth > COMPRESSION_CONFIG.maxDimension || originalHeight > COMPRESSION_CONFIG.maxDimension) {
    if (originalWidth > originalHeight) {
      newWidth = COMPRESSION_CONFIG.maxDimension
      newHeight = Math.round((originalHeight / originalWidth) * COMPRESSION_CONFIG.maxDimension)
    } else {
      newHeight = COMPRESSION_CONFIG.maxDimension
      newWidth = Math.round((originalWidth / originalHeight) * COMPRESSION_CONFIG.maxDimension)
    }
  }

  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get OffscreenCanvas context')
  }

  // Draw resized image
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight)
  imageBitmap.close()

  // Convert to blob
  const compressedBlob = await canvas.convertToBlob({
    type: COMPRESSION_CONFIG.mimeType,
    quality: COMPRESSION_CONFIG.quality,
  })

  const compressedSize = compressedBlob.size
  const compressionRatio = originalSize / compressedSize

  const elapsed = performance.now() - startTime
  console.log(
    `[Compression/Offscreen] ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB ` +
    `(${compressionRatio.toFixed(1)}x) in ${elapsed.toFixed(0)}ms`
  )

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    originalHash,
    dimensions: {
      original: { width: originalWidth, height: originalHeight },
      compressed: { width: newWidth, height: newHeight },
    },
    compressionRatio,
  }
}
