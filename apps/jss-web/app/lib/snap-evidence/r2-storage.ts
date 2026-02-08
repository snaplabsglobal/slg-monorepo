/**
 * SnapEvidence R2 Storage
 * Dedicated R2 client for SnapEvidence photos - ISOLATED from receipts bucket
 *
 * CRITICAL: This module MUST use R2_BUCKET_SNAP_EVIDENCE
 * NEVER fall back to receipts bucket or any other bucket
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { PhotoVariant, PhotoItem } from './types'

// ============================================================================
// R2 Key规范 - 幂等性保护
// ============================================================================

/**
 * Build stable R2 object key for a photo item + variant.
 * MUST be called once at capture/save time and reused forever.
 *
 * Key format: jobs/{jobId}/photos/{photoId}/{variant}.jpg
 *
 * @param jobId - Owner job UUID
 * @param photoId - Photo UUID (= PhotoItem.id)
 * @param variant - Photo variant (preview/original/wm)
 * @returns Stable R2 object key
 *
 * @example
 * buildR2Key("job-123", "photo-456", "preview")
 * // => "jobs/job-123/photos/photo-456/preview.jpg"
 */
export function buildR2Key(
  jobId: string,
  photoId: string,
  variant: PhotoVariant = 'preview'
): string {
  const base = `jobs/${jobId}/photos/${photoId}`

  switch (variant) {
    case 'preview':
      return `${base}/preview.jpg`
    case 'original':
      return `${base}/original.jpg`
    case 'wm':
      return `${base}/wm.jpg`
    default:
      return `${base}/preview.jpg`
  }
}

/**
 * Build legacy R2 key for old photos (compatibility only).
 * DO NOT use for new photos.
 */
function buildLegacyR2Key(
  jobId: string,
  photoId: string,
  takenAtISO: string
): string {
  const d = new Date(takenAtISO)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')

  return `jobs/${jobId}/evidence/${yyyy}/${mm}/${dd}/${photoId}.jpg`
}

/**
 * Resolve R2 key for a photo item (supports legacy format).
 * New photos: use r2_key field
 * Old photos: fallback to legacy key format
 *
 * @param item - PhotoItem
 * @returns R2 object key
 */
export function resolveR2Key(item: PhotoItem): string {
  // New photos: have r2_key set at capture time
  if (item.r2_key) {
    return item.r2_key
  }

  // Old photos: fallback to legacy format
  return buildLegacyR2Key(item.job_id, item.id, item.taken_at)
}

// ============================================================================
// R2 Configuration
// ============================================================================

// Expected bucket names - hard-coded for validation
const EXPECTED_BUCKETS = {
  dev: 'dev-slg-media',
  prod: 'slg-media',
} as const

// Required key prefix for SnapEvidence photos
const REQUIRED_KEY_PREFIX = 'jobs/'

/**
 * SnapEvidence R2 configuration
 * Uses separate env variables from receipts
 */
interface SnapEvidenceR2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}

/**
 * Get SnapEvidence R2 configuration
 * MUST use R2_BUCKET_SNAP_EVIDENCE - no fallback to other buckets
 */
function getSnapEvidenceConfig(): SnapEvidenceR2Config {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID_SNAP_EVIDENCE ||
    process.env.R2_ACCESS_KEY_ID
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY_SNAP_EVIDENCE ||
    process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_SNAP_EVIDENCE
  const publicUrl = process.env.R2_PUBLIC_URL_SNAP_EVIDENCE

  // Hard validation: bucket must be explicitly configured
  if (!bucketName) {
    throw new Error(
      'SnapEvidence R2 bucket not configured. ' +
      'Required: R2_BUCKET_SNAP_EVIDENCE (expected: dev-slg-media or slg-media). ' +
      'DO NOT use receipts bucket for SnapEvidence photos.'
    )
  }

  // Hard validation: bucket must match expected names
  const validBuckets = Object.values(EXPECTED_BUCKETS)
  if (!validBuckets.includes(bucketName as typeof validBuckets[number])) {
    throw new Error(
      `Invalid SnapEvidence bucket: "${bucketName}". ` +
      `Expected one of: ${validBuckets.join(', ')}. ` +
      'SnapEvidence photos MUST NOT use receipts bucket.'
    )
  }

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'SnapEvidence R2 credentials not configured. ' +
      'Required: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID (or R2_ACCESS_KEY_ID_SNAP_EVIDENCE), ' +
      'R2_SECRET_ACCESS_KEY (or R2_SECRET_ACCESS_KEY_SNAP_EVIDENCE)'
    )
  }

  if (!publicUrl) {
    throw new Error(
      'SnapEvidence R2 public URL not configured. ' +
      'Required: R2_PUBLIC_URL_SNAP_EVIDENCE'
    )
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  }
}

/**
 * Create S3 client for SnapEvidence R2
 */
