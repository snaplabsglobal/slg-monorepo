/**
 * POST /api/artifacts/upload-request
 *
 * Artifact Service - Request Upload URL
 *
 * This is THE ONLY entry point for file uploads in SLG.
 * All apps (JSS, SnapPocket, ClientSnap) must use this endpoint.
 *
 * Flow:
 * 1. Client sends metadata (kind, mime_type, captured_at, etc.)
 * 2. Server generates artifact_id, storage_key, presigned URL
 * 3. Client uploads directly to R2 using presigned URL
 * 4. Client calls /api/artifacts/confirm-upload to finalize
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requestUpload,
  findByIdempotencyKey,
  type UploadRequestInput,
} from '@/lib/services/artifact-service'
import type { ArtifactKind, SourceApp } from '@slo/snap-types'

// Request body schema
interface UploadRequestBody {
  idempotency_key: string
  kind: ArtifactKind
  mime_type: string
  byte_size: number
  source_app: SourceApp
  captured_at: string

  // Optional
  sha256?: string
  geo_lat?: number
  geo_lng?: number
  device_id?: string
  device_local_time?: string
  tz_offset?: string

  // Context (optional - can be set at confirm time)
  property_id?: string
  project_id?: string
  job_id?: string
}

// Response headers - no caching
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // 2. Get user's organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    // 3. Parse request body
    const body: UploadRequestBody = await request.json()

    // 4. Validate required fields
    if (!body.idempotency_key) {
      return NextResponse.json(
        { error: 'idempotency_key is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.kind) {
      return NextResponse.json(
        { error: 'kind is required (photo, receipt_image, pdf, etc.)' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.mime_type) {
      return NextResponse.json(
        { error: 'mime_type is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.byte_size || body.byte_size <= 0) {
      return NextResponse.json(
        { error: 'byte_size must be a positive number' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.source_app) {
      return NextResponse.json(
        { error: 'source_app is required (jss, snappocket, ledgersnap, etc.)' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.captured_at) {
      return NextResponse.json(
        { error: 'captured_at is required (evidence chain - use capture time, not upload time!)' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // 5. Check idempotency - if we already have this upload, return it
    const existing = await findByIdempotencyKey(
      membership.organization_id,
      body.idempotency_key
    )

    if (existing) {
      return NextResponse.json(
        {
          artifact_id: existing.artifact_id,
          upload_url: '', // Already uploaded
          storage_key: '',
          file_url: existing.file_url,
          deduplicated: true,
          expires_at: new Date().toISOString(),
          idempotent: true, // Signal this is a repeated request
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 6. Request upload URL
    const input: UploadRequestInput = {
      idempotency_key: body.idempotency_key,
      kind: body.kind,
      mime_type: body.mime_type,
      byte_size: body.byte_size,
      source_app: body.source_app,
      captured_at: body.captured_at,
      sha256: body.sha256,
      geo_lat: body.geo_lat,
      geo_lng: body.geo_lng,
      device_id: body.device_id,
      device_local_time: body.device_local_time,
      tz_offset: body.tz_offset,
      organization_id: membership.organization_id,
      user_id: user.id,
      property_id: body.property_id,
      project_id: body.project_id,
      job_id: body.job_id,
    }

    const result = await requestUpload(input)

    // 7. Return result
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[Artifact Upload Request Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
