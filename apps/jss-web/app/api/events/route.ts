/**
 * POST /api/events
 *
 * Write Event API
 *
 * Creates a new event in the timeline. Immutability is automatically
 * enforced by the database trigger for whitelisted event types.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeEvent, type WriteEventInput, type EntityRef } from '@/lib/services/event-service'
import type { SourceApp } from '@slo/snap-types'

interface WriteEventBody {
  type: string
  source_app?: SourceApp | 'fridge_tag' | 'system'
  occurred_at: string
  entity_refs: EntityRef[]
  property_id?: string
  project_id?: string
  payload?: Record<string, unknown>
  device_local_time?: string
  tz_offset?: string
  immutable?: boolean
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

export async function POST(request: NextRequest) {
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

    const body: WriteEventBody = await request.json()

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.occurred_at) {
      return NextResponse.json(
        { error: 'occurred_at is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.entity_refs || body.entity_refs.length === 0) {
      return NextResponse.json(
        { error: 'entity_refs must contain at least one reference' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const input: WriteEventInput = {
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      source_app: body.source_app || 'jss',
      type: body.type,
      occurred_at: body.occurred_at,
      entity_refs: body.entity_refs,
      property_id: body.property_id,
      project_id: body.project_id,
      payload: body.payload,
      device_local_time: body.device_local_time,
      tz_offset: body.tz_offset,
      immutable: body.immutable,
    }

    const event = await writeEvent(input)

    return NextResponse.json(
      {
        event_id: event.id,
        type: event.type,
        immutable: event.immutable,
        occurred_at: event.occurred_at,
        created_at: event.created_at,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[Event Write API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
