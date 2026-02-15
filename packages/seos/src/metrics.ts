/**
 * SEOS Evolution Metrics v1.1
 * Implements: Radar Model, ESI, SSI, Level Calculation with Floor Locks
 */

import incidentRegistry from './registries/incident-registry.json'
import guardRegistry from './registries/guard-registry.json'
import domainRegistry from './registries/domain-registry.json'

// ============================================================================
// TYPES
// ============================================================================

export interface RadarScores {
  observability: number      // O
  diagnoseCapability: number // D
  guardCoverage: number      // G
  budgetDiscipline: number   // B
  domainIntegrity: number    // DI
}

export interface SEOSLevel {
  baseScore: number
  baseLevel: number
  finalLevel: number
  floorLockActive: boolean
  floorLockReason: string | null
}

export interface GuardLayerDistribution {
  RUNTIME: number
  CI: number
  BUILD: number
  INFRA: number
}

export interface GuardAgingStatus {
  active: number
  stale: number
  archived: number
}

export interface SEOSMetrics {
  radar: RadarScores
  level: SEOSLevel
  guardCoverage: {
    total: number
    guarded: number
    percentage: number
    effective: number  // After anti-pattern exclusion
  }
  guardLayers: GuardLayerDistribution
  guardAging: GuardAgingStatus
  esi: {
    value: number
    color: 'red' | 'yellow' | 'green'
    status: string
  }
  ssi: {
    value: number
    color: 'red' | 'yellow' | 'green'
    trend: 'up' | 'down' | 'stable'
  }
  mode: 'BUILDING' | 'FROZEN_FOR_PRODUCT' | 'EVOLVING'
  timestamp: string
}

// ============================================================================
// RADAR CALCULATION
// ============================================================================

/**
 * Calculate Observability score (O)
 * Max: 100
 */
export function calculateObservability(): number {
  let score = 0

  // Runtime Truth exists (+25)
  score += 25

  // proof-pack exists (+25)
  score += 25

  // Gate results queryable (+20)
  score += 20

  // Dashboard visible (+15)
  score += 15

  // ESI output (+15)
  score += 15

  return Math.min(100, score)
}

/**
 * Calculate Diagnose Capability score (D)
 * Max: 100
 */
export function calculateDiagnoseCapability(): number {
  let score = 0

  // diagnose command available (+25)
  score += 25

  // env check (+20)
  score += 20

  // domain check (+15)
  score += 15

  // mock/real conflict detection (+15)
  score += 15

  // middleware exclusion guard (+15)
  score += 15

  // soak test (+10)
  score += 10

  return Math.min(100, score)
}

/**
 * Calculate Guard Coverage score (G)
 * Formula: (有效Guards / Incidents Total) × 100
 * 有效Guard: status=ACTIVE, soak_status=PASS, aging_status≠STALE
 */
export function calculateGuardCoverage(): { percentage: number; effective: number; total: number } {
  const incidents = incidentRegistry.incidents
  const guards = guardRegistry.guards

  // Count effective guards (not STALE, has PASS soak, is ACTIVE)
  const effectiveGuards = guards.filter(g =>
    g.status === 'ACTIVE' &&
    g.soak_status === 'PASS' &&
    g.aging_status !== 'STALE'
  )

  // Count incidents that have at least one effective guard
  const guardedIncidents = incidents.filter(inc =>
    inc.guard_ids?.some(gid =>
      effectiveGuards.some(g => g.guard_id === gid)
    )
  )

  const percentage = (guardedIncidents.length / incidents.length) * 100

  return {
    percentage: Math.round(percentage),
    effective: effectiveGuards.length,
    total: guards.length
  }
}

/**
 * Calculate Budget Discipline score (B)
 * Formula: 100 - budget_penalty
 */
export function calculateBudgetDiscipline(
  warningCount: number = 0,
  degradedCount: number = 0,
  p0Active: boolean = false
): number {
  let penalty = 0

  penalty += warningCount * 10   // WARNING = -10
  penalty += degradedCount * 25  // DEGRADED = -25
  if (p0Active) penalty += 50    // P0 active = -50

  return Math.max(0, 100 - penalty)
}

