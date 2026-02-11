/**
 * Artifact Service - Unified File Management for SLG
 *
 * Document: SLG_Strategy_Pivot_CTO_Brief_v1.4 §3.4
 *
 * This is THE ONLY entry point for file storage across all SLG apps.
 * Any bypass of this service is a violation of the architecture.
 *
 * Flow:
 * 1. Client → POST /artifacts/upload-request → get presigned URL + artifact_id
 * 2. Client → PUT to presigned URL → upload file directly to R2
 * 3. Client → POST /artifacts/confirm-upload → confirm + write event
 *
 * Key features:
 * - Short TTL presigned URLs (5 minutes)
 * - Server-side sha256 verification (don't trust client)
 * - Content deduplication via sha256 reference counting
 * - Immutable *.uploaded event on confirmation
 */

import { createClient } from '@/lib/supabase/server'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash } from 'crypto'
import { ulid } from '@slo/shared-utils'
import type {
  ArtifactKind,
  SourceApp,
  ULID,
  ArtifactUploadRequest,
  ArtifactUploadResponse,
} from '@slo/snap-types'

// ============================================================================
// Configuration
// ============================================================================

const PRESIGNED_URL_TTL = 300 // 5 minutes (short TTL as per CPO guidance)

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string
}

function getR2Config(): R2Config {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (process.env.R2_ENDPOINT
      ? process.env.R2_ENDPOINT.match(
          /https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/
        )?.[1]
      : undefined)

  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY
  const bucketName =
    process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
  const publicUrl =
    process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 credentials not configured')
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl }
}

function createR2Client() {
  const config = getR2Config()
  const endpoint =
    process.env.R2_ENDPOINT ||
    `https://${config.accountId}.r2.cloudflarestorage.com`

  return {
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
    bucketName: config.bucketName,
    publicUrl: config.publicUrl,
    config,
  }
}

// ============================================================================
// Upload Request Types
// ============================================================================

export interface UploadRequestInput {
  // Required
  idempotency_key: string
  kind: ArtifactKind
  mime_type: string
  byte_size: number
  source_app: SourceApp
  captured_at: string // ISO timestamp - REQUIRED for evidence chain

  // Optional
  sha256?: string // Client-provided for dedup check (not trusted for final)
  geo_lat?: number
  geo_lng?: number
  device_id?: string
  device_local_time?: string
  tz_offset?: string

  // Context
  organization_id: string
  user_id: string
  property_id?: string
  project_id?: string
  job_id?: string
}

export interface UploadRequestResult {
  artifact_id: ULID
  upload_url: string
  storage_key: string
  file_url: string
  deduplicated: boolean
  expires_at: string
}

export interface ConfirmUploadInput {
  artifact_id: ULID
  organization_id: string
  user_id: string
  source_app: SourceApp

  // Optional entity refs for the uploaded event
  property_id?: string
  project_id?: string
  job_id?: string
}

export interface ConfirmUploadResult {
  artifact_id: ULID
  sha256: string
  event_id: ULID
  deduplicated: boolean
  file_url: string
}

// ============================================================================
// Artifact Service Implementation
// ============================================================================

/**
 * Request an upload URL for a new artifact
 *
 * This does NOT upload the file - it returns a presigned URL for the client
 * to upload directly to R2.
 *
 * If sha256 is provided and matches an existing artifact in the same org,
 * we can skip upload and increment reference count (deduplication).
 */
