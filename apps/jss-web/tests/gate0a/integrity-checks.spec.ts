import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  getDiagnostics,
  runHarnessTest,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: Post-Suite Integrity Checks
 * v2.3 Self-Test Protocol - Comprehensive assertion checks
 *
 * These checks run after the stress test to verify overall system integrity
 */

test.describe('Gate 0-A: Integrity Checks', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-INT1: post-suite integrity checks', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the stress test first to populate capture integrity stats
    // This is required because integrity tracking only happens during stress test
    const result = await runHarnessTest(page, 'run-stress-test', 120_000)
    expect(result).toBe('PASS')

    // Get diagnostics after stress test
    const diag = await getDiagnostics(page)

    // Capture Integrity - max_concurrent should be exactly 1 (one capture at a time)
    expect(diag.capture_integrity.max_concurrent_captures).toBe(1)
    expect(diag.capture_integrity.sequence_valid).toBe(true)

    // Immutable Integrity (if tested)
    if (diag.immutable_integrity?.tested) {
      expect(diag.immutable_integrity.violations).toBe(0)
    }

    // Chaos Network (if tested)
    if (diag.chaos_network?.tested) {
      expect(diag.chaos_network.orphan_artifacts.type_a).toBe(0)
      expect(diag.chaos_network.orphan_artifacts.type_b).toBe(0)
    }

    // Meta
    expect(diag.meta.commit_hash).not.toBe('unknown')
  })

  test('G0A-INT2: queue health check', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Wait for any pending operations
    await page.waitForTimeout(2000)

    // Check stuck indicator
    const stuckResult = await page.locator('[data-testid="result-stuck-recovery"]').textContent()
    expect(stuckResult).toBe('PASS')
  })
})
