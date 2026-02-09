/**
 * GET /api/rescue/summary
 *
 * Returns rescue mode summary with bucket counts.
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

  // Count photos by classification/status
  // Note: These queries may be expensive for large datasets
  // Consider adding a summary cache table if needed

  // Total photos
  const { count: totalPhotos } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)

  // Unknown location (missing GPS)
  const { count: unknownLocationCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .or('temp_lat.is.null,temp_lng.is.null')

  // Low accuracy (GPS accuracy > 200m)
  const { count: lowAccuracyCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .not('temp_lat', 'is', null)
    .not('temp_lng', 'is', null)
    .gt('temp_accuracy_m', 200)

  // Likely personal (user or AI classified as personal)
  const { count: likelyPersonalCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .or(
      'user_classification.eq.personal,and(user_classification.is.null,ai_classification.eq.personal)'
    )

  // Unsure (no classification)
  const { count: unsureCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('user_classification', null)
    .or('ai_classification.is.null,ai_classification.eq.unsure')

  // Likely jobsite
  const { count: likelyJobsiteCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .or(
      'user_classification.eq.jobsite,and(user_classification.is.null,ai_classification.eq.jobsite)'
    )

  // Geocode failed count is 0 for now (requires smart_trace_suggestion field)
  const geocodeFailedCount = 0

  return NextResponse.json({
    sampled: false,
    sample_limit: 0,
    summary: {
      total_photos_scanned: totalPhotos ?? 0,
      likely_jobsite_count: likelyJobsiteCount ?? 0,
      likely_personal_count: likelyPersonalCount ?? 0,
      unsure_count: unsureCount ?? 0,
      unknown_location_count: unknownLocationCount ?? 0,
      low_accuracy_count: lowAccuracyCount ?? 0,
      geocode_failed_count: geocodeFailedCount,
    },
    buckets: {
      unknownLocation: { count: unknownLocationCount ?? 0 },
      geocodeFailed: { count: geocodeFailedCount },
      lowAccuracy: { count: lowAccuracyCount ?? 0 },
      likelyPersonal: { count: likelyPersonalCount ?? 0 },
      unsure: { count: unsureCount ?? 0 },
    },
    capabilities: {
      geocode_is_proxy: true,
      suggestions_based_on_job_id: true,
    },
  })
}