export async function requestUpload(
  input: UploadRequestInput
): Promise<UploadRequestResult> {
  const supabase = await createClient()

  // Check for deduplication if sha256 provided
  if (input.sha256) {
    const { data: existing } = await supabase
      .from('core_artifact')
      .select('id, storage_key, reference_count')
      .eq('organization_id', input.organization_id)
      .eq('sha256', input.sha256)
      .is('deleted_at', null)
      .single()

    if (existing) {
      // Deduplicated! Increment reference count
      await supabase
        .from('core_artifact')
        .update({ reference_count: existing.reference_count + 1 })
        .eq('id', existing.id)

      const config = getR2Config()
      const fileUrl = config.publicUrl
        ? `${config.publicUrl}/${existing.storage_key}`
        : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${existing.storage_key}`

      return {
        artifact_id: existing.id as ULID,
        upload_url: '', // No upload needed
        storage_key: existing.storage_key,
        file_url: fileUrl,
        deduplicated: true,
        expires_at: new Date().toISOString(),
      }
    }
  }

  // Generate new artifact ID
  const artifactId = ulid()

  // Generate storage key
  // Format: artifacts/{org_id}/{source_app}/{YYYYMMDD}/{artifact_id}.{ext}
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const ext = getExtensionFromMimeType(input.mime_type)
  const storageKey = `artifacts/${input.organization_id}/${input.source_app}/${dateStr}/${artifactId}${ext}`

  // Create pending artifact record
  const { error: insertError } = await supabase.from('core_artifact').insert({
    id: artifactId,
    organization_id: input.organization_id,
    owner_user_id: input.user_id,
    kind: input.kind,
    mime_type: input.mime_type,
    byte_size: input.byte_size,
    storage_provider: 'r2',
    storage_key: storageKey,
    source_app: input.source_app,
    captured_at: input.captured_at,
    geo_lat: input.geo_lat,
    geo_lng: input.geo_lng,
    device_id: input.device_id,
    device_local_time: input.device_local_time,
    tz_offset: input.tz_offset,
    reference_count: 1,
    metadata: {
      schema_version: 1,
      idempotency_key: input.idempotency_key,
      upload_status: 'pending',
    },
  })

  if (insertError) {
    console.error('Failed to create artifact record:', insertError)
    throw new Error(`Failed to create artifact: ${insertError.message}`)
  }

  // Generate presigned URL with SHORT TTL
  const { client, bucketName, config } = createR2Client()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ContentType: input.mime_type,
    ContentLength: input.byte_size,
    Metadata: {
      artifactId,
      organizationId: input.organization_id,
      sourceApp: input.source_app,
    },
  })

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_TTL,
  })

  const expiresAt = new Date(Date.now() + PRESIGNED_URL_TTL * 1000).toISOString()
  const fileUrl = config.publicUrl
    ? `${config.publicUrl}/${storageKey}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${bucketName}/${storageKey}`

  return {
    artifact_id: artifactId as ULID,
    upload_url: uploadUrl,
    storage_key: storageKey,
    file_url: fileUrl,
    deduplicated: false,
    expires_at: expiresAt,
  }
}

/**
 * Confirm upload completion
 *
 * After client uploads to R2, they call this to:
 * 1. Verify the file exists in R2
 * 2. Calculate sha256 server-side (don't trust client)
 * 3. Check for deduplication
 * 4. Update artifact record
 * 5. Write immutable *.uploaded event
 */
export async function confirmUpload(
  input: ConfirmUploadInput
): Promise<ConfirmUploadResult> {
  const supabase = await createClient()

  // Get the pending artifact record
  const { data: artifact, error: fetchError } = await supabase
    .from('core_artifact')
    .select('*')
    .eq('id', input.artifact_id)
    .eq('organization_id', input.organization_id)
    .single()

  if (fetchError || !artifact) {
    throw new Error(`Artifact not found: ${input.artifact_id}`)
  }

  // Check if already confirmed
  if (artifact.metadata?.upload_status === 'confirmed') {
    // Idempotent: return existing result
    const config = getR2Config()
    const fileUrl = config.publicUrl
      ? `${config.publicUrl}/${artifact.storage_key}`
      : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${artifact.storage_key}`

    return {
      artifact_id: artifact.id as ULID,
      sha256: artifact.sha256,
      event_id: artifact.metadata?.event_id as ULID,
      deduplicated: artifact.metadata?.deduplicated || false,
      file_url: fileUrl,
    }
  }

  // Verify file exists in R2 and calculate sha256
  // Verify file and validate against declared metadata
  const { sha256, byteSize, contentType } = await verifyAndHashFile(
    artifact.storage_key,
    artifact.byte_size, // Declared size from upload-request
    artifact.mime_type  // Declared mime from upload-request
  )

  // Check for deduplication with server-calculated sha256
  let deduplicated = false
  const { data: existingWithSameSha } = await supabase
    .from('core_artifact')
    .select('id, storage_key, reference_count')
    .eq('organization_id', input.organization_id)
    .eq('sha256', sha256)
    .neq('id', input.artifact_id)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (existingWithSameSha) {
    // Found a duplicate! This artifact becomes a reference
    deduplicated = true

    // Increment reference count on existing
    await supabase
      .from('core_artifact')
      .update({ reference_count: existingWithSameSha.reference_count + 1 })
      .eq('id', existingWithSameSha.id)

    // Update this artifact to point to same storage (could also just mark as dup)
    // For now we keep both but note the dedup
  }

  // Update artifact record with sha256 and confirmed status
  const eventId = ulid()
  const { error: updateError } = await supabase
    .from('core_artifact')
    .update({
      sha256,
      byte_size: byteSize,
      metadata: {
        ...artifact.metadata,
        schema_version: 1,
        upload_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        event_id: eventId,
        deduplicated,
      },
    })
    .eq('id', input.artifact_id)

  if (updateError) {
    console.error('Failed to update artifact:', updateError)
    throw new Error(`Failed to confirm upload: ${updateError.message}`)
  }

  // Write immutable *.uploaded event
  const eventType = getUploadedEventType(input.source_app, artifact.kind)
  const entityRefs = buildEntityRefs({
    artifact_id: input.artifact_id,
    property_id: input.property_id,
    project_id: input.project_id,
    job_id: input.job_id,
  })

  const { error: eventError } = await supabase.from('core_event').insert({
    id: eventId,
    organization_id: input.organization_id,
    actor_user_id: input.user_id,
    source_app: input.source_app,
    type: eventType,
    immutable: true, // Evidence chain - cannot be deleted!
    occurred_at: artifact.captured_at || new Date().toISOString(),
    property_id: input.property_id,
    project_id: input.project_id || input.job_id,
    entity_refs: entityRefs,
    payload: {
      schema_version: 1,
      artifact_id: input.artifact_id,
      storage_key: artifact.storage_key,
      sha256,
      byte_size: byteSize,
      mime_type: artifact.mime_type,
      deduplicated,
    },
  })

  if (eventError) {
    console.error('Failed to write uploaded event:', eventError)
    // Don't throw - artifact is still valid, just missing event
  }

  const config = getR2Config()
  const fileUrl = config.publicUrl
    ? `${config.publicUrl}/${artifact.storage_key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${artifact.storage_key}`

  return {
    artifact_id: input.artifact_id,
    sha256,
    event_id: eventId as ULID,
    deduplicated,
    file_url: fileUrl,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  }
  return map[mimeType] || ''
}

function getUploadedEventType(sourceApp: SourceApp, kind: string): string {
  // Event type format: domain.object.action
  switch (sourceApp) {
    case 'jss':
      return kind === 'photo' ? 'jss.photo.uploaded' : 'jss.artifact.uploaded'
    case 'snappocket':
      return kind === 'receipt_image'
        ? 'sp.receipt.uploaded'
        : 'sp.artifact.uploaded'
    case 'ledgersnap':
      return 'ls.artifact.uploaded'
    case 'clientsnap':
      return 'cs.artifact.uploaded'
    default:
      return 'core.artifact.uploaded'
  }
}

function buildEntityRefs(refs: {
  artifact_id: string
  property_id?: string
  project_id?: string
  job_id?: string
}): Array<{ entity: string; id: string }> {
  const result: Array<{ entity: string; id: string }> = [
    { entity: 'artifact', id: refs.artifact_id },
  ]

  if (refs.property_id) {
    result.push({ entity: 'property', id: refs.property_id })
  }
  if (refs.project_id) {
    result.push({ entity: 'project', id: refs.project_id })
  }
  if (refs.job_id) {
    result.push({ entity: 'job', id: refs.job_id })
  }

  return result
}

/**
 * Verify file exists in R2, validate metadata, and calculate sha256
 *
 * CRITICAL: This is server-side verification. Never trust client-provided data.
 *
 * Validates:
 * - File exists in R2
 * - byte_size matches declared size (within 5% tolerance for encoding differences)
 * - mime_type from R2 metadata matches declared type
 * - Calculates sha256 server-side
 */
async function verifyAndHashFile(
  storageKey: string,
  declaredByteSize?: number,
  declaredMimeType?: string
): Promise<{ sha256: string; byteSize: number; contentType: string }> {
  const { client, bucketName } = createR2Client()

  // First, get metadata with HeadObject (cheaper than GetObject)
  const headCommand = new HeadObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  })

  let headResponse
  try {
    headResponse = await client.send(headCommand)
  } catch (error) {
    throw new Error(`File not found in R2: ${storageKey}`)
  }

  const actualContentType = headResponse.ContentType || 'application/octet-stream'
  const actualContentLength = headResponse.ContentLength || 0

  // Validate mime_type if declared
  if (declaredMimeType && actualContentType !== declaredMimeType) {
    // Allow some flexibility for JPEG variations
    const isJpegMatch =
      (declaredMimeType === 'image/jpeg' && actualContentType === 'image/jpg') ||
      (declaredMimeType === 'image/jpg' && actualContentType === 'image/jpeg')

    if (!isJpegMatch) {
      console.warn(
        `[Artifact] Content-Type mismatch: declared=${declaredMimeType}, actual=${actualContentType}, key=${storageKey}`
      )
      // Don't throw - just log warning. Some clients may not set Content-Type correctly.
    }
  }

  // Validate byte_size if declared (allow 5% tolerance for encoding differences)
  if (declaredByteSize && actualContentLength) {
    const sizeDiff = Math.abs(actualContentLength - declaredByteSize)
    const tolerance = declaredByteSize * 0.05 // 5%

    if (sizeDiff > tolerance && sizeDiff > 1024) {
      // More than 5% and more than 1KB difference
      console.warn(
        `[Artifact] Size mismatch: declared=${declaredByteSize}, actual=${actualContentLength}, key=${storageKey}`
      )
      // Don't throw - just log warning
    }
  }

  // Now get the file content to calculate sha256
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  })

  const response = await client.send(getCommand)

  if (!response.Body) {
    throw new Error(`File not found in R2: ${storageKey}`)
  }

  // Stream the file and calculate sha256
  const hash = createHash('sha256')
  const chunks: Uint8Array[] = []

  // @ts-expect-error - response.Body is a ReadableStream in browser/edge
  for await (const chunk of response.Body) {
    hash.update(chunk)
    chunks.push(chunk)
  }

  const sha256 = hash.digest('hex')
  const byteSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)

  return { sha256, byteSize, contentType: actualContentType }
}

