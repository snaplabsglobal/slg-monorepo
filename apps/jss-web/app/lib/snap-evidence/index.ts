/**
 * SnapEvidence Module
 * Offline-first photo capture system for JobSite Snap
 *
 * Core principle: "不丢、不乱、可信"
 * - 不丢: Never lose a photo (local-first, auto-retry)
 * - 不乱: Every photo belongs to a job (enforced)
 * - 可信: Watermarked with timestamp and location (evidence)
 */

// Types
export type {
  PhotoItem,
  PhotoBlob,
  PhotoStatus,
  PhotoStage,
  WatermarkConfig,
} from './types'

export {
  UPLOAD_CONFIG,
  VALID_TRANSITIONS,
  DEFAULT_WATERMARK_CONFIG,
} from './types'

// Local Store
export {
  savePhoto,
  getPhotoItem,
  getPhotoBlob,
  getPhotosByJob,
  getPhotosByStatus,
  updatePhotoStatus,
  updatePhotoBlob,
  deletePhoto,
  recoverOrphanedPhotos,
  getPendingCount,
  getStatusCounts,
  createThumbnail,
  saveThumbnail,
} from './local-store'

// Upload Queue
export { uploadQueue } from './upload-queue'

// Sync Orchestrator
export { syncOrchestrator } from './sync-orchestrator'

// R2 Storage (dedicated SnapEvidence bucket)
export {
  generateSnapEvidencePresignedUrl,
  deleteSnapEvidencePhoto,
  generateEvidenceKey,
  getSnapEvidenceBucketInfo,
} from './r2-storage'
