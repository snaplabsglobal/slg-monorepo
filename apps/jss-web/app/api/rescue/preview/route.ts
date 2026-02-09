/**
 * GET /api/rescue/preview
 *
 * Returns preview data for rescue scan based on selected scope.
 * Shows photo count and date range before user starts scan.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

const SCOPE_LABELS: Record<string, string> = {
  unassigned: 'Unassigned photos',
  all: 'All photos',
  no_location: 'Photos without location',
  date_range: 'Custom date range',
}

export async function GET(req: Request) {
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

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'unassigned'

  // Build base query
  let query = supabase
    .from('job_photos')
    .select('taken_at', { count: 'exact' })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)

  // Apply scope filter
  switch (scope) {
    case 'unassigned':
      query = query.is('job_id', null)
      break
    case 'all':
      // No additional filter
      break
    case 'no_location':
      query = query.or('temp_lat.is.null,temp_lng.is.null')
      break
    case 'date_range':
      // For date_range, we'd need additional params
      // For now, just return all photos count
      break
  }

  // Order by taken_at to get date range
  query = query.order('taken_at', { ascending: true })

  const { count, data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate date range from results
  const dates = (data ?? [])
    .map((p: { taken_at: string | null }) => p.taken_at)
    .filter((d): d is string => d !== null)
    .sort()

  const minDate = dates.length > 0 ? dates[0] : null
  const maxDate = dates.length > 0 ? dates[dates.length - 1] : null

  return NextResponse.json({
    photo_count: count ?? 0,
    date_range: {
      min: minDate,
      max: maxDate,
    },
    scope_label: SCOPE_LABELS[scope] || 'Unknown scope',
    scope,
  })
}