/**
 * Check if an artifact with the given idempotency key already exists
 */
export async function findByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
): Promise<{ artifact_id: ULID; file_url: string } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('core_artifact')
    .select('id, storage_key')
    .eq('organization_id', organizationId)
    .contains('metadata', { idempotency_key: idempotencyKey })
    .limit(1)
    .single()

  if (!data) return null

  const config = getR2Config()
  const fileUrl = config.publicUrl
    ? `${config.publicUrl}/${data.storage_key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${data.storage_key}`

  return {
    artifact_id: data.id as ULID,
    file_url: fileUrl,
  }
}

// ============================================================================
// Deletion Strategy (Soft Delete with Reference Counting)
// ============================================================================

export interface DecrementRefInput {
  artifact_id: ULID
  organization_id: string
  user_id: string
  source_app: SourceApp
  reason?: string
}

export interface DecrementRefResult {
  artifact_id: ULID
  new_reference_count: number
  orphaned: boolean
  orphaned_at?: string
}

/**
 * Decrement reference count on an artifact
 *
 * When reference_count reaches 0:
 * - Set orphaned_at timestamp
 * - A cron job will delete files where orphaned_at > 30 days
 * - NO physical deletion happens here
 *
 * This preserves evidence chain while allowing cleanup of unused files.
 */
