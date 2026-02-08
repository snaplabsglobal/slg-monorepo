import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreatePhotoRequest, PhotoListResponse, PhotoFilters } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/[id]/photos - List photos for a job
 * Query params:
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 *   - stage: 'before' | 'during' | 'after'
 *   - area: string
 *   - trade: string
 *   - dateFrom: ISO date string
 *   - dateTo: ISO date string
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Filters
    const filters: PhotoFilters = {
      stage: searchParams.get('stage') as PhotoFilters['stage'] || undefined,
      area: searchParams.get('area') || undefined,
      trade: searchParams.get('trade') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    }

    // Build query
    let query = supabase
      .from('job_photos')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('taken_at', { ascending: false })

    // Apply filters
    if (filters.stage) {
      query = query.eq('stage', filters.stage)
    }
    if (filters.area) {
      query = query.eq('area', filters.area)
    }
    if (filters.trade) {
      query = query.eq('trade', filters.trade)
    }
    if (filters.dateFrom) {
      query = query.gte('taken_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('taken_at', filters.dateTo)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: photos, error: photosError, count } = await query

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    const response: PhotoListResponse = {
      photos: photos || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Photos GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/jobs/[id]/photos - Create photo record after successful R2 upload
 * Body: CreatePhotoRequest
 *
 * Supports idempotent upsert when client_photo_id is provided.
 * Retry uploads with same client_photo_id will update, not duplicate.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify job exists and user has access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id')
      .eq('id', jobId)
      .is('deleted_at', null)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json() as CreatePhotoRequest & {
      client_photo_id?: string
      r2_key?: string
    }

    if (!body.file_url) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 })
    }

    const photoData = {
      job_id: jobId,
      organization_id: job.organization_id,
      file_url: body.file_url,
      taken_at: body.taken_at || new Date().toISOString(),
      stage: body.stage || null,
      area: body.area || null,
      trade: body.trade || null,
      file_size: body.file_size || null,
      mime_type: body.mime_type || 'image/jpeg',
      // Idempotency fields
      client_photo_id: body.client_photo_id || null,
      r2_key: body.r2_key || null,
    }

    let photo
    let dbError

    if (body.client_photo_id) {
      // 🔐 Idempotent mode: upsert by client_photo_id
      const result = await supabase
        .from('job_photos')
        .upsert(photoData, {
          onConflict: 'client_photo_id',
          ignoreDuplicates: false, // Update on conflict
        })
        .select()
        .single()

      photo = result.data
      dbError = result.error

      if (!dbError) {
        console.log(`[SnapEvidence] Photo upsert success: client_photo_id=${body.client_photo_id}`)
      }
    } else {
      // Legacy mode: plain insert
      const result = await supabase
        .from('job_photos')
        .insert(photoData)
        .select()
        .single()

      photo = result.data
      dbError = result.error
    }

    if (dbError) {
      console.error('Error creating photo:', dbError)
      return NextResponse.json({ error: 'Failed to create photo record' }, { status: 500 })
    }

    // Update job's updated_at timestamp
    await supabase
      .from('jobs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Photos POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
