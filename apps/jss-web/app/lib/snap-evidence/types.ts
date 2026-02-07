/**
 * SnapEvidence Types
 * Core type definitions for the offline-first photo capture system
 */

// Photo item status state machine
export type PhotoStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

// Photo stage (before/during/after)
export type PhotoStage = 'before' | 'during' | 'after'

/**
 * Photo item metadata stored in IndexedDB
 */
export interface PhotoItem {
  id: string                    // UUID
  job_id: string                // Required, foreign key
  taken_at: string              // ISO 8601 local time
  stage: PhotoStage             // Default: 'during'
  area_id?: string              // Optional
  trade_id?: string             // Optional

  // Upload state
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

  // Display helpers (cached from job)
  job_name?: string
  location?: string
}

/**
 * Photo blob stored separately in IndexedDB
 */
export interface PhotoBlob {
  id: string                    // Same as PhotoItem.id
  blob: Blob                    // Original or compressed image
  thumbnail?: Blob              // Thumbnail (optional)
}

/**
 * Valid state transitions for PhotoStatus
 */
export const VALID_TRANSITIONS: Record<PhotoStatus, PhotoStatus[]> = {
  'pending': ['uploading'],
  'uploading': ['uploaded', 'failed'],
  'failed': ['pending'],
  'uploaded': [] // Terminal state
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
