/**
 * POST /api/rescue/scan/:scan_id/clusters/:cluster_id/skip
 *
 * Skips a cluster (marks all photos as rescue_status='skipped').
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type SkipRequest = {
  reason?: string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string; clusterId: string }> }
) {
  const { scanId, clusterId } = await params
  const idempotencyKey = req.headers.get('X-Idempotency-Key')

  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Check idempotency key
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('rescue_idempotency_keys')
      .select('response')
      .eq('key', idempotencyKey)
      .single()

    if (existing) {
      return NextResponse.json(existing.response)
    }
  }

  // Parse request
  let body: SkipRequest = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is ok
  }

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

  // Check if already processed
  const confirmed = new Set(session.clusters_confirmed || [])
  const skipped = new Set(session.clusters_skipped || [])

  if (confirmed.has(clusterId)) {
    return NextResponse.json(
      { error: 'cluster_already_confirmed' },
      { status: 409 }
    )
  }

  if (skipped.has(clusterId)) {
    // Already skipped, return success (idempotent)
    return NextResponse.json({
      cluster_id: clusterId,
      result: 'skipped',
      updated: { photo_count: cluster.photo_ids?.length || 0 },
    })
  }

  // Get photo IDs
  const photoIds: string[] = cluster.photo_ids || []

  // Update photos
  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      rescue_status: 'skipped',
    })
    .eq('organization_id', organization_id)
    .in('id', photoIds)
    .is('job_id', null)

  if (updateError) {
    return NextResponse.json(
      { error: 'skip_failed', message: updateError.message },
      { status: 500 }
    )
  }

  // Update session
  await supabase
    .from('rescue_scan_sessions')
    .update({
      clusters_skipped: [...(session.clusters_skipped || []), clusterId],
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId)

  const response = {
    cluster_id: clusterId,
    result: 'skipped',
    reason: body.reason || 'user_skipped',
    updated: {
      photo_count: count ?? photoIds.length,
    },
  }

  // Save idempotency key
  if (idempotencyKey) {
    await supabase.from('rescue_idempotency_keys').insert({
      key: idempotencyKey,
      organization_id,
      endpoint: `skip_cluster_${scanId}_${clusterId}`,
      request_hash: JSON.stringify(body),
      response,
    })
  }

  return NextResponse.json(response)
}
