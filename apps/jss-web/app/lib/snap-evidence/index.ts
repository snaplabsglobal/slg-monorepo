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
  PhotoVariant,
  WatermarkConfig,
  // Phase 1: Three orthogonal state machines
  CaptureState,
  UploadState,
  AssignmentState,
  // Smart Trace types
  TempCoords,
  SmartTraceResult,
  SmartTraceMeta,
} from './types'

export {
  UPLOAD_CONFIG,
  VALID_TRANSITIONS,
  DEFAULT_WATERMARK_CONFIG,
  STORAGE_TTL_CONFIG,
  // Phase 1: State machine transitions
  CAPTURE_TRANSITIONS,
  UPLOAD_TRANSITIONS,
  ASSIGNMENT_TRANSITIONS,
  // Smart Trace config
  SMART_TRACE_CONFIG,
  SMART_TRACE_CONFIDENCE,
} from './types'

// Compression (Phase 1.5)
export {
  compressImage,
  compressImageOffscreen,
  needsCompression,
  COMPRESSION_CONFIG,
  type CompressionResult,
} from './compression'

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
  // Phase 1.5: TTL cleanup
  setPhotoBlobExpiry,
  cleanupExpiredOriginals,
  getStorageStats,
  initStorageCleanup,
  // Phase 1: Three orthogonal state machines
  updateUploadState,
  updateAssignmentState,
  confirmSmartTraceSuggestion,
  manuallyAssignPhoto,
  getPhotosForSmartTrace,
  getPhotosWithSuggestions,
  // Debug Panel (CTO Directive E)
  getQueueStats,
  listAllPhotos,
  type QueueStats,
} from './local-store'

// Upload Queue
export { uploadQueue } from './upload-queue'

// Sync Orchestrator
export { syncOrchestrator } from './sync-orchestrator'

// R2 Storage (dedicated SnapEvidence bucket)
export {
  generateSnapEvidencePresignedUrl,
  generatePresignedUrlForKey,
  deleteSnapEvidencePhoto,
  generateEvidenceKey,
  getSnapEvidenceBucketInfo,
  // R2 Key规范 (幂等性保护)
  buildR2Key,
  resolveR2Key,
} from './r2-storage'
