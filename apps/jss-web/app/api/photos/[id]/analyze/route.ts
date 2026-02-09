import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photos/[id]/analyze
 * Analyze a photo using AI (scene detection, tagging, etc.)
 *
 * Called by cron job, secured with CRON_SECRET
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Auth check (cron secret or user session)
    const auth = request.headers.get('Authorization')
    const secret = process.env.CRON_SECRET

    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: photoId } = await context.params

    // Supabase client with service role for cron
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase env' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, serviceKey)

    // Get photo with file_url
    const { data: photo, error: photoError } = await supabase
      .from('job_photos')
      .select('id, job_id, file_url, r2_key, taken_at, stage')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // TODO: Implement actual AI analysis here
    // For now, we just mark it as analyzed with placeholder tags
    //
    // Future implementation:
    // 1. Fetch image from R2 using file_url
    // 2. Send to Gemini/OpenAI Vision API
    // 3. Extract: scene type, objects, construction phase, safety issues, etc.
    // 4. Store results in job_photos.ai_tags or separate table

    const analysisResult = {
      analyzed_at: new Date().toISOString(),
      model: 'placeholder-v1',
      tags: [],
      scene_type: null,
      confidence: 0,
    }

    // Update photo with analysis result
    const { error: updateError } = await supabase
      .from('job_photos')
      .update({
        ai_analyzed_at: analysisResult.analyzed_at,
        // ai_tags: analysisResult.tags, // Add column if needed
      })
      .eq('id', photoId)

    if (updateError) {
      console.error('[analyze] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      photo_id: photoId,
      analysis: analysisResult,
    })

  } catch (error) {
    console.error('[analyze] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
