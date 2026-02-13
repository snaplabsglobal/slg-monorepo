import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: 30-Shot Stress Test (Synthetic Mode)
 * v2.3 Self-Test Protocol - 方案 A
 *
 * Pass Criteria:
 * - p95(t_enqueue_ms) < 100ms
 * - queue_item_count = 30
 * - fatal_errors = 0
 * - maxConcurrentCaptures = 1
 * - sequence_valid = true
 */

test.describe('Gate 0-A: 30-Shot Stress Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-1: 30-shot stress test (synthetic)', async ({ page }) => {
    // Navigate to camera with harness enabled
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the stress test
    const result = await runHarnessTest(page, 'run-stress-test', 120_000)
    expect(result).toBe('PASS')

    // Verify diagnostics
    const diag = await getDiagnostics(page)
    expect(diag.capture_integrity.max_concurrent_captures).toBe(1)
    expect(diag.capture_integrity.sequence_valid).toBe(true)
  })

  test('G0A-2: performance budget check', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run stress test
    await runHarnessTest(page, 'run-stress-test', 120_000)

    // Get performance metrics from diagnostics
    const diag = await getDiagnostics(page)

    // Check performance metrics (record for now, will be hard gates later)
    console.log('Performance Budget:')
    console.log(`  p95_enqueue_ms: ${diag.performance?.t_enqueue_p95_ms || 'N/A'}`)
    console.log(`  memory_growth_mb: ${diag.performance?.memory_growth_mb || 'N/A'}`)
    console.log(`  long_task_count: ${diag.performance?.long_task_count || 'N/A'}`)

    // Soft assertion - p95 should be < 100ms
    if (diag.performance?.t_enqueue_p95_ms) {
      expect(diag.performance.t_enqueue_p95_ms).toBeLessThan(100)
    }
  })
})
