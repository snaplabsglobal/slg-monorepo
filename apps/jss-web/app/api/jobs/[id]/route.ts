import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateJobRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Job GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (deleteError) {
      console.error('Error deleting job:', deleteError)
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Job DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
