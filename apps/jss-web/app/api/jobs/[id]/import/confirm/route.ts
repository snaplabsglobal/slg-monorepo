/**
 * POST /api/jobs/:jobId/import/confirm
 *
 * Magic Import MVP - Confirm Endpoint (唯一写入点)
 * Assign selected photos to this job.
 *
 * Request:
 *   { "photo_ids": ["uuid1", "uuid2", ...] }
 *
 * Response:
 *   { "ok": true, "imported_count": number, "job_name": string }
 *
 * DB Rules:
 * - Only update photos where job_id IS NULL (prevent double-import)
 * - Must be idempotent: repeated calls don't error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const photoIds = body.photo_ids as string[]

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'photo_ids array is required' },
        { status: 400 }
      )
    }

    // Get job to verify it exists and get name
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, name, organization_id')
      .eq('id', jobId)
      .is('deleted_at', null)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Update photos - only those with job_id IS NULL (idempotent)
    // This prevents double-importing photos that are already assigned
    const { data: updated, error: updateError } = await supabase
      .from('job_photos')
      .update({
        job_id: jobId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', job.organization_id)
      .is('job_id', null)
      .is('deleted_at', null)
      .in('id', photoIds)
      .select('id')

    if (updateError) {
      console.error('Error importing photos:', updateError)
      return NextResponse.json(
        { error: 'Failed to import photos' },
        { status: 500 }
      )
    }

    const importedCount = updated?.length || 0

    console.log('[Magic Import] Confirmed', {
      jobId,
      jobName: job.name,
      requestedCount: photoIds.length,
      importedCount,
      userId: user.id,
    })

    return NextResponse.json(
      {
        ok: true,
        imported_count: importedCount,
        job_name: job.name,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Import confirm error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
