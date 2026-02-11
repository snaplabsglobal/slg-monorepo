import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: Memory Leak Trend Detection
 * v2.3 Self-Test Protocol - 方案 H
 *
 * Pass Criteria:
 * - leak_ratio (delta_3 / delta_1) < 1.5
 * - total_memory_after_3_rounds < TBD MB
 * - blob_url_unreleased = 0
 */

test.describe('Gate 0-A: Memory Leak Trend Test', () => {
  // Skip in CI unless explicitly requested (memory tests are slow)
  test.skip(() => !!process.env.CI && !process.env.RUN_MEMORY_TESTS, 'Memory tests skipped in CI unless RUN_MEMORY_TESTS=1')

  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-H1: memory leak trend (3x30)', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the memory trend test (3 rounds of 30 shots)
    const result = await runHarnessTest(page, 'run-memory-trend', 600_000) // 10 minutes
    expect(result).toBe('PASS')

    // Verify memory trend
    const diag = await getDiagnostics(page)
    expect(diag.memory_trend.leak_ratio).toBeLessThan(1.5)
    expect(diag.memory_trend.verdict).toBe('PASS')

    // Log memory details for analysis
    console.log('Memory Trend Results:')
    console.log(`  Rounds: ${diag.memory_trend.rounds}`)
    console.log(`  Memory before: ${diag.memory_trend.memory_before}MB`)
    console.log(`  Memory after rounds: ${diag.memory_trend.memory_after_rounds?.join(', ')}MB`)
    console.log(`  Deltas: ${diag.memory_trend.deltas?.join(', ')}MB`)
    console.log(`  Leak ratio: ${diag.memory_trend.leak_ratio}`)
  })
})
