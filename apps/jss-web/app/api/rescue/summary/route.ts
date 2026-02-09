/**
 * GET /api/rescue/summary
 *
 * Returns rescue mode summary with REAL data.
 *
 * Data source (ONLY valid input):
 *   job_id IS NULL AND rescue_status = 'unreviewed'
 *
 * Used by Rescue Mode page to determine state (inactive/active).
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

export async function GET() {
  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const code = msg === 'Unauthorized' ? 401 : 403
    return NextResponse.json({ error: msg }, { status: code })
  }

  // ============================================================
  // ONLY valid data source for Rescue Mode:
  // job_id IS NULL AND rescue_status = 'unreviewed'
  // ============================================================

  // Total unassigned + unreviewed photos (the ONLY input to Rescue)
  const { count: totalUnreviewed, error: countError } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (countError) {
    // If rescue_status column doesn't exist yet, fall back to just job_id IS NULL
    const { count: fallbackCount } = await supabase
      .from('job_photos')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .is('job_id', null)

    return NextResponse.json({
      unreviewed_count: fallbackCount ?? 0,
      has_rescue_items: (fallbackCount ?? 0) > 0,
      ready_to_apply: false,
      migration_pending: true,
    })
  }

  // Count photos with GPS (can be clustered)
  const { count: withGpsCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')
    .not('temp_lat', 'is', null)
    .not('temp_lng', 'is', null)

  // Count photos without GPS (unknown location)
  const { count: unknownLocationCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')
    .or('temp_lat.is.null,temp_lng.is.null')

  // Check if ready to apply (no unreviewed items left)
  const readyToApply = (totalUnreviewed ?? 0) === 0

  return NextResponse.json({
    // Real counts - no fake data
    unreviewed_count: totalUnreviewed ?? 0,
    with_gps_count: withGpsCount ?? 0,
    unknown_location_count: unknownLocationCount ?? 0,

    // State
    has_rescue_items: (totalUnreviewed ?? 0) > 0,
    ready_to_apply: readyToApply,

    // Metadata
    migration_pending: false,
  })
}
