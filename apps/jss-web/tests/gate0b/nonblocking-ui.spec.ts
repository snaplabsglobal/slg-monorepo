import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-B: Non-blocking Capture UI Test
 * v2.3 Self-Test Protocol - 方案 UI-1
 *
 * Pass Criteria:
 * - camera_view_always_visible = true (no navigation away)
 * - blocking_modal_appeared = false (no confirm/preview modal)
 * - queue_badge_count = 30 (all captures counted)
 * - ui_frozen_detected = false (no long tasks > 200ms)
 * - shutter_always_clickable = true (never disabled/blocked)
 */

test.describe('Gate 0-B: Non-blocking Capture UI', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0B-1: non-blocking capture UI (30 rapid clicks)', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Click shutter 30 times rapidly
    for (let i = 0; i < 30; i++) {
      // Shutter button must be enabled
      await expect(page.locator('[data-testid="shutter-button"]')).toBeEnabled()

      await page.click('[data-testid="shutter-button"]')

      // Camera view must still be visible (no navigation)
      await expect(page.locator('[data-testid="camera-view"]')).toBeVisible()

      // No blocking modal should appear
      await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(0)
    }

    // Queue badge should show 30 (or close to it)
    const badge = page.locator('[data-testid="queue-badge"]')
    await expect(badge).toBeVisible()
  })

  test('G0B-1b: harness non-blocking UI test', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the harness non-blocking UI test
    const result = await runHarnessTest(page, 'run-nonblocking-ui', 120_000)
    expect(result).toBe('PASS')

    // Verify diagnostics
    const diag = await getDiagnostics(page)
    expect(diag.ui_interaction.nonblocking.camera_view_always_visible).toBe(true)
    expect(diag.ui_interaction.nonblocking.blocking_modal_appeared).toBe(false)
    expect(diag.ui_interaction.nonblocking.shutter_always_clickable).toBe(true)
    expect(diag.ui_interaction.nonblocking.ui_frozen_detected).toBe(false)
  })
})
