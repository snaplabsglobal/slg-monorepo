/**
 * GateF Incident Registry（事故注册表）
 *
 * 所有 P0/P1 必须登记，结构化清单。
 * 规则：凡是发生过的 P0/P1 事故，都必须被转换成可自动执行的 Guard。
 */

export type Severity = 'P0' | 'P1' | 'P2'
export type GuardType = 'config' | 'runtime' | 'ui' | 'e2e'
export type GuardStatus = 'PASS' | 'FAIL' | 'SKIP'
export type TestType = 'soak' | 'e2e' | 'unit'

export interface Guard {
  id: string
  type: GuardType
  status: GuardStatus
  note: string
}

export interface Test {
  id: string
  type: TestType
  status: GuardStatus
  runs?: number
  passed?: number
  failed?: number
}

export interface Incident {
  incident_id: string
  date: string
  title: string
  severity: Severity
  root_cause_tag: string
  root_cause: string
  guards: Guard[]
  tests: Test[]
  self_heal_log_ref: string
}

/**
 * Incident Registry - All recorded incidents
 */
export const INCIDENT_REGISTRY: Incident[] = [
  {
    incident_id: 'INC-2026-02-14-login-signin-missing',
    date: '2026-02-14',
    title: 'Login Sign In Button Missing',
    severity: 'P0',
    root_cause_tag: 'TAILWIND_CONTENT_PATH_MISSING',
    root_cause: 'tailwind.config.ts 未包含 snap-auth package → CSS class 未生成 → 按钮不可见',
    guards: [
      {
        id: 'GF-GUARD-TAILWIND-CONTENT',
        type: 'config',
        status: 'PASS',
        note: 'tailwind.config.ts includes packages/snap-auth/**',
      },
      {
        id: 'GF-GUARD-CTA-LOGIN-SIGNIN',
        type: 'ui',
        status: 'PASS',
        note: 'Sign In button visible on /login (Gate G)',
      },
    ],
    tests: [
      {
        id: 'GF-SOAK-LOGIN-10X',
        type: 'soak',
        status: 'PASS',
        runs: 10,
        passed: 10,
        failed: 0,
      },
    ],
    self_heal_log_ref: 'app/lib/self-heal-log.ts#SH-2026-001',
  },
]

/**
 * Get all incidents
 */
export function getIncidents(): Incident[] {
  return [...INCIDENT_REGISTRY]
}

/**
 * Get incident by ID
 */
export function getIncident(incidentId: string): Incident | null {
  return INCIDENT_REGISTRY.find(i => i.incident_id === incidentId) || null
}

/**
 * Get incidents by severity
 */
export function getIncidentsBySeverity(severity: Severity): Incident[] {
  return INCIDENT_REGISTRY.filter(i => i.severity === severity)
}

/**
 * Check if all P0 incidents have guards
 */
export function allP0HaveGuards(): boolean {
  const p0s = getIncidentsBySeverity('P0')
  return p0s.every(i => i.guards.length > 0)
}

/**
 * Check if all P0 incidents have tests
 */
export function allP0HaveTests(): boolean {
  const p0s = getIncidentsBySeverity('P0')
  return p0s.every(i => i.tests.length > 0)
}

/**
 * Get coverage statistics
 */
export function getCoverageStats(): {
  total: number
  covered: number
  guardsAdded: number
  testsAdded: number
} {
  const incidents = getIncidents()
  const covered = incidents.filter(i => i.guards.length > 0 && i.tests.length > 0).length
  const guardsAdded = incidents.reduce((sum, i) => sum + i.guards.length, 0)
  const testsAdded = incidents.reduce((sum, i) => sum + i.tests.length, 0)

  return {
    total: incidents.length,
    covered,
    guardsAdded,
    testsAdded,
  }
}
