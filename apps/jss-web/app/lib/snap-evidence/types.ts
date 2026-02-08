/**
 * SnapEvidence Types
 * Core type definitions for the offline-first photo capture system
 *
 * Core principle: "不丢、不乱、可信"
 * - 不丢: Never lose a photo (local-first, auto-retry)
 * - 不乱: Every photo belongs to a job (enforced)
 * - 可信: Watermarked with timestamp and location (evidence)
 */

// ═══════════════════════════════════════════════════════════════════════════
// THREE ORTHOGONAL STATE MACHINES (CRITICAL)
// Each state line is independent - failure in one MUST NOT affect others
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Capture State - Highest priority state machine
 * Once LOCAL_WRITTEN, this photo is PERMANENTLY successful
 */
export type CaptureState =
  | 'idle'          // Camera not activated
  | 'capturing'     // Shutter moment (cannot interrupt)
  | 'local_written' // Successfully written to IndexedDB (victory condition)
  | 'failed'        // Only when disk write fails

/**
 * Upload State - Completely non-blocking to capture
 * Upload failure NEVER affects capture success
 */
export type UploadState =
  | 'not_queued'      // Not yet in upload queue
  | 'queued'          // Waiting to upload
  | 'uploading'       // Currently uploading preview
  | 'uploaded'        // Preview successfully in R2
  | 'error_retryable' // Network/DNS/temp error (will retry)

/**
 * Assignment State - Smart Trace归档状态
 * Only USER_CONFIRMED or MANUALLY_ASSIGNED can write job_id
 */
export type AssignmentState =
  | 'unassigned'                // Default - no assignment yet
  | 'suggested_by_smart_trace'  // Smart Trace found a candidate (NOT confirmed)
  | 'user_confirmed'            // User tapped confirm on Smart Trace suggestion
  | 'manually_assigned'         // User manually selected a job

// Legacy alias for backward compatibility
export type PhotoStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

// Photo stage (before/during/after)
export type PhotoStage = 'before' | 'during' | 'after'

// Photo variant (for multi-version storage)
// preview: compressed for upload/display
// original: full resolution (Phase 1.5+)
// wm: watermarked version (Phase 2)
export type PhotoVariant = 'preview' | 'original' | 'wm'

// ═══════════════════════════════════════════════════════════════════════════
// GPS Coordinates (Smart Trace Core Data)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Temporary GPS coordinates captured at photo time
 * Used by Smart Trace for post-sync job suggestion
 */
export interface TempCoords {
  lat: number         // Latitude
  lng: number         // Longitude
  accuracy_m?: number // GPS accuracy in meters
  altitude?: number   // Altitude in meters (optional)
}

// ═══════════════════════════════════════════════════════════════════════════
// Smart Trace Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Smart Trace calculation result
 * Phase 1: This is a SUGGESTION only, not a decision
 */
export interface SmartTraceResult {
  candidate_job_id: string
  distance_m: number
  confidence: 'low' | 'medium'  // No 'high' in Phase 1
}

/**
 * Smart Trace suggestion stored in photo
 * CANNOT be used to write job_id directly
 */
export interface SmartTraceMeta {
  suggested_job_id: string
  suggested_job_name?: string
  distance_m: number
  confidence: 'low' | 'medium'
  suggested_at: string  // ISO 8601
}

/**
 * Photo item metadata stored in IndexedDB
 */
export interface PhotoItem {
  id: string                    // UUID (client-generated, immutable, idempotency key)
  job_id: string                // Required, foreign key - only USER action can change this
  taken_at: string              // ISO 8601 local time
  stage: PhotoStage             // Default: 'during'
  area_id?: string              // Optional
  trade_id?: string             // Optional

  // ═══════════════════════════════════════════════════════════════════════════
  // THREE ORTHOGONAL STATES (Phase 1 Offline Architecture)
  // ═══════════════════════════════════════════════════════════════════════════
  capture_state: CaptureState   // Capture pipeline state
  upload_state: UploadState     // Upload pipeline state
  assignment_state: AssignmentState // Smart Trace / manual assignment state

  // Legacy upload state (for backward compatibility)
  status: PhotoStatus
  attempts: number              // Retry count
  last_error?: string           // Last error message

  // Server receipt
  uploaded_at?: string
  server_file_id?: string

  // Metadata
  mime_type: string
  byte_size: number
  watermark_version?: string

  // ═══════════════════════════════════════════════════════════════════════════
  // GPS Coordinates (Smart Trace Core Data)
  // Captured at photo time, even offline
  // ═══════════════════════════════════════════════════════════════════════════
  temp_coords?: TempCoords      // GPS at capture time
  timestamp_utc: string         // UTC timestamp for Smart Trace

  // Smart Trace suggestion (Phase 1: suggestion only)
  smart_trace_meta?: SmartTraceMeta

