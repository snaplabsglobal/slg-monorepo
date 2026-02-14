import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generatePresignedUrlForKey,
  buildR2Key,
} from '@/lib/snap-evidence/r2-storage'
import { getUploadProvider } from '@/lib/env-check'
import { shouldUseMockStorage, generateMockPresignedUrl } from '@/lib/storage/mock-storage'
import type { PhotoUploadRequest, PhotoUploadResponse } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/jobs/[id]/photos/upload - Generate presigned URL for direct R2 upload
 *
 * Body (idempotent mode - preferred):
 *   { photo_id: string, r2_key: string, contentType: string }
 *
 * Body (legacy mode):
 *   { filename: string, contentType: string }
 *
 * Returns: { presignedUrl: string, fileUrl: string, filePath: string }
 *
 * CRITICAL: Uses SnapEvidence R2 bucket (dev-slg-media / slg-media)
 * NOT the receipts bucket
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Check storage provider
    const uploadProvider = getUploadProvider()
    const useMockStorage = shouldUseMockStorage()

    // Log which storage mode we're using
    if (useMockStorage) {
      console.log('[SnapEvidence] Using MOCK storage (R2 not configured)')
    } else {
      console.log('[SnapEvidence] Using R2 storage')
    }

    const { id: jobId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify job exists and get organization_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id')
      .eq('id', jobId)
      .is('deleted_at', null)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json() as PhotoUploadRequest & {
      photo_id?: string
      r2_key?: string
    }

    // Validate content type
    const contentType = body.contentType
    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType is required' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Allowed: ' + allowedTypes.join(', ') },
        { status: 400 }
      )
    }

    // Determine R2 key (idempotent mode vs legacy mode)
    let r2Key: string
    let photoId: string

    if (body.r2_key && body.photo_id) {
      // ✅ Idempotent mode: client provides stable key
      r2Key = body.r2_key
      photoId = body.photo_id
      console.log(`[SnapEvidence] Using client-provided r2_key (idempotent): ${r2Key}`)
    } else if (body.photo_id) {
      // Client provides photo_id, server generates key
      photoId = body.photo_id
      r2Key = buildR2Key(jobId, photoId, 'preview')
      console.log(`[SnapEvidence] Generated r2_key from photo_id: ${r2Key}`)
    } else {
      // Legacy mode: server generates both (not idempotent on retry)
      photoId = crypto.randomUUID()
      r2Key = buildR2Key(jobId, photoId, 'preview')
      console.log(`[SnapEvidence] Legacy mode - generated new photo_id: ${photoId}`)
    }

    // Generate presigned URL using stable key
    let presignedUrl: string
    let fileUrl: string
    let bucket: string

    if (useMockStorage) {
      // Use mock storage for local development
      const mockResult = generateMockPresignedUrl(r2Key, contentType, {
        'job-id': jobId,
        'org-id': job.organization_id,
        'user-id': user.id,
        'photo-id': photoId,
      })
      presignedUrl = mockResult.presignedUrl
      fileUrl = mockResult.fileUrl
      bucket = mockResult.bucket
      console.log(`[MockStorage] Presigned URL generated: bucket=${bucket}, key=${r2Key}`)
    } else {
      // Use real R2 storage
      const r2Result = await generatePresignedUrlForKey(
        r2Key,
        contentType,
        3600, // 1 hour expiry
        {
          'x-amz-meta-job-id': jobId,
          'x-amz-meta-org-id': job.organization_id,
          'x-amz-meta-user-id': user.id,
          'x-amz-meta-photo-id': photoId,
        }
      )
      presignedUrl = r2Result.presignedUrl
      fileUrl = r2Result.fileUrl
      bucket = r2Result.bucket
      console.log(`[SnapEvidence] Presigned URL generated: bucket=${bucket}, key=${r2Key}`)
    }

    const response: PhotoUploadResponse = {
      presignedUrl,
      fileUrl,
      filePath: r2Key,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Photo upload presign error:', error)

    // Check if it's an R2 configuration error
    if (error instanceof Error && (
      error.message.includes('not configured') ||
      error.message.includes('BUCKET MISMATCH') ||
      error.message.includes('KEY PREFIX MISMATCH')
    )) {
      return NextResponse.json(
        { error: 'Storage not configured correctly. Please contact support.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
