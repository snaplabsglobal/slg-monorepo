/**
 * Self-Rescue Mode Selectors
 *
 * Pure functions for computing derived state
 * Core principle: photoAssignment is the single source of truth
 */

import type { UnitId } from './types'
import { useRescueStore } from './store'

/**
 * Get distribution of units in a session
 */
export function getSessionDistribution(
  photoIds: string[],
  assignment: Record<string, UnitId>
): Map<UnitId, number> {
  const counts = new Map<UnitId, number>()
  for (const pid of photoIds) {
    const u = assignment[pid] ?? null
    counts.set(u, (counts.get(u) ?? 0) + 1)
  }
  return counts
}

/**
 * Compute majority unit in a session
 */
export function computeMajority(
  photoIds: string[],
  assignment: Record<string, UnitId>
) {
  const counts = getSessionDistribution(photoIds, assignment)
  let maj: UnitId = null
  let majCount = 0
  for (const [u, c] of counts.entries()) {
    if (c > majCount) {
      maj = u
      majCount = c
    }
  }
  const total = photoIds.length || 1
  const ratio = majCount / total
  return {
    counts,
    majorityUnit: maj,
    majorityCount: majCount,
    majorityRatio: ratio,
  }
}

/**
 * Auto-pick minority photos for Fix flow
 * Only triggers when majority >= 70%
 */
export function computeAutoPickMinority(
  photoIds: string[],
  assignment: Record<string, UnitId>
) {
  const { majorityUnit, majorityRatio } = computeMajority(photoIds, assignment)

  if (majorityRatio < 0.7) {
    return {
      autoPick: false,
      selected: [] as string[],
      majorityUnit,
      majorityRatio,
    }
  }

  const selected = photoIds.filter(
    (pid) => (assignment[pid] ?? null) !== majorityUnit
  )

  return { autoPick: true, selected, majorityUnit, majorityRatio }
}

/**
 * Order unit buttons with sticky destination first
 */
export function orderUnitButtons(
  base: Array<Exclude<UnitId, null>>,
  sticky?: UnitId
): Array<Exclude<UnitId, null>> {
  if (sticky == null) return base
  const filtered = base.filter((u) => u !== sticky)
  return [sticky as Exclude<UnitId, null>, ...filtered]
}

/**
 * Hook to get bucket UI state
 */
export function useBucketUI(bucketId: string) {
  return useRescueStore((s) => s.bucketUIState[bucketId] ?? {})
}

/**
 * Count minority photos (not matching majority)
 */
export function countMinorityPhotos(
  photoIds: string[],
  assignment: Record<string, UnitId>
): number {
  const { majorityUnit, majorityRatio } = computeMajority(photoIds, assignment)

  if (majorityRatio < 0.7) return 0

  return photoIds.filter((pid) => (assignment[pid] ?? null) !== majorityUnit)
    .length
}
