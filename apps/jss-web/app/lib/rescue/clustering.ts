/**
 * Self-Rescue Mode: GPS/Time Clustering
 *
 * Operates on metadata only (no image processing)
 * Outputs SUGGESTIONS only - does NOT auto-assign or name
 *
 * Two-stage algorithm:
 * Stage A: Location clustering (DBSCAN)
 * Stage B: Temporal segmentation (time gaps)
 */

import type {
  RescuePhoto,
  ClusterConfig,
  PhotoGroupSuggestion,
  BuildingBucket,
  RescueSessionSegment,
  UnitId,
  AutoPickResult,
} from './types'
import { DEFAULT_CLUSTER_CONFIG, MAJORITY_THRESHOLD } from './types'

type GeoPoint = { lat: number; lng: number }

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate lat/lng coordinates
 */
export function isValidLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  // Reject common bogus values
  if (lat === 0 && lng === 0) return false
  return true
}

/**
 * Parse ISO date string to milliseconds
 */
export function parseTimeMs(iso: string): number {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) throw new Error(`Invalid takenAtUtc: ${iso}`)
  return t
}

/**
 * Calculate minutes difference between two ISO dates
 */
export function minutesDiff(aIso: string, bIso: string): number {
  const a = parseTimeMs(aIso)
  const b = parseTimeMs(bIso)
  return Math.abs(b - a) / 60000
}

/**
 * Calculate span in minutes for a set of photos
 */
export function spanMinutes(photos: RescuePhoto[]): number {
  if (photos.length <= 1) return 0
  let min = Infinity
  let max = -Infinity
  for (const p of photos) {
    const t = parseTimeMs(p.takenAtUtc)
    if (t < min) min = t
    if (t > max) max = t
  }
  return (max - min) / 60000
}

/**
 * Get date range for a set of photos
 */
export function dateRange(photos: RescuePhoto[]): { start: string; end: string } {
  let minT = Infinity
  let maxT = -Infinity
  let minIso = photos[0]?.takenAtUtc ?? new Date(0).toISOString()
  let maxIso = minIso

  for (const p of photos) {
    const t = parseTimeMs(p.takenAtUtc)
    if (t < minT) {
      minT = t
      minIso = p.takenAtUtc
    }
    if (t > maxT) {
      maxT = t
      maxIso = p.takenAtUtc
    }
  }
  return { start: minIso, end: maxIso }
}

/**
 * Calculate centroid of photo coordinates
 */
export function centroid(photos: RescuePhoto[]): GeoPoint {
  let sumLat = 0
  let sumLng = 0
  let n = 0

  for (const p of photos) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue
    sumLat += p.lat
    sumLng += p.lng
    n += 1
  }
  if (n === 0) throw new Error('Cannot compute centroid: no GPS points')
  return { lat: sumLat / n, lng: sumLng / n }
}

/**
 * Haversine distance in meters
 */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)

  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng)

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Generate a deterministic-ish ID for groups
 */
