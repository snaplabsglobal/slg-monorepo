/**
 * POST /api/rescue/scan/:scan_id/apply
 *
 * Finalizes the rescue session.
 * Only succeeds if all items have been processed (remaining = 0).
 *
 * Apply does NOT write data - that's done by confirm/skip/assign.
 * Apply only validates completion and marks session as applied.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

export async function POST(
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

  // Check if already applied
  if (session.status === 'applied') {
    return NextResponse.json({
      scan_id: scanId,
      result: 'applied',
      message: 'Session was already applied',
    })
  }

  // Calculate remaining
  const totalClusters = (session.clusters || []).length
  const confirmedClusters = (session.clusters_confirmed || []).length
  const skippedClusters = (session.clusters_skipped || []).length
  const clustersUnreviewed = totalClusters - confirmedClusters - skippedClusters

  const totalUnknown = (session.unknown_photo_ids || []).length
  const assignedUnknown = (session.unknown_assigned_ids || []).length
  const skippedUnknown = (session.unknown_skipped_ids || []).length
  const unknownUnreviewed = totalUnknown - assignedUnknown - skippedUnknown

  // Reject if not ready
  if (clustersUnreviewed > 0 || unknownUnreviewed > 0) {
    return NextResponse.json(
      {
        error: 'not_ready_to_apply',
        remaining: {
          clusters_unreviewed: clustersUnreviewed,
          unknown_unreviewed: unknownUnreviewed,
        },
      },
      { status: 409 }
    )
  }

  // Mark session as applied
  const { error: updateError } = await supabase
    .from('rescue_scan_sessions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId)

  if (updateError) {
    return NextResponse.json(
      { error: 'apply_failed', message: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    scan_id: scanId,
    result: 'applied',
    summary: {
      clusters_confirmed: confirmedClusters,
      clusters_skipped: skippedClusters,
      unknown_assigned: assignedUnknown,
      unknown_skipped: skippedUnknown,
    },
  })
}
