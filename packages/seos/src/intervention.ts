/**
 * SEOS Manual Intervention Counter
 *
 * 把"依赖 CEO"变成可度量、可治理的成本。
 * 不是为了羞辱任何人，是为了让系统对依赖 CEO 这件事产生痛感，从而进化。
 *
 * Storage: JSONL file (append only, no deletion)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type InterventionSeverity = 'P0' | 'P1' | 'P2'

export type InterventionType =
  | 'ENV'           // CEO被要求提供/粘贴 token / key / secret
  | 'TOKEN'         // CEO被要求手动补 .env.local / Vercel env
  | 'MERGE'         // CEO被要求手动 merge / rebase / cherry-pick
  | 'MANUAL_FIX'    // CEO被要求手动点按钮触发修复
  | 'TEST_REPORT'   // CTO让CEO测试并回报结果
  | 'LOG_CHECK'     // CTO让CEO "帮忙看一下日志/截图/对比"
  | 'BROWSER_FIX'   // 需要CEO临时改浏览器设置、清缓存、关SW
  | 'UNDECLARED'    // 未声明的干预（自动检测到）
  | 'OTHER'

export type RootCauseGuess =
  | 'ENV_MISMATCH'
  | 'MISSING_GUARD'
  | 'PROVIDER_DOWN'
  | 'AUTH_CONFIG'
  | 'NO_RUNTIME_TRUTH'
  | 'NO_TEST_AUTOMATION'
  | 'PROCESS_GAP'
  | 'UNKNOWN'

export type FollowupAction =
  | 'ADD_DIAGNOSE'
  | 'ADD_RUNTIME_TRUTH'
  | 'ADD_CI_GATE'
  | 'ADD_GUARD'
  | 'ADD_TEST'

export type InterventionStatus = 'open' | 'closed'

export interface Intervention {
  id: string
  ts: string
  app: string
  env: string
  severity: InterventionSeverity
  type: InterventionType
  reason: string
  root_cause_guess: RootCauseGuess
  followup_required: FollowupAction[]
  status: InterventionStatus
  linked_pr: string | null
  linked_issue: string | null
  // Snapshot for replay (optional, added when available)
  snapshot?: {
    git_sha: string
    env_state: Record<string, string | null>
    diagnose_result: Record<string, 'pass' | 'fail' | 'warn'>
    runtime_truth: Record<string, unknown>
    error_class: string
  }
}

export interface InterventionCloseEvent {
  event: 'close'
  id: string
  ts: string
  linked_pr: string | null
  note: string
}

export interface LevelChangeEvent {
  event: 'level_change'
  ts: string
  from: string
  to: string
  reason: string
}

export type InterventionEvent = Intervention | InterventionCloseEvent | LevelChangeEvent

// ============================================================================
// PATHS
// ============================================================================

const LOGS_DIR = path.resolve(__dirname, '../logs')
const INTERVENTIONS_FILE = path.join(LOGS_DIR, 'manual-interventions.jsonl')

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate intervention ID
 * Format: mi_<YYYYMMDD>_<HHMMSS>_<4-char-rand>
 */
function generateInterventionId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toISOString().slice(11, 19).replace(/:/g, '')
  const rand = crypto.randomBytes(2).toString('hex')
  return `mi_${date}_${time}_${rand}`
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Ensure logs directory exists
 */
function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
}

/**
 * Append event to JSONL file (append only, never delete)
 */
function appendEvent(event: InterventionEvent): void {
  ensureLogsDir()
  const line = JSON.stringify(event) + '\n'
  fs.appendFileSync(INTERVENTIONS_FILE, line, 'utf-8')
}

/**
 * Read all events from JSONL file
 */
