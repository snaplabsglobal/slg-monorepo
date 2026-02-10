/**
 * GET /api/rescue/diagnostic
 *
 * Diagnostic endpoint for Rescue Mode (dev only)
 * Shows rescue_status distribution and candidate counts
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized } from '@/lib/server/rescue-guards'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 })
  }

  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx

  // 1. Get rescue_status distribution
  const { data: statusDist, error: statusError } = await supabase
    .from('job_photos')
    .select('rescue_status')
    .eq('organization_id', organization_id)
    .is('deleted_at', null)

  if (statusError) {
    return NextResponse.json({ error: 'query_failed', message: statusError.message }, { status: 500 })
  }

  // Count by status
  const statusCounts: Record<string, number> = {
    unreviewed: 0,
    confirmed: 0,
    skipped: 0,
    null: 0,
  }

  for (const row of statusDist || []) {
    const status = row.rescue_status ?? 'null'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  }

  // 2. Get candidate count (what scan would return)
  const { count: candidateCount } = await supabase
    .from('job_photos')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  // 3. Get unassigned photos count (job_id IS NULL, regardless of rescue_status)
  const { count: unassignedCount } = await supabase
    .from('job_photos')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)

  // 4. Get unassigned with NULL rescue_status (the problem)
  const { count: nullStatusCount } = await supabase
    .from('job_photos')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .is('rescue_status', null)

  const total = (statusDist || []).length

  return NextResponse.json({
    organization_id,
    total_photos: total,
    rescue_status_distribution: statusCounts,
    rescue_candidates: candidateCount ?? 0,
    unassigned_photos: unassignedCount ?? 0,
    unassigned_with_null_status: nullStatusCount ?? 0,
    diagnosis: nullStatusCount && nullStatusCount > 0
      ? `⚠️ Found ${nullStatusCount} unassigned photos with NULL rescue_status. Run migration 20260209150000_backfill_rescue_status.sql to fix.`
      : candidateCount === 0 && (unassignedCount ?? 0) > 0
        ? '⚠️ Unassigned photos exist but rescue_status is not "unreviewed". Check status distribution.'
        : candidateCount === 0
          ? '✅ No unassigned photos - all photos are in jobs.'
          : `✅ ${candidateCount} candidates ready for Rescue Mode.`,
  })
}