export async function decrementReferenceCount(
  input: DecrementRefInput
): Promise<DecrementRefResult> {
  const supabase = await createClient()

  // Get current artifact state
  const { data: artifact, error: fetchError } = await supabase
    .from('core_artifact')
    .select('id, reference_count, orphaned_at, storage_key, sha256')
    .eq('id', input.artifact_id)
    .eq('organization_id', input.organization_id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !artifact) {
    throw new Error(`Artifact not found: ${input.artifact_id}`)
  }

  // Already orphaned? Idempotent return
  if (artifact.orphaned_at) {
    return {
      artifact_id: input.artifact_id,
      new_reference_count: artifact.reference_count,
      orphaned: true,
      orphaned_at: artifact.orphaned_at,
    }
  }

  // Decrement reference count (floor at 0)
  const newCount = Math.max(0, artifact.reference_count - 1)
  const isOrphaned = newCount === 0
  const orphanedAt = isOrphaned ? new Date().toISOString() : undefined

  // Update artifact
  const updatePayload: Record<string, unknown> = {
    reference_count: newCount,
  }
  if (orphanedAt) {
    updatePayload.orphaned_at = orphanedAt
  }

  const { error: updateError } = await supabase
    .from('core_artifact')
    .update(updatePayload)
    .eq('id', input.artifact_id)

  if (updateError) {
    console.error('Failed to decrement reference count:', updateError)
    throw new Error(`Failed to update artifact: ${updateError.message}`)
  }

  // Write reference change event (mutable - not evidence)
  const eventId = ulid()
  await supabase.from('core_event').insert({
    id: eventId,
    organization_id: input.organization_id,
    actor_user_id: input.user_id,
    source_app: input.source_app,
    type: 'core.artifact.ref_decremented',
    immutable: false, // Reference counting is operational, not evidence
    occurred_at: new Date().toISOString(),
    entity_refs: [{ entity: 'artifact', id: input.artifact_id }],
    payload: {
      schema_version: 1,
      artifact_id: input.artifact_id,
      previous_count: artifact.reference_count,
      new_count: newCount,
      orphaned: isOrphaned,
      reason: input.reason,
    },
  })

  return {
    artifact_id: input.artifact_id,
    new_reference_count: newCount,
    orphaned: isOrphaned,
    orphaned_at: orphanedAt,
  }
}

