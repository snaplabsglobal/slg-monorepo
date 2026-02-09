/**
 * POST /api/rescue/apply
 *
 * Confirms the current Rescue session is complete.
 *
 * This does NOT write any data - that's already done by confirm-cluster and skip.
 * This just verifies that all items have been processed.
 *
 * Verification:
 *   SELECT COUNT(*) FROM photos
 *   WHERE job_id IS NULL AND rescue_status = 'unreviewed'
 *
 *   If > 0 → reject (400)
 *   If = 0 → success (200)
 *
 * Output:
 *   {
 *     success: boolean
 *     remaining_count: number  // Should be 0 for success
 *   }
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

export async function POST() {
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
  // Verify: no unreviewed items remaining
  // ============================================================

  const { count: remainingCount, error: countError } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (countError) {
    // Fallback if rescue_status doesn't exist
    const { count: fallbackCount } = await supabase
      .from('job_photos')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .is('job_id', null)

    if ((fallbackCount ?? 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          remaining_count: fallbackCount ?? 0,
          error: 'There are still unprocessed photos. Please review or skip them first.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      remaining_count: 0,
      message: 'Rescue session completed successfully.',
    })
  }

  if ((remainingCount ?? 0) > 0) {
    return NextResponse.json(
      {
        success: false,
        remaining_count: remainingCount ?? 0,
        error: 'There are still unprocessed photos. Please review or skip them first.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    remaining_count: 0,
    message: 'Rescue session completed successfully.',
  })
}
