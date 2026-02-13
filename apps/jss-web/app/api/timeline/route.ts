/**
 * GET /api/timeline
 *
 * Minimal Timeline Query API
 *
 * Query params:
 * - property_id: Filter by property (required if no project_id)
 * - project_id: Filter by project/job (required if no property_id)
 * - cursor: ULID of last event seen (optional, for pagination)
 * - limit: Number of events to return (optional, default 50, max 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryTimeline, type TimelineQuery } from '@/lib/services/event-service'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

export async function GET(request: NextRequest) {
  try {
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

    // Get organization
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const projectId = searchParams.get('project_id')
    const cursor = searchParams.get('cursor')
    const limitStr = searchParams.get('limit')

    // Validate: must have property_id or project_id
    if (!propertyId && !projectId) {
      return NextResponse.json(
        { error: 'Either property_id or project_id is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const query: TimelineQuery = {
      organization_id: membership.organization_id,
      property_id: propertyId || undefined,
      project_id: projectId || undefined,
      cursor: cursor || undefined,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    }

    const result = await queryTimeline(query)

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[Timeline API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
