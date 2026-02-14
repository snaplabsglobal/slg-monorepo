/**
 * GateF - Regression Memory Layer（退化记忆层）
 *
 * 定义：凡是发生过的 P0/P1 事故，都必须被转换成可自动执行的 Guard。
 *       发生一次，永不再发生。
 *
 * 职责：保证系统"不会退化"（后向免疫）
 */

export * from './incident-registry'
export * from './soak-test'

import {
  getIncidents,
  getCoverageStats,
  type Incident,
} from './incident-registry'
import {
  runAllSoakTests,
  aggregateSoakResults,
  type SoakTestResult,
} from './soak-test'

/**
 * GateF JSON Schema v1 (冻结版)
 */
export interface GateFJson {
  schema: 'seos.gatef.v1'
  app: string
  env: string
  git: {
    sha: string
    branch: string
  }
  timestamp: string
  summary: {
    status: 'PASS' | 'FAIL'
    incidents_total: number
    incidents_covered: number
    guards_added: number
    tests_added: number
    soak: {
      runs: number
      passed: number
      failed: number
    }
    missing: {
      incidents: number
      cta: string[]
    }
  }
  incidents: Incident[]
}

/**
 * Generate GateF JSON output
 *
 * PASS/FAIL 规则:
 * - FAIL: incidents_covered < incidents_total
 * - FAIL: 任意 P0 没有至少 1 个 Guard
 * - FAIL: 任意 P0 没有至少 1 个 Test
 * - FAIL: soak.failed > 0
 * - PASS: 全部满足
 */
export async function generateGateFJson(
  baseUrl: string,
  env: string,
  gitSha: string,
  gitBranch: string
): Promise<GateFJson> {
  const incidents = getIncidents()
  const stats = getCoverageStats()

  // Run soak tests
  const soakResults = await runAllSoakTests(baseUrl)
  const soakAggregate = aggregateSoakResults(soakResults)

  // Update incident soak results
  for (const incident of incidents) {
    for (const test of incident.tests) {
      const soakResult = soakResults.find(r => r.testId === test.id)
      if (soakResult) {
        test.status = soakResult.status
        test.runs = soakResult.runs
        test.passed = soakResult.passed
        test.failed = soakResult.failed
      }
    }
  }

  // Determine overall status
  const missingCta: string[] = []

  // Check P0 coverage
  const p0Incidents = incidents.filter(i => i.severity === 'P0')
  for (const p0 of p0Incidents) {
    if (p0.guards.length === 0) {
      missingCta.push(`${p0.incident_id}: Missing guard`)
    }
    if (p0.tests.length === 0) {
      missingCta.push(`${p0.incident_id}: Missing test`)
    }
  }

  // Determine status
  let status: 'PASS' | 'FAIL' = 'PASS'

  if (stats.covered < stats.total) status = 'FAIL'
  if (missingCta.length > 0) status = 'FAIL'
  if (soakAggregate.failed > 0) status = 'FAIL'

  return {
    schema: 'seos.gatef.v1',
    app: 'jss-web',
    env,
    git: {
      sha: gitSha,
      branch: gitBranch,
    },
    timestamp: new Date().toISOString(),
    summary: {
      status,
      incidents_total: stats.total,
      incidents_covered: stats.covered,
      guards_added: stats.guardsAdded,
      tests_added: stats.testsAdded,
      soak: soakAggregate,
      missing: {
        incidents: stats.total - stats.covered,
        cta: missingCta,
      },
    },
    incidents,
  }
}

/**
 * Quick GateF status check (without running soak tests)
 */
export function getGateFQuickStatus(): {
  incidents_total: number
  incidents_covered: number
  guards_added: number
  tests_added: number
} {
  const stats = getCoverageStats()
  return {
    incidents_total: stats.total,
    incidents_covered: stats.covered,
    guards_added: stats.guardsAdded,
    tests_added: stats.testsAdded,
  }
}