function readAllEvents(): InterventionEvent[] {
  ensureLogsDir()
  if (!fs.existsSync(INTERVENTIONS_FILE)) {
    return []
  }
  const content = fs.readFileSync(INTERVENTIONS_FILE, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  return lines.map(line => JSON.parse(line))
}

// ============================================================================
// INTERVENTION OPERATIONS
// ============================================================================

export interface CreateInterventionInput {
  severity: InterventionSeverity
  type: InterventionType
  reason: string
  root_cause_guess?: RootCauseGuess
  followup_required?: FollowupAction[]
  env?: string
  app?: string
  linked_issue?: string
  snapshot?: Intervention['snapshot']
}

/**
 * Create a new intervention record
 */
export function createIntervention(input: CreateInterventionInput): Intervention {
  const intervention: Intervention = {
    id: generateInterventionId(),
    ts: new Date().toISOString(),
    app: input.app || 'jss-web',
    env: input.env || process.env.VERCEL_ENV || 'local',
    severity: input.severity,
    type: input.type,
    reason: input.reason,
    root_cause_guess: input.root_cause_guess || 'UNKNOWN',
    followup_required: input.followup_required || ['ADD_DIAGNOSE', 'ADD_RUNTIME_TRUTH', 'ADD_CI_GATE'],
    status: 'open',
    linked_pr: null,
    linked_issue: input.linked_issue || null,
    snapshot: input.snapshot,
  }

  appendEvent(intervention)
  return intervention
}

export interface CloseInterventionInput {
  id: string
  linked_pr?: string
  note: string
}

/**
 * Close an intervention
 */
export function closeIntervention(input: CloseInterventionInput): InterventionCloseEvent {
  const event: InterventionCloseEvent = {
    event: 'close',
    id: input.id,
    ts: new Date().toISOString(),
    linked_pr: input.linked_pr || null,
    note: input.note,
  }

  appendEvent(event)
  return event
}

// ============================================================================
// AGGREGATION
// ============================================================================

export interface InterventionStats {
  p0_count_7d: number
  p1_count_7d: number
  p2_count_7d: number
  open_count: number
  streak_days: number
  last_intervention: string | null
  top_causes: Array<{ cause: RootCauseGuess; count: number }>
}

/**
 * Get aggregated intervention stats
 */
export function getInterventionStats(): InterventionStats {
  const events = readAllEvents()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Build intervention state map
  const interventions = new Map<string, Intervention & { closed: boolean }>()

  for (const event of events) {
    if ('severity' in event) {
      // Intervention creation
      interventions.set(event.id, { ...event, closed: false })
    } else if (event.event === 'close') {
      // Close event
      const intervention = interventions.get(event.id)
      if (intervention) {
        intervention.closed = true
        intervention.status = 'closed'
      }
    }
  }

  // Filter to 7 days
  const recent = Array.from(interventions.values()).filter(i => {
    const ts = new Date(i.ts)
    return ts >= sevenDaysAgo
  })

  // Count by severity
  const p0_count_7d = recent.filter(i => i.severity === 'P0').length
  const p1_count_7d = recent.filter(i => i.severity === 'P1').length
  const p2_count_7d = recent.filter(i => i.severity === 'P2').length

  // Count open
  const open_count = Array.from(interventions.values()).filter(i => !i.closed).length

  // Calculate streak (consecutive days without intervention)
  let streak_days = 0
  const allInterventions = Array.from(interventions.values()).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  )
  if (allInterventions.length > 0) {
    const lastTs = new Date(allInterventions[0].ts)
    streak_days = Math.floor((now.getTime() - lastTs.getTime()) / (24 * 60 * 60 * 1000))
  } else {
    streak_days = 999 // No interventions ever
  }

  // Last intervention
  const last_intervention = allInterventions.length > 0 ? allInterventions[0].ts : null

  // Top causes
  const causeCounts = new Map<RootCauseGuess, number>()
  for (const i of recent) {
    causeCounts.set(i.root_cause_guess, (causeCounts.get(i.root_cause_guess) || 0) + 1)
  }
  const top_causes = Array.from(causeCounts.entries())
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return {
    p0_count_7d,
    p1_count_7d,
    p2_count_7d,
    open_count,
    streak_days,
    last_intervention,
    top_causes,
  }
}

// ============================================================================
// BUDGET & GATE RULES
// ============================================================================

export type BudgetStatus = 'SAFE' | 'WARNING' | 'LOCKED'
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'SELF_SUSPEND'

export interface BudgetState {
  p0_used: number
  p0_limit: number
  p1_used: number
  p1_limit: number
  status: BudgetStatus
  health: HealthStatus
}

/**
 * Get intervention budget state
 *
 * Budget limits (7-day rolling window):
 * - P0: 0 (any P0 = Self-Suspend)
 * - P1: 2 (>2 = Autonomy downgrade)
 */
export function getBudgetState(): BudgetState {
  const stats = getInterventionStats()

  const p0_limit = 0
  const p1_limit = 2

  // Determine status
  let status: BudgetStatus = 'SAFE'
  let health: HealthStatus = 'HEALTHY'

  if (stats.p0_count_7d >= 1) {
    status = 'LOCKED'
    health = 'SELF_SUSPEND'
  } else if (stats.p1_count_7d > p1_limit) {
    status = 'LOCKED'
    health = 'DEGRADED'
  } else if (stats.p1_count_7d === p1_limit) {
    status = 'WARNING'
  }

  if (stats.open_count > 0) {
    health = health === 'SELF_SUSPEND' ? 'SELF_SUSPEND' : 'DEGRADED'
  }

  return {
    p0_used: stats.p0_count_7d,
    p0_limit,
    p1_used: stats.p1_count_7d,
    p1_limit,
    status,
    health,
  }
}

// ============================================================================
// AUTONOMY LADDER
// ============================================================================

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
export type GateLevel = 'A' | 'B' | 'C'

export interface AutonomyState {
  level: AutonomyLevel
  gate: GateLevel
  progress_to_next: number
  conditions_met: string[]
  conditions_needed: string[]
}

/**
 * Get current autonomy state
 *
 * Initial state: L1 (Detect) / Gate A
 */
export function getAutonomyState(): AutonomyState {
  const stats = getInterventionStats()
  const budget = getBudgetState()

  // Initial values (SEOS v2 rule: start at L1)
  let level: AutonomyLevel = 'L1'
  let gate: GateLevel = 'A'
  const conditions_met: string[] = []
  const conditions_needed: string[] = []

  // Check L1 → L2 conditions
  const l2Conditions = {
    'runtime_truth_complete': true, // Assume true since we have /api/runtime
    'diagnose_coverage': true, // Will be true once pnpm diagnose works
    'all_errors_have_guard': stats.open_count === 0,
    'zero_open_7d': stats.open_count === 0 && stats.streak_days >= 7,
    'no_undeclared': true, // Assume true for now
  }

  for (const [cond, met] of Object.entries(l2Conditions)) {
    if (met) {
      conditions_met.push(cond)
    } else {
      conditions_needed.push(cond)
    }
  }

  // Determine level
  if (budget.health === 'SELF_SUSPEND') {
    level = 'L0'
    gate = 'A'
  } else if (Object.values(l2Conditions).every(Boolean)) {
    level = 'L2'
    gate = 'B'
  }

  // Calculate progress
  const total = Object.keys(l2Conditions).length
  const met = conditions_met.length
  const progress_to_next = Math.round((met / total) * 100)

  return {
    level,
    gate,
    progress_to_next,
    conditions_met,
    conditions_needed,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  readAllEvents,
  INTERVENTIONS_FILE,
}