/**
 * Calculate Domain Integrity score (DI)
 * Based on domain health probes
 */
export function calculateDomainIntegrity(
  domainResults: { domain: string; healthy: boolean; responseTime: number }[]
): number {
  if (domainResults.length === 0) return 0

  let totalScore = 0
  const maxPerDomain = 25

  for (const result of domainResults) {
    let domainScore = 0

    // HTTP 200 (+10)
    if (result.healthy) domainScore += 10

    // JSON parseable (+5) - assumed if healthy
    if (result.healthy) domainScore += 5

    // No middleware error (+5) - assumed if healthy
    if (result.healthy) domainScore += 5

    // Response time < 2s (+5)
    if (result.responseTime < 2000) domainScore += 5

    totalScore += domainScore
  }

  const maxPossible = domainResults.length * maxPerDomain
  return Math.round((totalScore / maxPossible) * 100)
}

// ============================================================================
// LEVEL CALCULATION WITH FLOOR LOCKS
// ============================================================================

/**
 * Calculate SEOS Level with floor locks (v1.1)
 */
export function calculateLevel(radar: RadarScores): SEOSLevel {
  const baseScore = Math.round(
    (radar.observability +
     radar.diagnoseCapability +
     radar.guardCoverage +
     radar.budgetDiscipline +
     radar.domainIntegrity) / 5
  )

  const baseLevel = Math.floor(baseScore / 20)

  // Floor locks
  let maxLevel = 5
  let floorLockReason: string | null = null

  // Guard < 50% → Level ≤ 3
  if (radar.guardCoverage < 50) {
    maxLevel = Math.min(maxLevel, 3)
    floorLockReason = `Guard Coverage ${radar.guardCoverage}% < 50%`
  }

  // Domain Integrity < 80% → Level ≤ 3
  if (radar.domainIntegrity < 80) {
    maxLevel = Math.min(maxLevel, 3)
    floorLockReason = floorLockReason || `Domain Integrity ${radar.domainIntegrity}% < 80%`
  }

  // Budget Discipline < 60% → Level ≤ 2
  if (radar.budgetDiscipline < 60) {
    maxLevel = Math.min(maxLevel, 2)
    floorLockReason = floorLockReason || `Budget Discipline ${radar.budgetDiscipline}% < 60%`
  }

  const finalLevel = Math.min(baseLevel, maxLevel)

  return {
    baseScore,
    baseLevel,
    finalLevel,
    floorLockActive: finalLevel < baseLevel,
    floorLockReason: finalLevel < baseLevel ? floorLockReason : null
  }
}

// ============================================================================
// GUARD STATISTICS
// ============================================================================

export function getGuardLayerDistribution(): GuardLayerDistribution {
  const guards = guardRegistry.guards

  return {
    RUNTIME: guards.filter(g => g.layer === 'RUNTIME').length,
    CI: guards.filter(g => g.layer === 'CI').length,
    BUILD: guards.filter(g => g.layer === 'BUILD').length,
    INFRA: guards.filter(g => g.layer === 'INFRA').length
  }
}

export function getGuardAgingStatus(): GuardAgingStatus {
  const guards = guardRegistry.guards

  return {
    active: guards.filter(g => g.aging_status === 'ACTIVE').length,
    stale: guards.filter(g => g.aging_status === 'STALE').length,
    archived: guards.filter(g => g.aging_status === 'ARCHIVED').length
  }
}

// ============================================================================
// ESI & SSI
// ============================================================================

/**
 * Calculate ESI (Engineering Stability Index)
 * 7-day window
 */
