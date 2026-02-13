import { defineConfig, devices } from '@playwright/test'

/**
 * SLG JSS Playwright Configuration
 * Gate 0 Test Suite - v2.3 Self-Test Protocol
 *
 * Projects:
 * - gate0a: Data / Queue / Evidence tests
 * - gate0b: UI / Interaction / Routing tests
 * - gate0c: Visual Regression tests
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-artifacts/results.json' }],
  ],
  outputDir: 'test-artifacts',

  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'gate0a',
      testDir: './tests/gate0a',
      use: {
        ...devices['Desktop Chrome'],
      },
      timeout: 300_000, // 5 minutes for stress tests
    },
    {
      name: 'gate0b',
      testDir: './tests/gate0b',
      use: {
        ...devices['Desktop Chrome'],
      },
      timeout: 120_000, // 2 minutes for UI tests
    },
    {
      name: 'gate0c',
      testDir: './tests/gate0c',
      use: {
        ...devices['Desktop Chrome'],
      },
      timeout: 60_000, // 1 minute for visual tests
    },
  ],

  webServer: {
    // In CI, use 'pnpm start' to run the production build
    // In dev, use 'pnpm dev' for HMR
    // jss-web runs on port 3001 (ls-web uses 3000)
    // Note: cwd is set to ensure the command runs from the correct directory
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    cwd: process.env.CI ? process.cwd() : undefined,
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // CI must be passed for isTestMode() to work in camera page
      CI: process.env.CI ? 'true' : '',
      NEXT_PUBLIC_ALLOW_HARNESS: 'true',
    },
  },
})