export function makeGroupId(prefix = 'grp'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ═══════════════════════════════════════════════════════════════════════════
// DBSCAN CLUSTERING (Location-based)
// ═══════════════════════════════════════════════════════════════════════════

type DbscanLabel = 0 | 1 | 2 // 0=unvisited, 1=noise, 2=clustered

/**
 * Find all points within epsilon distance of a given point
 */
function regionQuery(
  points: RescuePhoto[],
  idx: number,
  epsMeters: number
): number[] {
  const p = points[idx]
  const out: number[] = []
  const a = { lat: p.lat as number, lng: p.lng as number }

  for (let j = 0; j < points.length; j++) {
    if (j === idx) continue
    const q = points[j]
    const b = { lat: q.lat as number, lng: q.lng as number }
    const d = haversineMeters(a, b)
    if (d <= epsMeters) out.push(j)
  }
  return out
}

/**
 * DBSCAN clustering for geo points
 * Returns array of clusters, each cluster is array of indices
 * Noise points are excluded (returned as separate array)
 */
export function dbscanGeo(
  points: RescuePhoto[],
  cfg: { epsMeters: number; minPts: number }
): { clusters: number[][]; noiseIndices: number[] } {
  const { epsMeters, minPts } = cfg

  const labels: DbscanLabel[] = new Array(points.length).fill(0)
  const clusterIdOf: number[] = new Array(points.length).fill(-1)
  const clusters: number[][] = []

  let clusterId = 0

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== 0) continue // already processed
    labels[i] = 1 // mark as noise tentatively

    const neighbors = regionQuery(points, i, epsMeters)
    // In DBSCAN, minPts typically includes the point itself
    if (neighbors.length + 1 < minPts) {
      // remains noise
      continue
    }

    // create new cluster
    clusters.push([])
    const queue = [i, ...neighbors]
    labels[i] = 2
    clusterIdOf[i] = clusterId

    while (queue.length) {
      const curr = queue.shift() as number

      if (labels[curr] === 1) {
        // previously noise, now becomes part of cluster
        labels[curr] = 2
        clusterIdOf[curr] = clusterId
      }
      if (labels[curr] !== 2) {
        labels[curr] = 2
        clusterIdOf[curr] = clusterId
      }

      const currNeighbors = regionQuery(points, curr, epsMeters)
      if (currNeighbors.length + 1 >= minPts) {
        for (const nIdx of currNeighbors) {
          if (labels[nIdx] === 0 || labels[nIdx] === 1) {
            queue.push(nIdx)
          }
        }
      }
    }

    // materialize cluster indices
    const clusterIndices: number[] = []
    for (let k = 0; k < clusterIdOf.length; k++) {
      if (clusterIdOf[k] === clusterId) clusterIndices.push(k)
    }
    clusters[clusterId] = clusterIndices
    clusterId++
  }

  const noiseIndices: number[] = []
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) noiseIndices.push(i)
  }

  return { clusters, noiseIndices }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPORAL SEGMENTATION (Time-based splitting)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split a set of photos (already close in location) into segments by time gaps
 * - Sorts by takenAtUtc ascending
 * - Splits when gap between adjacent photos > gapMinutes
 */
