/**
 * GET /api/rescue/scan/:scan_id/clusters/:cluster_id/photos
 *
 * Returns paginated photo previews for a cluster.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scanId: string; clusterId: string }> }
) {
  const { scanId, clusterId } = await params

  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Parse query params
  const url = new URL(req.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('rescue_scan_sessions')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', organization_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  }

  // Find cluster
  const clusters = session.clusters || []
  const cluster = clusters.find((c: { cluster_id: string }) => c.cluster_id === clusterId)

  if (!cluster) {
    return NextResponse.json({ error: 'cluster_not_found' }, { status: 404 })
  }

  const photoIds: string[] = cluster.photo_ids || []

  if (photoIds.length === 0) {
    return NextResponse.json({
      cluster_id: clusterId,
      items: [],
      next_cursor: null,
    })
  }

  // Apply cursor-based pagination
  let startIndex = 0
  if (cursor) {
    const cursorIndex = photoIds.indexOf(cursor)
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1
    }
  }

  const pageIds = photoIds.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + limit < photoIds.length
  const nextCursor = hasMore ? pageIds[pageIds.length - 1] : null

  // Fetch photo details
  const { data: photos, error: photosError } = await supabase
    .from('job_photos')
    .select('id, thumbnail_key, temp_lat, temp_lng, taken_at, created_at')
    .eq('organization_id', organization_id)
    .in('id', pageIds)

  if (photosError) {
    return NextResponse.json(
      { error: 'fetch_failed', message: photosError.message },
      { status: 500 }
    )
  }

  // Build items in order
  const photoMap = new Map((photos || []).map((p) => [p.id, p]))
  const items = pageIds
    .map((id) => photoMap.get(id))
    .filter(Boolean)
    .map((p) => ({
      photo_id: p!.id,
      thumb_url: p!.thumbnail_key
        ? `/api/photos/${p!.id}/thumbnail`
        : null,
      taken_at: p!.taken_at,
      created_at: p!.created_at,
      lat: p!.temp_lat,
      lng: p!.temp_lng,
    }))

  return NextResponse.json({
    cluster_id: clusterId,
    items,
    next_cursor: nextCursor,
  })
}
