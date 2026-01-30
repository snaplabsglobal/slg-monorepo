/**
 * Perspective transform: warp quad (4 corners) to rectangle.
 * See claude/PWA_RECEIPT_EDGE_DETECTION.md
 */

import type { Point, ReceiptQuad } from './edge-detection'

/** Compute 3x3 homography that maps dst points to src points (so we can map dst pixel -> src pixel). */
function getInversePerspectiveMatrix(
  src: ReceiptQuad,
  dstWidth: number,
  dstHeight: number
): number[] {
  const dst = [
    [0, 0],
    [dstWidth, 0],
    [dstWidth, dstHeight],
    [0, dstHeight],
  ]
  const srcP = [
    [src.topLeft.x, src.topLeft.y],
    [src.topRight.x, src.topRight.y],
    [src.bottomRight.x, src.bottomRight.y],
    [src.bottomLeft.x, src.bottomLeft.y],
  ]
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const [xd, yd] = dst[i]
    const [xs, ys] = srcP[i]
    A.push(
      [xd, yd, 1, 0, 0, 0, -xd * xs, -yd * xs],
      [0, 0, 0, xd, yd, 1, -xd * ys, -yd * ys]
    )
    b.push(xs, ys)
  }
  const h = solve8(A, b)
  return [
    h[0],
    h[1],
    h[2],
    h[3],
    h[4],
    h[5],
    h[6],
    h[7],
    1,
  ]
}

function solve8(A: number[][], b: number[]): number[] {
  const n = 8
  const M: number[][] = A.map((row) => [...row])
  const v = [...b]
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    ;[v[col], v[maxRow]] = [v[maxRow], v[col]]
    const pivot = M[col][col]
    if (Math.abs(pivot) < 1e-10) continue
    for (let j = col; j < n; j++) M[col][j] /= pivot
    v[col] /= pivot
    for (let i = 0; i < n; i++) {
      if (i === col) continue
      const f = M[i][col]
      for (let j = col; j < n; j++) M[i][j] -= f * M[col][j]
      v[i] -= f * v[col]
    }
  }
  return v
}

function applyHomography(H: number[], x: number, y: number): Point {
  const w = H[6] * x + H[7] * y + H[8]
  if (Math.abs(w) < 1e-10) return { x: 0, y: 0 }
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  }
}

function bilinearSample(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number
): { r: number; g: number; b: number; a: number } {
  const x0 = Math.floor(u)
  const y0 = Math.floor(v)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const fx = u - x0
  const fy = v - y0
  const i00 = (y0 * width + x0) * 4
  const i10 = (y0 * width + x1) * 4
  const i01 = (y1 * width + x0) * 4
  const i11 = (y1 * width + x1) * 4
  const r =
    (1 - fx) * (1 - fy) * data[i00] +
    fx * (1 - fy) * data[i10] +
    (1 - fx) * fy * data[i01] +
    fx * fy * data[i11]
  const g =
    (1 - fx) * (1 - fy) * data[i00 + 1] +
    fx * (1 - fy) * data[i10 + 1] +
    (1 - fx) * fy * data[i01 + 1] +
    fx * fy * data[i11 + 1]
  const b =
    (1 - fx) * (1 - fy) * data[i00 + 2] +
    fx * (1 - fy) * data[i10 + 2] +
    (1 - fx) * fy * data[i01 + 2] +
    fx * fy * data[i11 + 2]
  const a =
    (1 - fx) * (1 - fy) * data[i00 + 3] +
    fx * (1 - fy) * data[i10 + 3] +
    (1 - fx) * fy * data[i01 + 3] +
    fx * fy * data[i11 + 3]
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a) }
}

/**
 * Warp source canvas using quad to a new rectangle; returns a new canvas.
 */
export function perspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  quad: ReceiptQuad,
  outputWidth: number = 800,
  outputHeight: number = 1200
): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const H = getInversePerspectiveMatrix(quad, outputWidth, outputHeight)
  const out = document.createElement('canvas')
  out.width = outputWidth
  out.height = outputHeight
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('No 2d context')
  const outData = outCtx.createImageData(outputWidth, outputHeight)
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const p = applyHomography(H, x, y)
      if (p.x >= 0 && p.x < w - 0.5 && p.y >= 0 && p.y < h - 0.5) {
        const c = bilinearSample(imageData.data, w, h, p.x, p.y)
        const i = (y * outputWidth + x) * 4
        outData.data[i] = c.r
        outData.data[i + 1] = c.g
        outData.data[i + 2] = c.b
        outData.data[i + 3] = c.a
      } else {
        const i = (y * outputWidth + x) * 4
        outData.data[i] = 255
        outData.data[i + 1] = 255
        outData.data[i + 2] = 255
        outData.data[i + 3] = 0
      }
    }
  }
  outCtx.putImageData(outData, 0, 0)
  return out
}

/**
 * Same as perspectiveTransform but returns a Blob (JPEG) for upload.
 */
export function perspectiveTransformToBlob(
  sourceCanvas: HTMLCanvasElement,
  quad: ReceiptQuad,
  outputWidth: number = 800,
  outputHeight: number = 1200,
  quality: number = 0.92
): Promise<Blob> {
  const out = perspectiveTransform(sourceCanvas, quad, outputWidth, outputHeight)
  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality
    )
  })
}
