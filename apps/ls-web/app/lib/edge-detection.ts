/**
 * Receipt edge detection (PWA) - Phase 1 MVP: Canvas API + Sobel.
 * See claude/PWA_RECEIPT_EDGE_DETECTION.md
 */

export interface Point {
  x: number
  y: number
}

export interface ReceiptQuad {
  topLeft: Point
  topRight: Point
  bottomRight: Point
  bottomLeft: Point
}

/** Grayscale from RGBA data (in-place index: R=i, G=i+1, B=i+2, A=i+3). */
function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[i / 4] = g
  }
  return gray
}

/** Sobel edge magnitude. */
function sobel(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  const Gx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ]
  const Gy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0
      let gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const p = gray[(y + ky) * width + (x + kx)]
          gx += p * Gx[ky + 1][kx + 1]
          gy += p * Gy[ky + 1][kx + 1]
        }
      }
      out[y * width + x] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  return out
}

/** Find axis-aligned bounding box of pixels above threshold; return as quad (4 corners). */
function findEdgeBoundingBox(
  edgeMag: Float32Array,
  width: number,
  height: number,
  thresholdPercentile: number = 85
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const sorted = Float32Array.from(edgeMag).sort((a, b) => a - b)
  const nonZero = sorted.filter((v) => v > 0)
  if (nonZero.length < 10) return null
  const idx = Math.floor(nonZero.length * (1 - thresholdPercentile / 100))
  const threshold = nonZero[Math.max(0, idx)]

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (edgeMag[y * width + x] >= threshold) {
        count++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (count < 50) return null
  const pad = Math.min(width, height) * 0.02
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width, maxX + pad)
  maxY = Math.min(height, maxY + pad)
  return { minX, minY, maxX, maxY }
}

/**
 * Detect receipt edges from a canvas (image already drawn).
 * Returns a quad (4 corners) or null; if null, caller can use full image bounds.
 */
export function detectReceiptEdges(canvas: HTMLCanvasElement): ReceiptQuad | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const w = canvas.width
  const h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const gray = toGrayscale(imageData.data, w, h)
  const edgeMag = sobel(gray, w, h)
  const box = findEdgeBoundingBox(edgeMag, w, h)
  if (!box) {
    return fullImageQuad(w, h)
  }
  const { minX, minY, maxX, maxY } = box
  return {
    topLeft: { x: minX, y: minY },
    topRight: { x: maxX, y: minY },
    bottomRight: { x: maxX, y: maxY },
    bottomLeft: { x: minX, y: maxY },
  }
}

/** Full image rectangle as a quad. */
export function fullImageQuad(width: number, height: number): ReceiptQuad {
  return {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
  }
}
