import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: Idempotency Replay Test
 * v2.3 Self-Test Protocol - 方案 E
 *
 * Pass Criteria:
 * - Client IDs are unique
 * - Server idempotency keys work (blocks duplicate uploads)
 */

test.describe('Gate 0-A: Idempotency Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-E1: idempotency replay', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the idempotency test
    const result = await runHarnessTest(page, 'run-idempotency', 60_000)
    expect(result).toBe('PASS')
  })
})
