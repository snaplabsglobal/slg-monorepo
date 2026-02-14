/**
 * Engineering Stability Index (ESI) v1
 *
 * 目标：给 CEO 一个每日一眼可判断的信号灯。
 * 不是精确到小数点，是趋势判断：系统是在稳定进化，还是在悄悄退化。
 *
 * ESI = (Gate0_pass_rate × 0.4)
 *     + (GateF_soak_rate × 0.25)
 *     + (CTA_coverage × 0.2)
 *     - (Intervention_penalty × 0.15)
 *
 * 颜色区间:
 *   🟢 0.85 – 1.00: Stable & Evolving
 *   🟡 0.70 – 0.85: Watch Zone
 *   🔴 < 0.70: Regression Risk
 */

export type ESIColor = 'green' | 'yellow' | 'red'
export type ESITrend = 'up' | 'down' | 'stable'

export interface ESIInput {
  /** Gate0 pass rate (0-1) - last 7 days */
  gate0PassRate: number
  /** GateF soak rate (0-1) - soak test pass rate */
  gateFSoakRate: number
  /** CTA coverage (0-1) - key call-to-action assertion coverage */
  ctaCoverage: number
  /** P0 intervention count - last 7 days */
  p0Count: number
  /** P1 intervention count - last 7 days */
  p1Count: number
}

export interface ESIResult {
  /** ESI value (0-1) */
  value: number
  /** Color indicator */
  color: ESIColor
  /** Trend direction */
  trend: ESITrend
  /** Breakdown of components */
  breakdown: {
    gate0_contribution: number
    gatef_contribution: number
    cta_contribution: number
    intervention_penalty: number
  }
  /** Human readable status */
  status: string
  /** Timestamp */
  timestamp: string
}

// ESI weights (from spec)
const WEIGHTS = {
  gate0: 0.4,
  gatef: 0.25,
  cta: 0.2,
  intervention: 0.15,
}

// Color thresholds
const THRESHOLDS = {
  green: 0.85,
  yellow: 0.70,
}

/**
 * Calculate ESI from inputs
 */
export function calculateESI(input: ESIInput): ESIResult {
  // Calculate intervention penalty
  // Penalty = min(1, P0_count × 0.7 + P1_count × 0.3)
  const interventionPenalty = Math.min(
    1,
    input.p0Count * 0.7 + input.p1Count * 0.3
  )

  // Calculate contributions
  const gate0Contribution = input.gate0PassRate * WEIGHTS.gate0
  const gatefContribution = input.gateFSoakRate * WEIGHTS.gatef
  const ctaContribution = input.ctaCoverage * WEIGHTS.cta
  const penaltyContribution = interventionPenalty * WEIGHTS.intervention

  // Calculate ESI
  const value = Math.max(
    0,
    Math.min(
      1,
      gate0Contribution + gatefContribution + ctaContribution - penaltyContribution
    )
  )

  // Determine color
  let color: ESIColor
  if (value >= THRESHOLDS.green) {
    color = 'green'
  } else if (value >= THRESHOLDS.yellow) {
    color = 'yellow'
  } else {
    color = 'red'
  }

  // Status message
  const statusMessages: Record<ESIColor, string> = {
    green: 'Stable & Evolving',
    yellow: 'Watch Zone',
    red: 'Regression Risk',
  }

  return {
    value: Math.round(value * 100) / 100,
    color,
    trend: 'stable', // TODO: Calculate from historical data
    breakdown: {
      gate0_contribution: Math.round(gate0Contribution * 100) / 100,
      gatef_contribution: Math.round(gatefContribution * 100) / 100,
      cta_contribution: Math.round(ctaContribution * 100) / 100,
      intervention_penalty: Math.round(penaltyContribution * 100) / 100,
    },
    status: statusMessages[color],
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get current ESI estimate
 * Uses current available data to estimate ESI
 */
export function getCurrentESI(): ESIResult {
  // Current estimates based on system state
  // TODO: Replace with actual metrics collection
  const input: ESIInput = {
    // Gate0: Estimated based on recent runs
    gate0PassRate: 0.95, // Gate0 passing consistently

    // GateF: Based on soak test results
    gateFSoakRate: 1.0, // Soak tests passing

    // CTA Coverage: Based on implemented guards
    ctaCoverage: 0.6, // Login CTA covered, others pending

    // Interventions: Based on recent incidents
    p0Count: 0, // No recent P0 requiring CEO intervention
    p1Count: 0, // No recent P1
  }

  return calculateESI(input)
}

/**
 * Check if ESI meets release threshold
 * ESI ≥ 0.85 required for Import Mode release
 */
export function meetsReleaseThreshold(esi: ESIResult): boolean {
  return esi.value >= 0.85
}

/**
 * Get ESI display for dashboard
 */
export function getESIDisplay(esi: ESIResult): {
  value: string
  color_emoji: string
  trend_arrow: string
  status: string
} {
  const colorEmoji: Record<ESIColor, string> = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  }

  const trendArrow: Record<ESITrend, string> = {
    up: '↑',
    down: '↓',
    stable: '→',
  }

  return {
    value: (esi.value * 100).toFixed(0) + '%',
    color_emoji: colorEmoji[esi.color],
    trend_arrow: trendArrow[esi.trend],
    status: esi.status,
  }
}
