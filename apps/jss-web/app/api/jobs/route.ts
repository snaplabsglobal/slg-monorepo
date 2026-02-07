import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateJobRequest, Job, JobListResponse } from '@/lib/types'

/**
 * GET /api/jobs - List jobs for the user's organization
 * Query params:
 *   - status: 'active' | 'archived' | 'all' (default: 'active')
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('jobs')
      .select('*, job_photos(count)', { count: 'exact' })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: jobs, error: jobsError, count } = await query

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Transform to include photo_count
    const jobsWithCount: Job[] = (jobs || []).map((job) => ({
      ...job,
      photo_count: job.job_photos?.[0]?.count || 0,
      job_photos: undefined,
    }))

    const response: JobListResponse = {
      jobs: jobsWithCount,
      total: count || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Jobs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/jobs - Create a new job
 * Body: { name: string, address?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const body: CreateJobRequest = await request.json()

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Job name is required' }, { status: 400 })
    }

    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        organization_id: membership.organization_id,
        name: body.name.trim(),
        address: body.address?.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating job:', insertError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Jobs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
