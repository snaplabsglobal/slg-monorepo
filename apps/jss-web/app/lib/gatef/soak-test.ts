/**
 * GateF Soak Test（浸泡测试）
 *
 * 替代 CEO 手动验证。
 * 规则：CEO 手动验证 = GateF 失败。任何要求 CEO 手动验证的事项必须用 soak test 自动化。
 */

export interface SoakTestResult {
  testId: string
  runs: number
  passed: number
  failed: number
  status: 'PASS' | 'FAIL'
  errors: string[]
  duration_ms: number
}

export interface SoakTestConfig {
  testId: string
  runs: number
  url: string
  assertions: ((html: string) => boolean)[]
  assertionNames: string[]
}

/**
 * Run a soak test - reload page N times, assert each time
 */
export async function runSoakTest(
  baseUrl: string,
  config: SoakTestConfig
): Promise<SoakTestResult> {
  const startTime = Date.now()
  let passed = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < config.runs; i++) {
    try {
      const res = await fetch(`${baseUrl}${config.url}`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        cache: 'no-store',
      })

      if (!res.ok) {
        failed++
        errors.push(`Run ${i + 1}: HTTP ${res.status}`)
        continue
      }

      const html = await res.text()

      // Run all assertions
      let allPassed = true
      for (let j = 0; j < config.assertions.length; j++) {
        const assertion = config.assertions[j]
        const assertionName = config.assertionNames[j]
        if (!assertion(html)) {
          allPassed = false
          errors.push(`Run ${i + 1}: Assertion failed - ${assertionName}`)
        }
      }

      if (allPassed) {
        passed++
      } else {
        failed++
      }
    } catch (err) {
      failed++
      errors.push(`Run ${i + 1}: ${(err as Error).message}`)
    }
  }

  return {
    testId: config.testId,
    runs: config.runs,
    passed,
    failed,
    status: failed === 0 ? 'PASS' : 'FAIL',
    errors,
    duration_ms: Date.now() - startTime,
  }
}

/**
 * Login Sign In Soak Test Configuration
 * Replaces CEO's "refresh 10 times and check button exists"
 */
export const LOGIN_SIGNIN_SOAK_CONFIG: SoakTestConfig = {
  testId: 'GF-SOAK-LOGIN-10X',
  runs: 10,
  url: '/login',
  assertions: [
    // Assertion 1: Sign In text exists
    (html: string) => html.includes('Sign In') || html.includes('sign in'),
    // Assertion 2: Submit button exists
    (html: string) => html.includes('type="submit"') || html.includes("type='submit'"),
    // Assertion 3: Form exists
    (html: string) => html.includes('<form'),
    // Assertion 4: Email input exists
    (html: string) => html.includes('type="email"') || html.includes("type='email'"),
    // Assertion 5: Password input exists
    (html: string) => html.includes('type="password"') || html.includes("type='password'"),
  ],
  assertionNames: [
    'Sign In text present',
    'Submit button present',
    'Form element present',
    'Email input present',
    'Password input present',
  ],
}

/**
 * Run all registered soak tests
 */
export async function runAllSoakTests(baseUrl: string): Promise<SoakTestResult[]> {
  const results: SoakTestResult[] = []

  // Run Login Sign In soak test
  results.push(await runSoakTest(baseUrl, LOGIN_SIGNIN_SOAK_CONFIG))

  // Add more soak tests here as incidents are registered

  return results
}

/**
 * Get aggregate soak status
 */
export function aggregateSoakResults(results: SoakTestResult[]): {
  runs: number
  passed: number
  failed: number
  status: 'PASS' | 'FAIL'
} {
  const runs = results.reduce((sum, r) => sum + r.runs, 0)
  const passed = results.reduce((sum, r) => sum + r.passed, 0)
  const failed = results.reduce((sum, r) => sum + r.failed, 0)

  return {
    runs,
    passed,
    failed,
    status: failed === 0 ? 'PASS' : 'FAIL',
  }
}
