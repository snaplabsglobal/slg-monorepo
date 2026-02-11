/**
 * Mock Camera Fixture for Playwright Tests
 * v2.3 Self-Test Protocol - Mock Camera Specification
 *
 * Requirements:
 * - Blob format: JPEG, same as real canvas.toBlob('image/jpeg', quality)
 * - Size: minimum 640x480 (low-end), optional 1920x1080 (high-end)
 * - Metadata: captured_at, capture_index, device_id
 * - Variable content: random color blocks + timestamp for unique sha256
 */

import { Page } from '@playwright/test'

export interface MockCameraOptions {
  width?: number
  height?: number
  quality?: number
}

/**
 * Generate a mock camera blob with unique content
 */
export async function generateMockBlob(
  page: Page,
  index: number,
  options: MockCameraOptions = {}
): Promise<void> {
  const { width = 640, height = 480, quality = 0.92 } = options

  // Inject mock blob generation into page context
  await page.evaluate(
    ({ idx, w, h, q }) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      // Random color background for unique sha256
      const hue = (idx * 37 + Date.now()) % 360
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.fillRect(0, 0, w, h)

      // Add timestamp and index
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`MOCK #${idx + 1}`, w / 2, h / 2 - 30)
      ctx.fillText(new Date().toISOString(), w / 2, h / 2 + 10)
      ctx.font = '16px monospace'
      ctx.fillText(`capture_index: ${idx}`, w / 2, h / 2 + 40)
      ctx.fillText(`device_id: mock-camera-001`, w / 2, h / 2 + 65)

      // Store as global for harness to use
      ;(window as any).__mockCanvas = canvas
      ;(window as any).__mockQuality = q
    },
    { idx: index, w: width, h: height, q: quality }
  )
}

/**
 * Setup mock camera API to intercept getUserMedia
 */
export async function setupMockCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Create a mock MediaStream
    const createMockStream = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')!

      // Animated mock video feed
      let frame = 0
      const drawFrame = () => {
        const hue = (frame * 2) % 360
        ctx.fillStyle = `hsl(${hue}, 50%, 30%)`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'white'
        ctx.font = '20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('MOCK CAMERA', canvas.width / 2, canvas.height / 2)
        ctx.fillText(`Frame: ${frame}`, canvas.width / 2, canvas.height / 2 + 30)
        frame++
        requestAnimationFrame(drawFrame)
      }
      drawFrame()

      // @ts-ignore - captureStream exists on canvas
      const stream = canvas.captureStream(30)
      return stream
    }

    // Override getUserMedia
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices
    )
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      // Check if we're in test mode
      const isTestMode =
        window.location.search.includes('harness=1') ||
        window.location.search.includes('mock=1')

      if (isTestMode && constraints?.video) {
        console.log('[MockCamera] Returning mock stream')
        return createMockStream()
      }

      // Fall through to real camera
      return originalGetUserMedia(constraints)
    }
  })
}

/**
 * Wait for harness to be ready
 */
export async function waitForHarness(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="camera-view"]', { timeout: 30_000 })
  await page.waitForTimeout(1000) // Allow harness to initialize
}

/**
 * Click shutter and wait for queue update
 */
export async function clickShutter(page: Page): Promise<void> {
  await page.click('[data-testid="shutter-button"]')
  await page.waitForTimeout(100) // Brief wait for queue update
}

/**
 * Get current queue badge count
 */
export async function getQueueCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="queue-badge"]')
  if (await badge.isVisible()) {
    const text = await badge.textContent()
    return parseInt(text || '0', 10)
  }
  return 0
}

/**
 * Run a harness test and wait for result
 */
export async function runHarnessTest(
  page: Page,
  testId: string,
  timeout = 60_000
): Promise<'PASS' | 'FAIL' | ''> {
  await page.click(`[data-testid="${testId}"]`)

  const resultId = testId.replace('run-', 'result-')
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`)
      return el && (el.textContent === 'PASS' || el.textContent === 'FAIL')
    },
    resultId,
    { timeout }
  )

  const result = await page.locator(`[data-testid="${resultId}"]`).textContent()
  return (result as 'PASS' | 'FAIL' | '') || ''
}

/**
 * Get diagnostics JSON from harness
 */
export async function getDiagnostics(page: Page): Promise<Record<string, any>> {
  const diagEl = page.locator('[data-testid="diagnostics"]')
  const text = await diagEl.textContent()
  return JSON.parse(text || '{}')
}
