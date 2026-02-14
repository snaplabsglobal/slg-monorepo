/**
 * Self-Rescue Mode Types
 *
 * Core principle: "默认什么都不做，每一步都是我自己点的"
 * - Suggestions only, no auto-archive
 * - Human confirms every action
 * - Nothing changes until explicit confirm
 */

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Photo metadata for rescue processing
 * Note: We don't need the actual image, just metadata
 */
export type RescuePhoto = {
  photoId: string
  takenAtUtc: string  // ISO string
  lat?: number
  lng?: number
  accuracyM?: number  // optional GPS accuracy
  fileName?: string   // for display
  fileSize?: number   // bytes
}

/**
 * Clustering configuration
 */
export type ClusterConfig = {
  epsMeters: number       // e.g. 80 (indoor drift + same property)
  minPts: number          // e.g. 6 (minimum photos per cluster)
  gapMinutes: number      // e.g. 720 (12 hours for session split)
  maxAccuracyM?: number   // optional: treat worse accuracy as noGPS
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES (Suggestions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A suggested group of photos
 * Note: This is a SUGGESTION only, not a decision
 */
export type PhotoGroupSuggestion = {
  groupId: string
  photoIds: string[]
  centroid: { lat: number; lng: number }
  dateRange: { start: string; end: string }
  stats: {
    count: number
    gpsCount: number
    noGpsCount: number
    spanMinutes: number
  }
  suggestedAddress?: {
    formatted: string
    source: 'reverse_geocode'
    confidence: 'low' | 'medium'  // No 'high' in Phase 1
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING BUCKET TYPES (Multi-unit handling)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A building-level bucket containing multiple sessions
 * For handling same-building multi-unit scenarios
 */
export type BuildingBucket = {
  bucketId: string
  centroid?: { lat: number; lng: number }
  suggestedLabel?: string  // e.g. "Burnaby – 4500 Kingsway (Building)"
  photoIds: string[]

  // Created by time slicing
  sessions: RescueSessionSegment[]

  // User-defined unit list (optional)
  units?: Array<{ unitId: string; label: string }>  // e.g. A/B/C
}

/**
 * Unit ID type for multi-unit buildings
 */
export type UnitId = string | null  // null = Unassigned

/**
 * A time-based session within a bucket
 */
export type RescueSessionSegment = {
  sessionId: string
  photoIds: string[]
  dateRange: { start: string; end: string }
  count: number

  // Human decision (NOT auto-assigned)
  assignment: {
    status: 'unassigned' | 'assigned'
    unitId?: UnitId  // A/B/C
  }

  // UX helper (NOT a decision)
  suggestion?: {
    type: 'last_used_unit'
    unitId: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NAMING STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Naming state for a single group
 * CRITICAL: Only USER_CONFIRMED can write userProjectName
 */
export enum NamingState {
  EMPTY = 'EMPTY',                       // Not yet processed
  SUGGESTED_SHOWN = 'SUGGESTED_SHOWN',   // Showing pre-filled suggestion
  USER_EDITING = 'USER_EDITING',         // User is modifying
  USER_CONFIRMED = 'USER_CONFIRMED',     // User clicked confirm
  SKIPPED = 'SKIPPED'                    // User chose to skip
}

// ═══════════════════════════════════════════════════════════════════════════
// RESCUE SESSION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Source types for photo import
 */
export type RescueSource =
  | 'phone_camera_roll'
  | 'local_folder'
  | 'external_drive'
  | 'exported_project'

/**
 * Session status
 */
export type RescueSessionStatus =
  | 'created'
  | 'scanning'
  | 'scanned'
  | 'grouping'
  | 'grouped'
  | 'naming'
  | 'confirming'
  | 'applied'

/**
 * A rescue session
 */
export type RescueSession = {
  sessionId: string
  userId: string
  createdAt: string
  status: RescueSessionStatus
  source?: RescueSource

  // Scan results
  scanStats?: {
    totalPhotos: number
    withGps: number
    withoutGps: number
    dateRangeStart?: string
    dateRangeEnd?: string
  }

  // Grouping results
  groups?: PhotoGroupSuggestion[]
  unlocatedPhotoIds?: string[]
  noisePhotoIds?: string[]

  // Building buckets (for multi-unit)
  buckets?: BuildingBucket[]
}

// ═══════════════════════════════════════════════════════════════════════════
// RESCUE PLAN (Final confirmation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Action types in a rescue plan
 */
export type RescuePlanAction =
  | {
      type: 'create_project'
      groupId: string
      projectName: string
      photoIds: string[]
    }
  | {
      type: 'keep_unassigned'
      photoIds: string[]
    }

/**
 * Rescue plan for final confirmation
 */
export type RescuePlan = {
  sessionId: string
  actions: RescuePlanAction[]
  summary: {
    projectsToCreate: number
    photosToOrganize: number
    photosUnassigned: number
  }
}

/**
 * Undo token (valid for 24 hours)
 */
export type UndoToken = {
  token: string
  expiresAt: string  // ISO
  sessionId: string
}

// ═══════════════════════════════════════════════════════════════════════════
// UI STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bucket-level UI state (for sticky destination etc.)
 */
export type BucketUIState = {
  bucketId: string
  lastUsedUnitId?: UnitId       // For session one-tap assign
  lastFixDestination?: UnitId   // Sticky destination for Fix flow
}

/**
 * Session display state
 */
export type SessionDisplayState =
  | { type: 'assigned'; unitId: string }
  | { type: 'mixed' }
  | { type: 'unassigned' }

/**
 * Auto-pick result for minority photos
 */
export type AutoPickResult = {
  majorityUnit: UnitId
  majorityRatio: number
  autoPick: boolean
  selected: string[]  // photo IDs
  counts: Map<UnitId, number>
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default clustering config
 */
export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  epsMeters: 80,      // 80m for indoor drift + same property
  minPts: 6,          // Minimum 6 photos per cluster
  gapMinutes: 720,    // 12 hours for session split
  maxAccuracyM: 100,  // Treat >100m accuracy as noGPS
}

/**
 * Default session gap for time slicing
 */
export const DEFAULT_SESSION_GAP_MINUTES = 60

/**
 * Majority threshold for auto-pick
 */
export const MAJORITY_THRESHOLD = 0.70  // 70%
