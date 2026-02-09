/**
 * POST /api/rescue/scan/:scan_id/clusters/:cluster_id/skip
 *
 * Skips a cluster (marks photos as rescue_status='skipped').
 *
 * 必须行为:
 * 1. require idempotency key
 * 2. 校验 scan/cluster 属于 org
 * 3. 校验 cluster.status == 'unreviewed'
 * 4. 事务内:
 *    - cluster.status = 'skipped'
 *    - photos (cluster.photo_ids):
 *      WHERE job_id IS NULL AND rescue_status='unreviewed'
 *      rescue_status='skipped'
 *
 * Skip 的语义: "以后不再建议"，否则用户会被反复骚扰。
 */

import { NextResponse } from 'next/server'
import {
  getSessionOrUnauthorized,
  checkIdempotencyKey,
  saveIdempotencyKey,
  assertClusterBelongsToOrg,
  type ClusterRecord,
} from '@/lib/server/rescue-guards'

type SkipRequest = {
  reason?: string
}

type SkipResponse = {
  cluster_id: string
  result: 'skipped'
  reason: string
  updated: {
    photo_count: number
    expected_count: number
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string; clusterId: string }> }
) {
  const { scanId, clusterId } = await params
  const idempotencyKey = req.headers.get('X-Idempotency-Key')

  // A. requireSessionOrg
  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx
  const route = `skip_cluster_${scanId}_${clusterId}`

  // B. 检查幂等键
  const cached = await checkIdempotencyKey<SkipResponse>(auth.ctx, route, idempotencyKey)
  if (cached.cached) {
    return NextResponse.json(cached.response)
  }

  // Parse request
  let body: SkipRequest = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is ok
  }

  // ============================================================
  // C. 校验 cluster 属于 org (支持新旧表)
  // ============================================================

  let cluster: ClusterRecord | null = null
  let useNormalizedTables = true

  const clusterResult = await assertClusterBelongsToOrg(auth.ctx, scanId, clusterId)
  if (clusterResult.valid) {
    cluster = clusterResult.cluster
  } else {
    // Fallback: 尝试旧表
    useNormalizedTables = false
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('*')
      .eq('id', scanId)
      .eq('organization_id', organization_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
    }

    const clusters = session.clusters || []
    const found = clusters.find((c: { cluster_id: string }) => c.cluster_id === clusterId)
    if (!found) {
      return NextResponse.json({ error: 'cluster_not_found' }, { status: 404 })
    }

    const confirmed = new Set(session.clusters_confirmed || [])
    const skipped = new Set(session.clusters_skipped || [])

    if (confirmed.has(clusterId)) {
      return NextResponse.json(
        { error: 'cluster_already_confirmed' },
        { status: 409 }
      )
    }
    if (skipped.has(clusterId)) {
      return NextResponse.json(
        { error: 'cluster_already_skipped' },
        { status: 409 }
      )
    }

    cluster = {
      id: clusterId,
      scan_id: scanId,
      organization_id,
      photo_ids: found.photo_ids || [],
      photo_count: found.photo_count || found.photo_ids?.length || 0,
      centroid_lat: found.centroid?.lat || null,
      centroid_lng: found.centroid?.lng || null,
      centroid_accuracy_m: found.centroid?.accuracy_m || null,
      geohash: found.geohash || null,
      address_display: null,
      address_source: null,
      address_confidence: null,
      time_min: found.time_range?.min || null,
      time_max: found.time_range?.max || null,
      status: 'unreviewed',
      job_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // D. 校验 cluster.status == 'unreviewed'
  if (useNormalizedTables && cluster!.status !== 'unreviewed') {
    return NextResponse.json(
      { error: `cluster_already_${cluster!.status}` },
      { status: 409 }
    )
  }

  const photoIds: string[] = cluster!.photo_ids || []
  const expectedCount = cluster!.photo_count || photoIds.length

  // ============================================================
  // E. 更新 photos: rescue_status='skipped'
  // ============================================================

  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      rescue_status: 'skipped',
    })
    .eq('organization_id', organization_id)
    .in('id', photoIds)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (updateError) {
    return NextResponse.json(
      { error: 'skip_failed', message: updateError.message },
      { status: 500 }
    )
  }

  const actualCount = count ?? 0

  // ============================================================
  // F. 更新 cluster 状态
  // ============================================================

  if (useNormalizedTables) {
    await supabase
      .from('rescue_clusters')
      .update({
        status: 'skipped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId)
  } else {
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('clusters_skipped')
      .eq('id', scanId)
      .single()

    await supabase
      .from('rescue_scan_sessions')
      .update({
        clusters_skipped: [...(session?.clusters_skipped || []), clusterId],
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanId)
  }

  // ============================================================
  // G. 构造响应 & 保存幂等键
  // ============================================================

  const response: SkipResponse = {
    cluster_id: clusterId,
    result: 'skipped',
    reason: body.reason || 'user_decision',
    updated: {
      photo_count: actualCount,
      expected_count: expectedCount,
    },
  }

  await saveIdempotencyKey(auth.ctx, route, idempotencyKey, JSON.stringify(body), response)

  return NextResponse.json(response)
}
