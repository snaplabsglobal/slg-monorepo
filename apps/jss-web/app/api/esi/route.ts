import { NextResponse } from 'next/server'
import { getCurrentESI, getESIDisplay, meetsReleaseThreshold } from '@/lib/esi'

/**
 * GET /api/esi - Engineering Stability Index
 *
 * CEO Dashboard 显示:
 *   ESI: 78% 🟡 → (Watch Zone)
 *
 * ESI 组成:
 *   - Gate0 Pass Rate (40%)
 *   - GateF Soak Rate (25%)
 *   - CTA Coverage (20%)
 *   - Intervention Penalty (15%)
 *
 * Import Mode 发布门槛: ESI ≥ 0.85 连续 5 天
 */
export async function GET() {
  const esi = getCurrentESI()
  const display = getESIDisplay(esi)
  const releaseReady = meetsReleaseThreshold(esi)

  return NextResponse.json({
    schema: 'seos.esi.v1',
    app: 'jss-web',

    // Dashboard display (CEO 视角)
    dashboard: {
      value: display.value,
      color: display.color_emoji,
      trend: display.trend_arrow,
      status: display.status,
      release_ready: releaseReady,
    },

    // Detailed breakdown
    detail: {
      value: esi.value,
      color: esi.color,
      trend: esi.trend,
      breakdown: esi.breakdown,
    },

    // Release criteria
    release_criteria: {
      esi_threshold: 0.85,
      consecutive_days_required: 5,
      current_meets_threshold: releaseReady,
      note: releaseReady
        ? 'ESI meets threshold - continue monitoring for 5 consecutive days'
        : 'ESI below threshold - focus on stability before Import Mode release',
    },

    // Weights explanation
    weights: {
      gate0_pass_rate: '40%',
      gatef_soak_rate: '25%',
      cta_coverage: '20%',
      intervention_penalty: '15%',
    },

    timestamp: esi.timestamp,
  })
}
