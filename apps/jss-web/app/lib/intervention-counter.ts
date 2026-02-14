/**
 * Intervention Counter - SEOS Governance Metric
 *
 * Tracks when CEO has to manually intervene in runtime/env issues.
 * Under SEOS governance, this counter should always be 0.
 *
 * Types of interventions tracked:
 * - env_补: Manual environment variable provision
 * - token_provision: Manual auth token provision
 * - manual_merge: Manual merge instead of automated
 * - manual_restart: Manual server restart
 * - manual_test: Manual testing feedback required
 *
 * Usage:
 *   import { recordIntervention, getInterventionCount } from '@/app/lib/intervention-counter'
 *
 *   // When detecting a situation that would require CEO intervention:
 *   recordIntervention('env_补', 'Missing R2 credentials')
 *
 *   // Check if we're SEOS compliant (count should be 0)
 *   const count = getInterventionCount()
 */

export type InterventionType =
  | 'env_补'           // Manual environment variable provision
  | 'token_provision'  // Manual auth token provision
  | 'manual_merge'     // Manual merge instead of automated
  | 'manual_restart'   // Manual server restart
  | 'manual_test'      // Manual testing feedback required
  | 'config_fix'       // Manual configuration fix
  | 'other'            // Other interventions

export interface Intervention {
  type: InterventionType
  description: string
  timestamp: string
  resolved: boolean
  resolution?: string
}

// In-memory storage (for single server instance)
// Production: Use database or external storage
let interventions: Intervention[] = []

/**
 * Record a potential intervention point
 * Call this when detecting a situation that would traditionally require CEO help
 */
export function recordIntervention(
  type: InterventionType,
  description: string
): void {
  interventions.push({
    type,
    description,
    timestamp: new Date().toISOString(),
    resolved: false,
  })

  // Log for visibility
  console.warn(`[SEOS] Intervention point detected: ${type} - ${description}`)
}

/**
 * Mark an intervention as self-resolved
 * Call this when the system auto-heals without CEO help
 */
export function resolveIntervention(
  type: InterventionType,
  resolution: string
): void {
  const intervention = interventions.find(i => i.type === type && !i.resolved)
  if (intervention) {
    intervention.resolved = true
    intervention.resolution = resolution
    console.log(`[SEOS] Self-healed: ${type} - ${resolution}`)
  }
}

/**
 * Get count of unresolved interventions
 * Under SEOS governance, this should always be 0
 */
export function getInterventionCount(): number {
  return interventions.filter(i => !i.resolved).length
}

/**
 * Get all interventions (for diagnostics)
 */
export function getInterventions(): Intervention[] {
  return [...interventions]
}

/**
 * Clear all interventions (for testing)
 */
export function clearInterventions(): void {
  interventions = []
}

/**
 * Check SEOS compliance
 * Returns true if no unresolved interventions
 */
export function isSeosCompliant(): boolean {
  return getInterventionCount() === 0
}

/**
 * Get SEOS status summary
 */
export function getSeosStatus(): {
  compliant: boolean
  unresolvedCount: number
  totalInterventions: number
  selfHealedCount: number
} {
  const unresolved = interventions.filter(i => !i.resolved)
  const selfHealed = interventions.filter(i => i.resolved)

  return {
    compliant: unresolved.length === 0,
    unresolvedCount: unresolved.length,
    totalInterventions: interventions.length,
    selfHealedCount: selfHealed.length,
  }
}
