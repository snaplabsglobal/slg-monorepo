/* ── JobsiteSnap Core Types ── */

/** Job status */
export type JobStatus = 'active' | 'archived'

/** Photo stage (Before/During/After) */
export type PhotoStage = 'before' | 'during' | 'after'

/** Job (construction project for photo organization) */
export interface Job {
  id: string
  organization_id: string
  name: string
  address: string | null
  status: JobStatus
  project_id: string | null  // Link to LedgerSnap project (optional)
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Computed fields (from queries)
  photo_count?: number
  last_photo_at?: string | null
}

/** Job Photo (the core asset) */
export interface JobPhoto {
  id: string
  job_id: string
  organization_id: string
  file_url: string
  thumbnail_url: string | null
  file_size: number | null
  mime_type: string
  taken_at: string
  stage: PhotoStage | null
  area: string | null
  trade: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Job Area (shared area names within a job) */
export interface JobArea {
  id: string
  job_id: string
  organization_id: string
  name: string
  created_at: string
}

/** Job Trade (shared trade names within a job) */
export interface JobTrade {
  id: string
  job_id: string
  organization_id: string
  name: string
  created_at: string
}

/* ── API Request/Response Types ── */

export interface CreateJobRequest {
  name: string
  address?: string
}

export interface UpdateJobRequest {
  name?: string
  address?: string
  status?: JobStatus
}

export interface CreatePhotoRequest {
  file_url: string
  taken_at?: string
  stage?: PhotoStage
  area?: string
  trade?: string
  file_size?: number
  mime_type?: string
}

export interface UpdatePhotoRequest {
  stage?: PhotoStage | null
  area?: string | null
  trade?: string | null
}

export interface PhotoUploadRequest {
  filename: string
  contentType: string
}

export interface PhotoUploadResponse {
  presignedUrl: string
  fileUrl: string
  filePath: string
}

/* ── List Response Types ── */

export interface JobListResponse {
  jobs: Job[]
  total: number
}

export interface PhotoListResponse {
  photos: JobPhoto[]
  total: number
  hasMore: boolean
}

/* ── Filter Types ── */

export interface PhotoFilters {
  stage?: PhotoStage
  area?: string
  trade?: string
  dateFrom?: string
  dateTo?: string
}