export function temporalSplit(
  photos: RescuePhoto[],
  gapMinutes: number
): RescuePhoto[][] {
  if (photos.length === 0) return []
  const sorted = [...photos].sort(
    (a, b) => parseTimeMs(a.takenAtUtc) - parseTimeMs(b.takenAtUtc)
  )

  const groups: RescuePhoto[][] = []
  let current: RescuePhoto[] = []

  for (const p of sorted) {
    if (current.length === 0) {
      current.push(p)
      continue
    }
    const prev = current[current.length - 1]
    const gap = minutesDiff(prev.takenAtUtc, p.takenAtUtc)
    if (gap > gapMinutes) {
      groups.push(current)
      current = [p]
    } else {
      current.push(p)
    }
  }
  if (current.length) groups.push(current)
  return groups
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL SUGGESTION GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate group suggestions from photos
 * This is the main entry point for clustering
 */
export function suggestGroups(
  allPhotos: RescuePhoto[],
  config: ClusterConfig = DEFAULT_CLUSTER_CONFIG
): {
  groups: PhotoGroupSuggestion[]
  unlocatedPhotoIds: string[]
  noiseGpsPhotoIds: string[]
} {
  const { epsMeters, minPts, gapMinutes, maxAccuracyM } = config

  const gps: RescuePhoto[] = []
  const unlocated: RescuePhoto[] = []

  for (const p of allPhotos) {
    const hasGps =
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      isValidLatLng(p.lat, p.lng) &&
      (typeof maxAccuracyM !== 'number' ||
        typeof p.accuracyM !== 'number' ||
        p.accuracyM <= maxAccuracyM)

    if (hasGps) gps.push(p)
    else unlocated.push(p)
  }

  const { clusters, noiseIndices } = dbscanGeo(gps, { epsMeters, minPts })

  // Build groups: temporal split per cluster
  const groupSuggestions: PhotoGroupSuggestion[] = []
  for (const clusterIdxs of clusters) {
    const clusterPhotos = clusterIdxs.map((i) => gps[i])
    const segments = temporalSplit(clusterPhotos, gapMinutes)

    for (const seg of segments) {
      const c = centroid(seg)
      const dr = dateRange(seg)
      const stats = {
        count: seg.length,
        gpsCount: seg.length,
        noGpsCount: 0,
        spanMinutes: spanMinutes(seg),
      }

      groupSuggestions.push({
        groupId: makeGroupId('grp'),
        photoIds: seg.map((x) => x.photoId),
        centroid: c,
        dateRange: dr,
        stats,
      })
    }
  }

  const noiseGpsPhotoIds = noiseIndices.map((i) => gps[i].photoId)
  const unlocatedPhotoIds = unlocated.map((p) => p.photoId)

  return {
    groups: groupSuggestions,
    unlocatedPhotoIds,
    noiseGpsPhotoIds,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING BUCKET GENERATION (Multi-unit handling)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate building buckets with time-sliced sessions
 * For handling same-building multi-unit scenarios
 */
export function generateBuildingBuckets(
  allPhotos: RescuePhoto[],
  config: ClusterConfig = DEFAULT_CLUSTER_CONFIG,
  sessionGapMinutes = 60
): {
  buckets: BuildingBucket[]
  unlocatedPhotoIds: string[]
  noiseGpsPhotoIds: string[]
} {
  const { epsMeters, minPts, maxAccuracyM } = config

  const gps: RescuePhoto[] = []
  const unlocated: RescuePhoto[] = []

  for (const p of allPhotos) {
    const hasGps =
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      isValidLatLng(p.lat, p.lng) &&
      (typeof maxAccuracyM !== 'number' ||
        typeof p.accuracyM !== 'number' ||
        p.accuracyM <= maxAccuracyM)

    if (hasGps) gps.push(p)
    else unlocated.push(p)
  }

  const { clusters, noiseIndices } = dbscanGeo(gps, { epsMeters, minPts })

  const buckets: BuildingBucket[] = []

  for (const clusterIdxs of clusters) {
    const clusterPhotos = clusterIdxs.map((i) => gps[i])
    const c = centroid(clusterPhotos)
    const bucketId = makeGroupId('bkt')

    // Time-slice into sessions
    const segments = temporalSplit(clusterPhotos, sessionGapMinutes)
    const sessions: RescueSessionSegment[] = segments.map((seg) => ({
      sessionId: makeGroupId('ses'),
      photoIds: seg.map((p) => p.photoId),
      dateRange: dateRange(seg),
      count: seg.length,
      assignment: { status: 'unassigned' },
    }))

    buckets.push({
      bucketId,
      centroid: c,
      photoIds: clusterPhotos.map((p) => p.photoId),
      sessions,
      units: [
        { unitId: 'A', label: 'Unit A' },
        { unitId: 'B', label: 'Unit B' },
        { unitId: 'C', label: 'Unit C' },
      ],
    })
  }

  return {
    buckets,
    unlocatedPhotoIds: unlocated.map((p) => p.photoId),
    noiseGpsPhotoIds: noiseIndices.map((i) => gps[i].photoId),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-PICK MINORITY PHOTOS (For Mixed sessions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute majority/minority for auto-pick in Fix flow
 * Only auto-pick if majority ratio >= 70%
 */
export function computeMajorityAndMinority(
  photoIds: string[],
  photoAssignment: Record<string, UnitId>
): AutoPickResult {
  const counts = new Map<UnitId, number>()
  for (const pid of photoIds) {
    const u = photoAssignment[pid] ?? null
    counts.set(u, (counts.get(u) ?? 0) + 1)
  }

  // find majority
  let majorityUnit: UnitId = null
  let majorityCount = 0
  const total = photoIds.length

  for (const [u, c] of counts.entries()) {
    if (c > majorityCount) {
      majorityCount = c
      majorityUnit = u
    }
  }

  const majorityRatio = total === 0 ? 0 : majorityCount / total

  // Only auto-pick if majority is strong
  if (majorityRatio < MAJORITY_THRESHOLD) {
    return {
      majorityUnit,
      majorityRatio,
      autoPick: false,
      selected: [],
      counts,
    }
  }

  const selected = photoIds.filter(
    (pid) => (photoAssignment[pid] ?? null) !== majorityUnit
  )

  return {
    majorityUnit,
    majorityRatio,
    autoPick: true,
    selected,
    counts,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION DISPLAY STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute display state for a session
 */
export function getSessionDisplayState(
  session: RescueSessionSegment,
  photoAssignment: Record<string, UnitId>
): 'assigned' | 'mixed' | 'unassigned' {
  const assignments = new Set<UnitId>()
  for (const pid of session.photoIds) {
    assignments.add(photoAssignment[pid] ?? null)
  }

  if (assignments.size === 0) return 'unassigned'
  if (assignments.size === 1) {
    const unit = [...assignments][0]
    return unit === null ? 'unassigned' : 'assigned'
  }
  return 'mixed'
}
