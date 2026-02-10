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
  // Geofence (for Smart Trace / Magic Import)
  geofence_lat?: number | null
  geofence_lng?: number | null
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
  // GPS coordinates (proof of location)
  lat: number | null
  lng: number | null
  // Audit trail
  captured_by: string | null
  client_photo_id: string | null   // Client-generated UUID for idempotency
  r2_key: string | null            // Stable R2 object key
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

/* ══════════════════════════════════════════════════════════════════════════
   Evidence Set Model (核心抽象)

   Evidence Set = 一个"可交付、可审计、可复用"的施工证据包

   Core Principles:
   - Evidence Sets are views, not copies
   - One photo can belong to multiple Evidence Sets
   - External parties never modify evidence
   - Auditability always outweighs convenience
   ══════════════════════════════════════════════════════════════════════════ */

/** Evidence Set purpose templates */
export type EvidenceSetPurpose =
  | 'firewall'         // 防火墙合规
  | 'rough_in'         // 粗装阶段
  | 'encapsulation'    // 封板记录
  | 'permit_daily'     // 每日许可证明
  | 'subtrade_handoff' // 分包交接
  | 'custom'           // 自定义

/** Evidence Set status workflow */
export type EvidenceSetStatus = 'draft' | 'reviewed' | 'shared'

/** Evidence Set (curated photo collection) */
export interface EvidenceSet {
  id: string
  organization_id: string
  job_id: string
  name: string                    // "2-Hour Firewall – Level 1–3"
  purpose: EvidenceSetPurpose
  status: EvidenceSetStatus
  created_by: string
  created_at: string
  updated_at: string
  shared_at: string | null
  deleted_at: string | null
  // Computed
  photo_count?: number
}

/** Evidence Set Item (links photo to set) */
export interface EvidenceSetItem {
  evidence_set_id: string
  photo_id: string
  order_index: number
  layer_label: string | null      // "Layer 1", "Layer 2"
  added_at: string
  added_by: string
}

/** Evidence Set with photos (for display) */
export interface EvidenceSetWithPhotos extends EvidenceSet {
  items: (EvidenceSetItem & { photo: JobPhoto })[]
}

/* ══════════════════════════════════════════════════════════════════════════
   View Model (权限的真正实现)

   Users don't access data. They access views of data.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * View Types (Phase 1)
 *
 * | View Type          | Photos | Evidence Sets | Edit | Upload | Audit |
 * |--------------------|--------|---------------|------|--------|-------|
 * | internal_full      | All    | All           | ✅   | ✅     | ✅    |
 * | staff_capture      | Assigned| ❌           | Own  | ✅     | ❌    |
 * | evidence_readonly  | ❌     | Assigned only | ❌   | ❌     | ❌    |
 * | curated_client     | ❌     | Assigned only | ❌   | ❌     | ❌    |
 * | subtrade_scoped    | ❌     | Assigned only | ❌   | ❌     | ❌    |
 */
export type ViewType =
  | 'internal_full'       // GC / Owner - full access
  | 'staff_capture'       // Employee - capture only
  | 'evidence_readonly'   // Inspector - read-only evidence
  | 'curated_client'      // Owner / Designer - curated view
  | 'subtrade_scoped'     // Subtrade - scoped access

/* ══════════════════════════════════════════════════════════════════════════
   Audit Log (合规护城河)

   Inspector / 法务 / 保险 = 只信这个表
   ══════════════════════════════════════════════════════════════════════════ */

/** Audit log entity types */
export type AuditEntityType = 'photo' | 'evidence_set' | 'job' | 'share_link'

/** Audit log actions */
export type AuditAction =
  | 'capture'   // Photo captured
  | 'upload'    // Photo uploaded
  | 'create'    // Entity created
  | 'update'    // Entity updated
  | 'add'       // Item added to set
  | 'remove'    // Item removed from set
  | 'share'     // Link created/sent
  | 'view'      // External view
  | 'revoke'    // Access revoked
  | 'delete'    // Entity deleted

/** Audit log entry */
export interface AuditLog {
  id: string
  organization_id: string
  entity_type: AuditEntityType
  entity_id: string
  action: AuditAction
  actor_id: string | null
  actor_role: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/* ══════════════════════════════════════════════════════════════════════════
   Share Links (Secure sharing)
   ══════════════════════════════════════════════════════════════════════════ */

/** Share link view types */
export type ShareLinkViewType = 'evidence_readonly' | 'curated_client'

/** Share link */
export interface ShareLink {
  id: string
  organization_id: string
  evidence_set_id: string
  token: string
  view_type: ShareLinkViewType
  expires_at: string | null
  max_views: number | null
  view_count: number
  recipient_name: string | null
  recipient_email: string | null
  created_by: string
  created_at: string
  last_viewed_at: string | null
  revoked_at: string | null
}

/* ══════════════════════════════════════════════════════════════════════════
   Role-Based Access Constitution (产品级)

   宪法级规则（必须写进产品）:
   1. 照片永远属于公司，不属于个人
   2. 员工是采集终端，不是数据所有者
   3. 分享默认只读
   4. 权限撤销即时生效（Digital Offboarding）
   5. 所有操作必须进入Audit Log
   ══════════════════════════════════════════════════════════════════════════ */

/** Organization role */
export type OrgRole = 'owner' | 'admin' | 'staff'

/** Role capabilities */
export interface RoleCapabilities {
  capture: boolean
  editOwn: boolean
  editOthers: boolean
  delete: boolean
  viewScope: 'all' | 'assigned' | 'curated'
  share: boolean
  viewAudit: boolean
}

/** Role-Based Access Constitution */
export const ROLE_CAPABILITIES: Record<OrgRole, RoleCapabilities> = {
  owner: {
    capture: true,
    editOwn: true,
    editOthers: true,
    delete: true,
    viewScope: 'all',
    share: true,
    viewAudit: true,
  },
  admin: {
    capture: true,
    editOwn: true,
    editOthers: true,
    delete: true,
    viewScope: 'all',
    share: true,
    viewAudit: true,
  },
  staff: {
    capture: true,
    editOwn: true,
    editOthers: false,
    delete: false,
    viewScope: 'assigned',
    share: false,
    viewAudit: false,
  },
}

/* ══════════════════════════════════════════════════════════════════════════
   API Types for Evidence Sets
   ══════════════════════════════════════════════════════════════════════════ */

export interface CreateEvidenceSetRequest {
  job_id: string
  name: string
  purpose?: EvidenceSetPurpose
  photo_ids?: string[]          // Initial photos to add
}

export interface UpdateEvidenceSetRequest {
  name?: string
  purpose?: EvidenceSetPurpose
  status?: EvidenceSetStatus
}

export interface AddPhotosToSetRequest {
  photo_ids: string[]
  layer_labels?: Record<string, string>  // photo_id -> label
}

export interface CreateShareLinkRequest {
  evidence_set_id: string
  view_type?: ShareLinkViewType
  expires_in_days?: number
  max_views?: number
  recipient_name?: string
  recipient_email?: string
}