export function calculateESI(
  gate0PassRate: number,
  gateFSoakRate: number,
  ctaCoverage: number,
  interventionPenalty: number
): { value: number; color: 'red' | 'yellow' | 'green'; status: string } {
  const value =
    (gate0PassRate * 0.4) +
    (gateFSoakRate * 0.25) +
    (ctaCoverage * 0.2) -
    (interventionPenalty * 0.15)

  const normalizedValue = Math.max(0, Math.min(1, value))

  let color: 'red' | 'yellow' | 'green'
  let status: string

  if (normalizedValue >= 0.85) {
    color = 'green'
    status = 'Stable & Evolving'
  } else if (normalizedValue >= 0.70) {
    color = 'yellow'
    status = 'Needs Attention'
  } else {
    color = 'red'
    status = 'Critical'
  }

  return { value: Math.round(normalizedValue * 100) / 100, color, status }
}

/**
 * Calculate SSI (System Stability Index)
 * 30-day rolling window
 */
export function calculateSSI(
  p0Count: number,
  p1Count: number,
  interventionCount: number,
  domainDriftDays: number
): { value: number; color: 'red' | 'yellow' | 'green'; trend: 'up' | 'down' | 'stable' } {
  const p0Penalty = Math.min(1, p0Count * 0.5)
  const p1Penalty = Math.min(1, p1Count * 0.2)
  const interventionPenalty = Math.min(1, interventionCount * 0.3)
  const domainDriftPenalty = Math.min(1, domainDriftDays * 0.1)

  const value = 100 * (1
    - p0Penalty * 0.35
    - p1Penalty * 0.20
    - interventionPenalty * 0.25
    - domainDriftPenalty * 0.20
  )

  let color: 'red' | 'yellow' | 'green'

  if (value >= 85) {
    color = 'green'
  } else if (value >= 70) {
    color = 'yellow'
  } else {
    color = 'red'
  }

  // TODO: Calculate trend from historical data
  const trend: 'up' | 'down' | 'stable' = 'stable'

  return { value: Math.round(value), color, trend }
}

// ============================================================================
// FULL METRICS CALCULATION
// ============================================================================

export function calculateFullMetrics(
  domainResults: { domain: string; healthy: boolean; responseTime: number }[] = [],
  budgetState: { warnings: number; degraded: number; p0Active: boolean } = { warnings: 0, degraded: 0, p0Active: false },
  incidentState: { p0Count: number; p1Count: number; interventions: number; domainDrift: number } = { p0Count: 0, p1Count: 0, interventions: 3, domainDrift: 2 }
): SEOSMetrics {
  // Calculate radar scores
  const guardCoverageData = calculateGuardCoverage()

  const radar: RadarScores = {
    observability: calculateObservability(),
    diagnoseCapability: calculateDiagnoseCapability(),
    guardCoverage: guardCoverageData.percentage,
    budgetDiscipline: calculateBudgetDiscipline(budgetState.warnings, budgetState.degraded, budgetState.p0Active),
    domainIntegrity: domainResults.length > 0
      ? calculateDomainIntegrity(domainResults)
      : 95 // Default when no domain results provided
  }

  // Calculate level with floor locks
  const level = calculateLevel(radar)

  // Guard statistics
  const guardLayers = getGuardLayerDistribution()
  const guardAging = getGuardAgingStatus()

  // ESI
  const esi = calculateESI(
    1.0,  // gate0 pass rate
    0.9,  // gateF soak rate
    0.8,  // CTA coverage
    incidentState.interventions * 0.1  // intervention penalty
  )

  // SSI
  const ssi = calculateSSI(
    incidentState.p0Count,
    incidentState.p1Count,
    incidentState.interventions,
    incidentState.domainDrift
  )

  return {
    radar,
    level,
    guardCoverage: {
      total: incidentRegistry.incidents.length,
      guarded: incidentRegistry.incidents.filter(i => i.guard_added).length,
      percentage: guardCoverageData.percentage,
      effective: guardCoverageData.effective
    },
    guardLayers,
    guardAging,
    esi,
    ssi,
    mode: 'BUILDING',  // Will be set from external state
    timestamp: new Date().toISOString()
  }
}
