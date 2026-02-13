/**
 * POST /api/events/[id]/correct
 *
 * Correction Append API for Immutable Events
 *
 * Immutable events (evidence/financial) cannot be modified or deleted.
 * Instead, this endpoint creates a new correction event that:
 * 1. References the original via corrects_event_id
 * 2. Contains the correction reason and corrected payload
 * 3. Is itself immutable (part of audit trail)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  writeCorrectionEvent,
  type CorrectionInput,
} from '@/lib/services/event-service'
import type { SourceApp, ULID } from '@slo/snap-types'

interface CorrectionBody {
  reason: string
  corrected_payload: Record<string, unknown>
  source_app?: SourceApp
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

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

    const body: CorrectionBody = await request.json()

    // Validate required fields
    if (!body.reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!body.corrected_payload || typeof body.corrected_payload !== 'object') {
      return NextResponse.json(
        { error: 'corrected_payload is required and must be an object' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const input: CorrectionInput = {
      original_event_id: eventId as ULID,
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      source_app: body.source_app || 'jss',
      occurred_at: new Date().toISOString(),
      reason: body.reason,
      corrected_payload: body.corrected_payload,
    }

    const correctionEvent = await writeCorrectionEvent(input)

    return NextResponse.json(
      {
        correction_event_id: correctionEvent.id,
        original_event_id: eventId,
        type: correctionEvent.type,
        created_at: correctionEvent.created_at,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[Correction API Error]', error)

    const message = error instanceof Error ? error.message : 'Internal server error'

    // Special handling for known error cases
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: message },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }
    if (message.includes('only for immutable')) {
      return NextResponse.json(
        { error: message },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
