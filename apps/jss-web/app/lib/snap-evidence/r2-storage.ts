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
