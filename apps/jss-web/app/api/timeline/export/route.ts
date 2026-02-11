/**
 * POST /api/timeline/export
 *
 * Timeline Export with Audit Trail
 *
 * Exports timeline events for a property/project.
 * CRITICAL: Writes immutable timeline.exported event for evidence chain.
 *
 * Use cases:
 * - Legal discovery
 * - Insurance claims
 * - Client handoff
 * - Compliance audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ulid } from '@slo/shared-utils'
import type { ULID } from '@slo/snap-types'

interface ExportRequest {
  property_id?: string
  project_id?: string
  from_date?: string // ISO date
  to_date?: string // ISO date
  include_artifacts?: boolean
  export_format?: 'json' | 'csv'
  purpose?: string // e.g., "legal_discovery", "insurance_claim", "client_handoff"
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

    const body: ExportRequest = await request.json()

    // Validate: must have property_id or project_id
    if (!body.property_id && !body.project_id) {
      return NextResponse.json(
        { error: 'Either property_id or project_id is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Build query
    let query = supabase
      .from('core_event')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('occurred_at', { ascending: true })

    if (body.property_id) {
      query = query.eq('property_id', body.property_id)
    } else if (body.project_id) {
      query = query.eq('project_id', body.project_id)
    }

    if (body.from_date) {
      query = query.gte('occurred_at', body.from_date)
    }
    if (body.to_date) {
      query = query.lte('occurred_at', body.to_date)
    }

    const { data: events, error: queryError } = await query

    if (queryError) {
      throw new Error(`Failed to query timeline: ${queryError.message}`)
    }

    // Collect artifact IDs if requested
    let artifactIds: string[] = []
    if (body.include_artifacts && events) {
      for (const event of events) {
        const refs = event.entity_refs as Array<{ entity: string; id: string }>
        for (const ref of refs) {
          if (ref.entity === 'artifact' && !artifactIds.includes(ref.id)) {
            artifactIds.push(ref.id)
          }
        }
      }
    }

    // Get request context for audit
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      'unknown'

    // CRITICAL: Write immutable export audit event
    const eventId = ulid()
    const entityRefs: Array<{ entity: string; id: string }> = []

    if (body.property_id) {
      entityRefs.push({ entity: 'property', id: body.property_id })
    }
    if (body.project_id) {
      entityRefs.push({ entity: 'project', id: body.project_id })
    }

    const { error: auditError } = await supabase.from('core_event').insert({
      id: eventId,
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      source_app: 'jss',
      type: 'core.timeline.exported',
      immutable: true, // Evidence chain - cannot be deleted!
      occurred_at: new Date().toISOString(),
      property_id: body.property_id,
      project_id: body.project_id,
      entity_refs: entityRefs.length > 0 ? entityRefs : [{ entity: 'export', id: eventId }],
      payload: {
        schema_version: 1,
        export_id: eventId,
        // What was exported
        property_id: body.property_id,
        project_id: body.project_id,
        from_date: body.from_date,
        to_date: body.to_date,
        event_count: events?.length || 0,
        artifact_count: artifactIds.length,
        artifact_ids: artifactIds,
        export_format: body.export_format || 'json',
        include_artifacts: body.include_artifacts || false,
        purpose: body.purpose,
        // Audit context
        user_agent: userAgent.slice(0, 500),
        ip_address: ipAddress,
        request_timestamp: new Date().toISOString(),
      },
    })

    if (auditError) {
      // Log but don't fail
      console.error('[Export Audit] Failed to write event:', auditError)
    }

    // Return export data
    const exportData = {
      export_id: eventId,
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      property_id: body.property_id,
      project_id: body.project_id,
      date_range: {
        from: body.from_date,
        to: body.to_date,
      },
      events: events || [],
      artifact_ids: artifactIds,
      metadata: {
        event_count: events?.length || 0,
        artifact_count: artifactIds.length,
        format: body.export_format || 'json',
        purpose: body.purpose,
      },
    }

    // Format based on request
    if (body.export_format === 'csv') {
      // Simple CSV for events (could be enhanced)
      const csvHeader = 'id,type,occurred_at,source_app,immutable\n'
      const csvRows = (events || [])
        .map((e) => `${e.id},${e.type},${e.occurred_at},${e.source_app},${e.immutable}`)
        .join('\n')

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          ...NO_CACHE_HEADERS,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="timeline-export-${eventId}.csv"`,
        },
      })
    }

    return NextResponse.json(exportData, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[Timeline Export Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
