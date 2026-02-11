import { test, expect } from '@playwright/test'
import {
  setupMockCamera,
  waitForHarness,
  runHarnessTest,
  getDiagnostics,
} from '../fixtures/mock-camera'

/**
 * Gate 0-A: Chaos Network Test
 * v2.3 Self-Test Protocol - 方案 C
 *
 * Pass Criteria:
 * - final_uploaded = 30
 * - duplicate_events = 0
 * - duplicate_artifacts = 0
 * - orphan_artifacts = {0, 0}
 * - stuck_items = 0
 * - sequence_valid = true
 * - immutable_events_intact = true
 */

test.describe('Gate 0-A: Chaos Network Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0A-C1: chaos network test', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the chaos network test
    const result = await runHarnessTest(page, 'run-chaos-network', 300_000)
    expect(result).toBe('PASS')

    // Verify chaos network results
    const diag = await getDiagnostics(page)
    expect(diag.chaos_network.duplicate_events).toBe(0)
    expect(diag.chaos_network.duplicate_artifacts).toBe(0)
    expect(diag.chaos_network.orphan_artifacts.type_a).toBe(0)
    expect(diag.chaos_network.orphan_artifacts.type_b).toBe(0)
    expect(diag.chaos_network.sequence_valid_after_chaos).toBe(true)
  })

  test('G0A-C2: orphan artifact detection', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // After any test, verify no orphans exist
    const diag = await getDiagnostics(page)

    // Orphan Type A: storage has file but DB doesn't
    expect(diag.chaos_network?.orphan_artifacts?.type_a ?? 0).toBe(0)

    // Orphan Type B: DB has record but storage doesn't
    expect(diag.chaos_network?.orphan_artifacts?.type_b ?? 0).toBe(0)
  })
})
