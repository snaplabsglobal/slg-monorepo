/**
 * SnapEvidence Watermark Worker
 * Generates watermarks on photos using OffscreenCanvas
 * Runs in a separate thread to avoid blocking the main thread
 */

interface WatermarkMessage {
  id: string
  imageBlob: Blob
  text: string[]
}

self.onmessage = async (e: MessageEvent<WatermarkMessage>) => {
  const { id, imageBlob, text } = e.data

  try {
    // 1. Load original image
    const bitmap = await createImageBitmap(imageBlob)

    // 2. Create OffscreenCanvas
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // 3. Draw original image
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    // 4. Configure watermark text
    const fontSize = Math.max(12, Math.min(24, bitmap.width / 50))
    ctx.font = `${fontSize}pt system-ui`
    ctx.textAlign = 'right'

    const x = canvas.width - 16
    let y = canvas.height - 16

    // 5. Draw text with outline (for visibility on any background)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'

    // Draw from bottom up (reverse order)
    for (let i = text.length - 1; i >= 0; i--) {
      ctx.strokeText(text[i], x, y)
      ctx.fillText(text[i], x, y)
      y -= fontSize * 1.4 // Line spacing
    }

    // 6. Convert back to Blob
    const watermarkedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.9,
    })

    // 7. Send result back
    self.postMessage({
      id,
      watermarkedBlob,
    })

  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// TypeScript export for worker module
export {}
