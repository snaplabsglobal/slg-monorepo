/**
 * GET /api/rescue/scan/:scan_id/progress
 *
 * Returns current progress for the scan session.
 * UI uses this to control Apply button enable/disable.
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

  // Fetch session
  const { data: session, error } = await supabase
    .from('rescue_scan_sessions')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', organization_id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  }

  // Calculate remaining
  const totalClusters = (session.clusters || []).length
  const confirmedClusters = (session.clusters_confirmed || []).length
  const skippedClusters = (session.clusters_skipped || []).length
  const processedClusters = confirmedClusters + skippedClusters
  const clustersUnreviewed = totalClusters - processedClusters

  const totalUnknown = (session.unknown_photo_ids || []).length
  const assignedUnknown = (session.unknown_assigned_ids || []).length
  const skippedUnknown = (session.unknown_skipped_ids || []).length
  const processedUnknown = assignedUnknown + skippedUnknown
  const unknownUnreviewed = totalUnknown - processedUnknown

  const done = clustersUnreviewed === 0 && unknownUnreviewed === 0

  return NextResponse.json({
    scan_id: scanId,
    remaining: {
      clusters_unreviewed: clustersUnreviewed,
      unknown_unreviewed: unknownUnreviewed,
    },
    processed: {
      clusters_confirmed: confirmedClusters,
      clusters_skipped: skippedClusters,
      unknown_assigned: assignedUnknown,
      unknown_skipped: skippedUnknown,
    },
    totals: {
      clusters: totalClusters,
      unknown: totalUnknown,
    },
    done,
    status: session.status,
  })
}
