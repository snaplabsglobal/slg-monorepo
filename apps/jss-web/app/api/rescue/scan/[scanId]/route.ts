/**
 * GET /api/rescue/scan/:scan_id
 *
 * Retrieves scan session details for:
 * - Page refresh
 * - Resume after navigation
 * - Debug/CTO inspection
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Fetch session from database
  const { data: session, error } = await supabase
    .from('rescue_scan_sessions')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', organization_id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  }

  // Calculate remaining items
  const clustersConfirmed = new Set(session.clusters_confirmed || [])
  const clustersSkipped = new Set(session.clusters_skipped || [])
  const unknownAssigned = new Set(session.unknown_assigned_ids || [])
  const unknownSkipped = new Set(session.unknown_skipped_ids || [])

  const clusters = (session.clusters || []).map((c: { cluster_id: string }) => ({
    ...c,
    status: clustersConfirmed.has(c.cluster_id)
      ? 'confirmed'
      : clustersSkipped.has(c.cluster_id)
        ? 'skipped'
        : 'unreviewed',
  }))

  const unknownPhotoIds = (session.unknown_photo_ids || []).filter(
    (id: string) => !unknownAssigned.has(id) && !unknownSkipped.has(id)
  )

  return NextResponse.json({
    scan_id: session.id,
    scope: { mode: session.scope_mode },
    stats: session.stats,
    date_range: session.date_range,
    clusters: clusters.map((c: {
      cluster_id: string
      photo_count: number
      centroid: { lat: number; lng: number; accuracy_m: number }
      address: { display: string | null } | null
      time_range: { min: string; max: string }
      status: string
    }) => ({
      cluster_id: c.cluster_id,
      photo_count: c.photo_count,
      centroid: c.centroid,
      address: c.address,
      time_range: c.time_range,
      status: c.status,
    })),
    unknown: {
      photo_count: unknownPhotoIds.length,
      reasons: ['missing_gps'],
    },
    status: session.status,
    created_at: session.created_at,
  })
}
