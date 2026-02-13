import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-B: Failure State UI Test
 * v2.3 Self-Test Protocol - 方案 UI-4
 *
 * Pass Criteria:
 * - shutter_still_clickable = true (can continue capturing after failures)
 * - failed_count_visible = true (failure count shown in UI)
 * - retry_button_available = true (retry/recover action exists)
 * - after_retry_queue_progresses = true (queue processes after retry)
 */

test.describe('Gate 0-B: Failure State UI', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0B-4: failure state UI', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the harness failure UI test
    const result = await runHarnessTest(page, 'run-failure-ui', 60_000)
    expect(result).toBe('PASS')

    // Verify diagnostics
    const diag = await getDiagnostics(page)
    expect(diag.ui_interaction.failure_ui.shutter_still_clickable).toBe(true)
    expect(diag.ui_interaction.failure_ui.retry_button_available).toBe(true)
  })

  test('G0B-4b: shutter remains clickable after failures', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Shutter button should always be clickable
    await expect(page.locator('[data-testid="shutter-button"]')).toBeEnabled()

    // Click shutter multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="shutter-button"]')
      await page.waitForTimeout(100)

      // Shutter should still be enabled
      await expect(page.locator('[data-testid="shutter-button"]')).toBeEnabled()
    }
  })

  test('G0B-4c: recover button exists', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Recover/retry button should exist in harness
    const recoverButton = page.locator('[data-testid="run-stuck-recovery"]')
    await expect(recoverButton).toBeVisible()
  })
})
