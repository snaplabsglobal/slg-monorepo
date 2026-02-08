/**
 * POST /api/rescue/sessions
 * Create a new rescue session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RescueSource } from '@/lib/rescue/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const source = (body.source as RescueSource) || 'phone_camera_roll'

    // Generate session ID
    const sessionId = `rescue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    // For Phase 1, we store session data in-memory or local storage
    // In production, this would go to a database table
    const session = {
      sessionId,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'created' as const,
      source,
    }

    // Note: In Phase 1, session state is managed client-side
    // This endpoint just validates auth and returns a session ID

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('[rescue/sessions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