function createSnapEvidenceClient(): {
  client: S3Client
  bucketName: string
  publicUrl: string
} {
  const config = getSnapEvidenceConfig()

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`

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
  }
}

/**
 * Assert bucket and key are valid for SnapEvidence
 * Throws if validation fails - no silent fallback
 */
function assertValidUpload(bucket: string, key: string): void {
  // Validate bucket
  const validBuckets = Object.values(EXPECTED_BUCKETS)
  if (!validBuckets.includes(bucket as typeof validBuckets[number])) {
    throw new Error(
      `[SnapEvidence] BUCKET MISMATCH: Attempted upload to "${bucket}" ` +
      `but expected one of: ${validBuckets.join(', ')}. ` +
      'This is a critical configuration error. Upload aborted.'
    )
  }

  // Validate key prefix
  if (!key.startsWith(REQUIRED_KEY_PREFIX)) {
    throw new Error(
      `[SnapEvidence] KEY PREFIX MISMATCH: Key "${key}" does not start with "${REQUIRED_KEY_PREFIX}". ` +
      'All SnapEvidence photos must be stored under jobs/ prefix. Upload aborted.'
    )
  }
}

/**
 * Generate object key for SnapEvidence photo
 * Format: jobs/{jobId}/evidence/{yyyy}/{mm}/{dd}/{photoId}.jpg
 */
export function generateEvidenceKey(
  jobId: string,
  photoId: string,
  extension: string = 'jpg'
): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')

  // Validate inputs
  if (!jobId || jobId.length < 8) {
    throw new Error('Invalid jobId for SnapEvidence key generation')
  }
  if (!photoId || photoId.length < 8) {
    throw new Error('Invalid photoId for SnapEvidence key generation')
  }

  return `jobs/${jobId}/evidence/${yyyy}/${mm}/${dd}/${photoId}.${extension}`
}

/**
 * Generate presigned URL for SnapEvidence photo upload
 * Includes hard validation to prevent wrong-bucket uploads
 */
export async function generateSnapEvidencePresignedUrl(
  jobId: string,
  photoId: string,
  contentType: string,
  expiresIn: number = 3600,
  metadata?: Record<string, string>
): Promise<{
  presignedUrl: string
  fileUrl: string
  filePath: string
  bucket: string
}> {
  const { client, bucketName, publicUrl } = createSnapEvidenceClient()

  // Generate key with proper format
  const extension = contentType === 'image/png' ? 'png' : 'jpg'
  const filePath = generateEvidenceKey(jobId, photoId, extension)

  // CRITICAL: Validate bucket and key before generating presigned URL
  assertValidUpload(bucketName, filePath)

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    ContentType: contentType,
    Metadata: {
      ...metadata,
      'x-snap-evidence-version': 'v1',
      'x-snap-job-id': jobId,
      'x-snap-photo-id': photoId,
    },
  })

  const presignedUrl = await getSignedUrl(client, command, { expiresIn })
  const fileUrl = `${publicUrl}/${filePath}`

  console.log(
    `[SnapEvidence] Generated presigned URL for bucket=${bucketName}, key=${filePath}`
  )

  return {
    presignedUrl,
    fileUrl,
    filePath,
    bucket: bucketName,
  }
}

/**
 * Generate presigned URL for a specific R2 key (idempotent).
 * Use this when client provides the stable r2_key.
 *
 * @param r2Key - Stable R2 object key from client (e.g., jobs/{jobId}/photos/{photoId}/preview.jpg)
 * @param contentType - MIME type
 * @param expiresIn - URL expiry in seconds
 * @param metadata - Optional metadata
 */
export async function generatePresignedUrlForKey(
  r2Key: string,
  contentType: string,
  expiresIn: number = 3600,
  metadata?: Record<string, string>
): Promise<{
  presignedUrl: string
  fileUrl: string
  r2Key: string
  bucket: string
}> {
  const { client, bucketName, publicUrl } = createSnapEvidenceClient()

  // Validate key format
  assertValidUpload(bucketName, r2Key)

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    ContentType: contentType,
    Metadata: {
      ...metadata,
      'x-snap-evidence-version': 'v2',
    },
  })

  const presignedUrl = await getSignedUrl(client, command, { expiresIn })
  const fileUrl = `${publicUrl}/${r2Key}`

  console.log(`[SnapEvidence] Presigned URL for stable key: bucket=${bucketName}, key=${r2Key}`)

  return {
    presignedUrl,
    fileUrl,
    r2Key,
    bucket: bucketName,
  }
}

/**
 * Delete SnapEvidence photo from R2
 * Only allows deletion from valid SnapEvidence buckets
 */
export async function deleteSnapEvidencePhoto(filePath: string): Promise<void> {
  const { client, bucketName } = createSnapEvidenceClient()

  // Validate before delete
  assertValidUpload(bucketName, filePath)

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: filePath,
  })

  await client.send(command)

  console.log(
    `[SnapEvidence] Deleted photo from bucket=${bucketName}, key=${filePath}`
  )
}

/**
 * Get current bucket configuration (for debugging/verification)
 */
export function getSnapEvidenceBucketInfo(): {
  bucket: string
  publicUrl: string
  isValid: boolean
} {
  try {
    const config = getSnapEvidenceConfig()
    const validBuckets = Object.values(EXPECTED_BUCKETS)
    return {
      bucket: config.bucketName,
      publicUrl: config.publicUrl,
      isValid: validBuckets.includes(config.bucketName as typeof validBuckets[number]),
    }
  } catch {
    return {
      bucket: 'NOT_CONFIGURED',
      publicUrl: '',
      isValid: false,
    }
  }
}
