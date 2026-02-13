import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: Immutable Integrity Test
 * v2.3 Self-Test Protocol - 方案 G
 *
 * Pass Criteria:
 * - update_blocked_count = 4 (all update attempts blocked)
 * - delete_blocked_count = 1 (delete attempt blocked)
 * - api_response_all_403 = true
 * - original_data_intact = true
 * - silent_overwrite_detected = false
 * - correction_event_available = true
 */

test.describe('Gate 0-A: Immutable Integrity Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-G1: immutable integrity test', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the immutable integrity test
    const result = await runHarnessTest(page, 'run-immutable-integrity', 120_000)
    expect(result).toBe('PASS')

    // Verify diagnostics
    const diag = await getDiagnostics(page)
    expect(diag.immutable_integrity.violations).toBe(0)
    expect(diag.immutable_integrity.original_data_intact).toBe(true)
    expect(diag.immutable_integrity.silent_overwrite_detected).toBe(false)
  })
})
