// lib/storage/upload.ts
// Client-side file upload utilities
// Re-export from shared package for convenience
export {
  uploadFile,
  uploadFileViaAPI,
  deleteFile,
  type UploadOptions,
  type UploadResult,
} from '@slo/snap-storage/client'
