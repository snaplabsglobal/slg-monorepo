import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteSnapEvidencePhoto } from '@/lib/snap-evidence/r2-storage'
import type { UpdatePhotoRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string; photoId: string }>
}

/**
 * GET /api/jobs/[id]/photos/[photoId] - Get single photo details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId, photoId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: photo, error: photoError } = await supabase
      .from('job_photos')
      .select('*')
      .eq('id', photoId)
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .single()

    if (photoError) {
      if (photoError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
      }
      console.error('Error fetching photo:', photoError)
      return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 })
    }

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Photo GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/jobs/[id]/photos/[photoId] - Update photo metadata
 * Body: { stage?: string, area?: string, trade?: string }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId, photoId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdatePhotoRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.stage !== undefined) {
      if (body.stage !== null && !['before', 'during', 'after'].includes(body.stage)) {
        return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 })
      }
      updates.stage = body.stage
    }
    if (body.area !== undefined) {
      updates.area = body.area
    }
    if (body.trade !== undefined) {
      updates.trade = body.trade
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: photo, error: updateError } = await supabase
      .from('job_photos')
      .update(updates)
      .eq('id', photoId)
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
      }
      console.error('Error updating photo:', updateError)
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
    }

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Photo PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/jobs/[id]/photos/[photoId] - Delete photo (soft delete + R2 cleanup)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId, photoId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get photo to find file path for R2 cleanup
    const { data: photo, error: fetchError } = await supabase
      .from('job_photos')
      .select('file_url')
      .eq('id', photoId)
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Soft delete in database
    const { error: deleteError } = await supabase
      .from('job_photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photoId)
      .eq('job_id', jobId)

    if (deleteError) {
      console.error('Error deleting photo:', deleteError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    // Try to delete from R2 (don't fail if this fails)
    try {
      // Extract file path from URL
      const url = new URL(photo.file_url)
      const filePath = url.pathname.replace(/^\//, '')
      // Only delete if it's a SnapEvidence path (jobs/ prefix)
      if (filePath.startsWith('jobs/')) {
        await deleteSnapEvidencePhoto(filePath)
      }
    } catch (r2Error) {
      console.warn('Failed to delete photo from R2:', r2Error)
      // Don't fail the request - the DB record is already marked deleted
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Photo DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
