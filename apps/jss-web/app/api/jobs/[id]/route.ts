import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateJobRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Force no caching for all responses
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

/**
 * GET /api/jobs/[id] - Get job details with photo count and areas/trades
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job with photo count, areas, and trades
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        job_photos(count),
        job_areas(id, name),
        job_trades(id, name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      console.error('Error fetching job:', jobError)
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }

    // Get last photo timestamp
    const { data: lastPhoto } = await supabase
      .from('job_photos')
      .select('taken_at')
      .eq('job_id', id)
      .is('deleted_at', null)
      .order('taken_at', { ascending: false })
      .limit(1)
      .single()

    const response = {
      ...job,
      photo_count: job.job_photos?.[0]?.count || 0,
      last_photo_at: lastPhoto?.taken_at || null,
      areas: job.job_areas || [],
      trades: job.job_trades || [],
      job_photos: undefined,
      job_areas: undefined,
      job_trades: undefined,
    }

    return NextResponse.json(response, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('Job GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

/**
 * PATCH /api/jobs/[id] - Update job
 * Body: { name?: string, address?: string, status?: 'active' | 'archived' }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateJobRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Job name cannot be empty' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }
    if (body.address !== undefined) {
      updates.address = body.address?.trim() || null
    }
    if (body.place_id !== undefined) {
      updates.place_id = body.place_id || null
    }
    if (body.geofence_lat !== undefined && body.geofence_lng !== undefined) {
      updates.geofence_lat = body.geofence_lat
      updates.geofence_lng = body.geofence_lng
    }
    if (body.status !== undefined) {
      if (!['active', 'archived'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      console.error('Error updating job:', updateError)
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }

    return NextResponse.json(job, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('Job PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

/**
 * DELETE /api/jobs/[id] - Soft delete job
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    const deletedAt = new Date().toISOString()

    // Soft delete with count check
    const { data: deletedJobs, error: deleteError } = await supabase
      .from('jobs')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')

    // Log for debugging
    console.log('[DELETE /api/jobs/:id]', {
      jobId: id,
      userId: user.id,
      deletedCount: deletedJobs?.length ?? 0,
      error: deleteError?.message ?? null,
    })

    if (deleteError) {
      console.error('Error deleting job:', deleteError)
      return NextResponse.json(
        { ok: false, error: 'Failed to delete job', details: deleteError.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    if (!deletedJobs || deletedJobs.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Job not found or already deleted' },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { ok: true, deletedId: id, deletedAt, deletedCount: deletedJobs.length },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Job DELETE error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
