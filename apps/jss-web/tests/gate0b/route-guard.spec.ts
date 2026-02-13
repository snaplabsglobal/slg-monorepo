import { test, expect } from '@playwright/test'
import { setupMockCamera, waitForHarness, runHarnessTest, getDiagnostics } from '../fixtures/mock-camera'

/**
 * Gate 0-B: Route Guard Test
 * v2.3 Self-Test Protocol - 方案 UI-2
 *
 * Pass Criteria:
 * - bare_camera_redirected = true (/camera → /jobs)
 * - job_camera_renders = true (/jobs/[id]/camera renders correctly)
 * - job_selector_absent_on_camera = true (no job selector on camera page)
 * - unauthenticated_redirected = true (→ login page)
 */

test.describe('Gate 0-B: Route Guard Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCamera(page)
  })

  test('G0B-2a: /camera redirects away from bare path', async ({ page }) => {
    // Navigate to bare /camera path
    const response = await page.goto('/camera')

    // Should redirect, not stay on /camera
    expect(page.url()).not.toMatch(/\/camera$/)

    // Should redirect to /jobs or similar
    expect(page.url()).toMatch(/\/jobs|\/login|\/auth/)
  })

  test('G0B-2b: /jobs/[id]/camera renders correctly', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Camera view should be visible
    await expect(page.locator('[data-testid="camera-view"]')).toBeVisible()

    // Job title should be visible
    await expect(page.locator('[data-testid="job-title"]')).toBeVisible()

    // Job selector should NOT be on camera page
    await expect(page.locator('[data-testid="job-selector"]')).toHaveCount(0)
  })

  test('G0B-2c: harness route guard test', async ({ page }) => {
    await page.goto('/jobs/test-job/camera?dev=1&harness=1')
    await waitForHarness(page)

    // Run the harness route guard test
    const result = await runHarnessTest(page, 'run-route-guard', 30_000)
    expect(result).toBe('PASS')

    // Verify diagnostics
    const diag = await getDiagnostics(page)
    expect(diag.ui_interaction.route_guard.job_camera_renders).toBe(true)
    expect(diag.ui_interaction.route_guard.job_selector_absent_on_camera).toBe(true)
  })

  test('G0B-2d: unauthenticated access redirects to login', async ({ context }) => {
    // Create a new page without auth cookies
    const page = await context.newPage()

    // Clear any existing auth state
    await page.context().clearCookies()

    // Try to access camera page
    await page.goto('/jobs/test-job/camera')

    // Should redirect to login/auth page
    expect(page.url()).toMatch(/\/login|\/auth|\/sign-in/)
  })
})
