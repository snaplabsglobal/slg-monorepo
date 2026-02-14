import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photos/[id]/pending-analysis
 * Register a photo for async analysis (called after upload success)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: photoId } = await context.params
    const supabase = await createClient()

    // Get photo to verify it exists and get job_id
    const { data: photo, error: photoError } = await supabase
      .from('job_photos')
      .select('id, job_id')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Insert into queue (upsert to handle retries)
    const { error: insertError } = await supabase
      .from('pending_photo_analysis')
      .upsert(
        {
          photo_id: photo.id,
          job_id: photo.job_id,
          status: 'pending',
          retry_count: 0,
          next_attempt_at: new Date().toISOString(),
        },
        {
          onConflict: 'photo_id',
          ignoreDuplicates: false,
        }
      )

    if (insertError) {
      console.error('[pending-analysis] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to queue analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, photo_id: photoId })
  } catch (error) {
    console.error('[pending-analysis] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
