import { NextResponse } from 'next/server'
import { getSeosStatus, getInterventions, type Intervention } from '@/lib/intervention-counter'

/**
 * GET /api/seos - SEOS Governance Diagnostics
 *
 * Returns:
 * - compliant: true if no CEO interventions required
 * - intervention_count: number of unresolved intervention points
 * - interventions: list of all tracked interventions
 * - self_healing: stats on auto-resolved issues
 */
export async function GET() {
  const status = getSeosStatus()
  const interventions = getInterventions()

  return NextResponse.json({
    seos_version: '1.0',
    compliant: status.compliant,
    intervention_count: status.unresolvedCount,
    self_healed_count: status.selfHealedCount,
    total_interventions: status.totalInterventions,

    // Governance rules
    rules: {
      env_補: 'CTO self-resolves via mock storage or explicit error',
      token_provision: 'CTO handles via OAuth flow or service accounts',
      manual_merge: 'CI/CD handles all merges',
      manual_restart: 'Process manager handles restarts',
      manual_test: 'Gate 0 script handles verification',
    },

    // Recent interventions (for audit)
    recent_interventions: interventions.slice(-10).map((i: Intervention) => ({
      type: i.type,
      description: i.description,
      timestamp: i.timestamp,
      resolved: i.resolved,
      resolution: i.resolution,
    })),

    timestamp: new Date().toISOString(),
  })
}