  // Compression metadata (Phase 1.5)
  original_hash?: string        // SHA-256 of original blob
  original_size?: number        // Original file size in bytes
  compressed_size?: number      // Compressed file size in bytes
  compression_params?: {
    maxDimension: number        // e.g., 2048
    quality: number             // e.g., 0.75
  }

  // R2 Key规范 (幂等性保护)
  // MUST be set at capture time and NEVER regenerated
  variant?: PhotoVariant        // Default: 'preview'
  r2_key?: string               // Stable key: jobs/{jobId}/photos/{photoId}/preview.jpg

  // Display helpers (cached from job)
  job_name?: string
  location?: string
}

/**
 * Photo blob stored separately in IndexedDB
 */
export interface PhotoBlob {
  id: string                    // Same as PhotoItem.id
  blob: Blob                    // Original image (for local viewing)
  compressed?: Blob             // Compressed version (for upload)
  thumbnail?: Blob              // Thumbnail (optional)
  expires_at?: string           // ISO 8601 - when original can be deleted
}

/**
 * Valid state transitions for PhotoStatus (Legacy)
 */
export const VALID_TRANSITIONS: Record<PhotoStatus, PhotoStatus[]> = {
  'pending': ['uploading'],
  'uploading': ['uploaded', 'failed'],
  'failed': ['pending'],
  'uploaded': [] // Terminal state
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE TRANSITIONS (Phase 1 Three Orthogonal Lines)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CaptureState transitions
 * CRITICAL: LOCAL_WRITTEN is irreversible - once set, capture is FOREVER successful
 */
export const CAPTURE_TRANSITIONS: Record<CaptureState, CaptureState[]> = {
  'idle': ['capturing'],
  'capturing': ['local_written', 'failed'],
  'local_written': [],  // TERMINAL - cannot go back
  'failed': [],         // Terminal for this attempt
}

/**
 * UploadState transitions
 * Note: No FAILED_FINAL - uploads are always recoverable
 */
export const UPLOAD_TRANSITIONS: Record<UploadState, UploadState[]> = {
  'not_queued': ['queued'],
  'queued': ['uploading'],
  'uploading': ['uploaded', 'error_retryable'],
  'uploaded': [],  // Terminal
  'error_retryable': ['queued'],  // Always recoverable
}

/**
 * AssignmentState transitions
 * CRITICAL: Only user_confirmed/manually_assigned can write job_id
 */
export const ASSIGNMENT_TRANSITIONS: Record<AssignmentState, AssignmentState[]> = {
  'unassigned': ['suggested_by_smart_trace', 'manually_assigned'],
  'suggested_by_smart_trace': ['user_confirmed', 'unassigned', 'manually_assigned'],
  'user_confirmed': [],     // Terminal
  'manually_assigned': [],  // Terminal
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART TRACE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Smart Trace configuration for Phase 1
 */
export const SMART_TRACE_CONFIG = {
  // Geofence radius in meters (consider GPS indoor drift)
  geofenceRadius: 100,        // 50-100m buffer zone

  // Minimum GPS accuracy required for Smart Trace
  minAccuracyM: 100,          // If accuracy > 100m, don't suggest

  // Maximum candidates to return
  maxCandidates: 3,

  // Trigger conditions
  triggerOnline: true,        // Only trigger when online
  requireCoords: true,        // Require temp_coords to exist
}

/**
 * Confidence thresholds for Smart Trace
 */
export const SMART_TRACE_CONFIDENCE = {
  // Distance thresholds
  mediumMaxDistance: 50,      // < 50m = medium confidence
  lowMaxDistance: 100,        // < 100m = low confidence
  // Beyond 100m = no suggestion
}

/**
 * Upload configuration
 */
export const UPLOAD_CONFIG = {
  maxConcurrent: 2,             // Mobile: max 2 concurrent uploads
  maxRetries: 3,                // Single photo max retries
  retryDelays: [1000, 5000, 30000], // 1s, 5s, 30s
  timeout: 60000                // Single upload timeout: 60s
}

/**
 * Storage TTL configuration (Phase 1.5)
 * Original images are kept locally for 7 days after upload
 */
export const STORAGE_TTL_CONFIG = {
  originalRetentionDays: 7,     // Days to keep original after upload
  cleanupIntervalMs: 24 * 60 * 60 * 1000,  // Run cleanup daily
}

/**
 * Watermark configuration
 */
export interface WatermarkConfig {
  version: string               // 'v1'
  fields: string[]              // ['job', 'time', 'location']
  // Phase 2+
  include_weather?: boolean
  geo_precision?: 'city' | 'latlng'
}

/**
 * Default watermark config for Phase 1
 */
export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  version: 'v1',
  fields: ['job', 'time', 'location']
}

// Phase 1 Watermark Guardrails:
// ❌ No weather data (requires external API)
// ❌ No temperature/humidity
// ❌ No user-editable watermark content
// ❌ No toggle to disable watermark
// ❌ No legal disclaimer text
// ❌ No QR codes
