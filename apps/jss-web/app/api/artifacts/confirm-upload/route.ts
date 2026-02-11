/**
 * POST /api/artifacts/confirm-upload
 *
 * Artifact Service - Confirm Upload Completion
 *
 * After client uploads to R2 using the presigned URL, they call this to:
 * 1. Verify file exists in R2
 * 2. Calculate sha256 SERVER-SIDE (don't trust client!)
 * 3. Check for deduplication
 * 4. Update artifact record
 * 5. Write immutable *.uploaded event
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  confirmUpload,
  type ConfirmUploadInput,
} from '@/lib/services/artifact-service'
import type { SourceApp } from '@slo/snap-types'

// Request body schema
interface ConfirmUploadBody {
  artifact_id: string
  source_app: SourceApp

  // Optional entity refs for the uploaded event
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
    const body: ConfirmUploadBody = await request.json()

    // 4. Validate required fields
    if (!body.artifact_id) {
      return NextResponse.json(
        { error: 'artifact_id is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.source_app) {
      return NextResponse.json(
        { error: 'source_app is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // 5. Confirm the upload
    const input: ConfirmUploadInput = {
      artifact_id: body.artifact_id,
      organization_id: membership.organization_id,
      user_id: user.id,
      source_app: body.source_app,
      property_id: body.property_id,
      project_id: body.project_id,
      job_id: body.job_id,
    }

    const result = await confirmUpload(input)

    // 6. Return result
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[Artifact Confirm Upload Error]', error)

    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404, headers: NO_CACHE_HEADERS }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