/**
 * Increment reference count on an artifact
 *
 * Used when:
 * - Linking an existing artifact to a new entity (project, property, etc.)
 * - Restoring an orphaned artifact
 */
export async function incrementReferenceCount(
  artifactId: ULID,
  organizationId: string
): Promise<{ new_reference_count: number }> {
  const supabase = await createClient()

  const { data: artifact, error: fetchError } = await supabase
    .from('core_artifact')
    .select('id, reference_count, orphaned_at')
    .eq('id', artifactId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (fetchError || !artifact) {
    throw new Error(`Artifact not found: ${artifactId}`)
  }

  const newCount = artifact.reference_count + 1

  // If was orphaned, clear orphaned_at (restore)
  const updatePayload: Record<string, unknown> = {
    reference_count: newCount,
  }
  if (artifact.orphaned_at) {
    updatePayload.orphaned_at = null
  }

  const { error: updateError } = await supabase
    .from('core_artifact')
    .update(updatePayload)
    .eq('id', artifactId)

  if (updateError) {
    throw new Error(`Failed to update artifact: ${updateError.message}`)
  }

  return { new_reference_count: newCount }
}

/**
 * Cleanup orphaned artifacts (CRON JOB ONLY)
 *
 * Called by cron job to physically delete files that have been
 * orphaned for more than the retention period (default 30 days).
 *
 * Returns the number of artifacts deleted.
 */
export async function cleanupOrphanedArtifacts(
  retentionDays: number = 30,
  batchSize: number = 100
): Promise<{ deleted_count: number; errors: string[] }> {
  const supabase = await createClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffIso = cutoffDate.toISOString()

  // Find orphaned artifacts older than retention period
  const { data: orphans, error: queryError } = await supabase
    .from('core_artifact')
    .select('id, storage_key, organization_id')
    .lt('orphaned_at', cutoffIso)
    .is('deleted_at', null)
    .limit(batchSize)

  if (queryError) {
    console.error('Failed to query orphaned artifacts:', queryError)
    return { deleted_count: 0, errors: [queryError.message] }
  }

  if (!orphans || orphans.length === 0) {
    return { deleted_count: 0, errors: [] }
  }

  const { client, bucketName } = createR2Client()
  const errors: string[] = []
  let deletedCount = 0

  for (const orphan of orphans) {
    try {
      // Delete from R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: orphan.storage_key,
      })
      await client.send(deleteCommand)

      // Mark as deleted in DB (soft delete, keep record for audit)
      await supabase
        .from('core_artifact')
        .update({
          deleted_at: new Date().toISOString(),
          storage_key: `[DELETED] ${orphan.storage_key}`,
        })
        .eq('id', orphan.id)

      deletedCount++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to delete ${orphan.id}: ${message}`)
      console.error(`[Artifact Cleanup] Failed to delete ${orphan.id}:`, error)
    }
  }

  console.log(
    `[Artifact Cleanup] Deleted ${deletedCount}/${orphans.length} orphaned artifacts`
  )

  return { deleted_count: deletedCount, errors }
}
