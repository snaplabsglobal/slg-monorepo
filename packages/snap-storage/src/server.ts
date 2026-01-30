// packages/snap-storage/src/server.ts
// Server-side R2 storage utilities

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string
}

/**
 * Get R2 client configuration from environment variables
 * Supports both CLOUDFLARE_* and R2_* variable naming conventions
 */
export function getR2Config(): R2Config {
  // Support both naming conventions: CLOUDFLARE_* and R2_*
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 
    (process.env.R2_ENDPOINT 
      ? process.env.R2_ENDPOINT.match(/https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1]
      : undefined)
  
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Cloudflare R2 credentials not configured. Required: CLOUDFLARE_ACCOUNT_ID (or R2_ENDPOINT), CLOUDFLARE_R2_ACCESS_KEY_ID (or R2_ACCESS_KEY_ID), CLOUDFLARE_R2_SECRET_ACCESS_KEY (or R2_SECRET_ACCESS_KEY), CLOUDFLARE_R2_BUCKET_NAME (or R2_BUCKET_NAME)')
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
 * Initialize S3 client for R2 (R2 is S3-compatible)
 */
export function createR2Client(config?: R2Config) {
  const r2Config = config || getR2Config()

  // Use R2_ENDPOINT if provided, otherwise construct from account ID
  const endpoint = process.env.R2_ENDPOINT || 
    `https://${r2Config.accountId}.r2.cloudflarestorage.com`

  return {
    client: new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    }),
    bucketName: r2Config.bucketName,
    publicUrl: r2Config.publicUrl,
  }
}

/**
 * Generate file path for R2 storage
 */
export function generateFilePath(options: {
  folder: string
  organizationId: string
  transactionId?: string
  filename: string
}): string {
  const { folder, organizationId, transactionId, filename } = options
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

  if (transactionId) {
    return `${folder}/${organizationId}/${transactionId}/${timestamp}-${sanitizedFilename}`
  }
  return `${folder}/${organizationId}/${timestamp}-${sanitizedFilename}`
}

/**
 * Upload file to R2
 */
export async function uploadToR2(
  fileBuffer: Buffer | ArrayBuffer | Uint8Array,
  filePath: string,
  contentType: string,
  metadata?: Record<string, string>
) {
  const { client, bucketName } = createR2Client()

  // Convert to Buffer if needed
  let buffer: Buffer
  if (fileBuffer instanceof Buffer) {
    buffer = fileBuffer
  } else if (fileBuffer instanceof ArrayBuffer) {
    buffer = Buffer.from(new Uint8Array(fileBuffer))
  } else {
    buffer = Buffer.from(fileBuffer)
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  })

  await client.send(command)

  // Generate public URL
  const config = getR2Config()
  const fileUrl = config.publicUrl
    ? `${config.publicUrl}/${filePath}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${filePath}`

  return { fileUrl, filePath }
}

/**
 * Generate presigned URL for direct client upload
 */
export async function generatePresignedUrl(
  filePath: string,
  contentType: string,
  expiresIn: number = 3600,
  metadata?: Record<string, string>
): Promise<{ presignedUrl: string; fileUrl: string }> {
  const { client, bucketName, publicUrl } = createR2Client()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    ContentType: contentType,
    Metadata: metadata,
  })

  const presignedUrl = await getSignedUrl(client, command, { expiresIn })

  // Generate public URL
  const config = getR2Config()
  const fileUrl = (publicUrl || config.publicUrl)
    ? `${publicUrl || config.publicUrl}/${filePath}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${bucketName}/${filePath}`

  return { presignedUrl, fileUrl }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(filePath: string): Promise<void> {
  const { client, bucketName } = createR2Client()

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: filePath,
  })

  await client.send(command)
}
