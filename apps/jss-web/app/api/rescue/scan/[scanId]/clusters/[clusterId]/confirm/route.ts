/**
 * POST /api/rescue/scan/:scan_id/clusters/:cluster_id/confirm
 *
 * Confirms a cluster as a Job.
 *
 * 必须行为（按顺序）:
 * 1. require idempotency key
 * 2. 校验 scan/cluster 属于 org
 * 3. 校验 cluster.status == 'unreviewed'
 * 4. 在 单个事务 内:
 *    - 创建 job (或使用 job_id)
 *    - 更新 cluster: status='confirmed', job_id=new_job_id
 *    - 更新 photos (批量): 只更新仍未归档的那些
 *      WHERE id IN photo_ids AND job_id IS NULL AND rescue_status='unreviewed'
 *      设置 job_id=new_job_id, rescue_status='confirmed'
 *
 * 并发保护（必须）:
 * - 如果 photos 更新影响行数 < cluster.photo_count:
 *   说明并发里有人已经动了部分照片
 *   返回 409 some_photos_already_assigned + 告诉前端"刷新 scan"
 */

import { NextResponse } from 'next/server'
import {
  getSessionOrUnauthorized,
  checkIdempotencyKey,
  saveIdempotencyKey,
  assertClusterBelongsToOrg,
  assertJobBelongsToOrg,
  type ClusterRecord,
} from '@/lib/server/rescue-guards'

type ConfirmRequest = {
  job_name?: string
  job_id?: string | null
}

type ConfirmResponse = {
  cluster_id: string
  result: 'confirmed'
  job: {
    job_id: string
    name: string
  }
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
  const route = `confirm_cluster_${scanId}_${clusterId}`

  // B. 检查幂等键
  const cached = await checkIdempotencyKey<ConfirmResponse>(auth.ctx, route, idempotencyKey)
  if (cached.cached) {
    return NextResponse.json(cached.response)
  }

  // Parse request
  let body: ConfirmRequest = {}
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

  // 尝试新表 rescue_clusters
  const clusterResult = await assertClusterBelongsToOrg(auth.ctx, scanId, clusterId)
  if (clusterResult.valid) {
    cluster = clusterResult.cluster
  } else {
    // Fallback: 尝试旧表 rescue_scan_sessions
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

    // 检查是否已 confirmed/skipped
    const confirmed = new Set(session.clusters_confirmed || [])
    const skipped = new Set(session.clusters_skipped || [])

    if (confirmed.has(clusterId)) {
      return NextResponse.json(
        { error: 'cluster_already_confirmed', message: 'Cluster has already been confirmed' },
        { status: 409 }
      )
    }
    if (skipped.has(clusterId)) {
      return NextResponse.json(
        { error: 'cluster_already_skipped', message: 'Cluster has been skipped' },
        { status: 409 }
      )
    }

    // 构造兼容的 cluster 对象
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
      address_display: found.address?.display || null,
      address_source: found.address?.source || null,
      address_confidence: found.address?.confidence || null,
      time_min: found.time_range?.min || null,
      time_max: found.time_range?.max || null,
      status: 'unreviewed',
      job_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // D. 校验 cluster.status == 'unreviewed' (新表)
  if (useNormalizedTables && cluster!.status !== 'unreviewed') {
    return NextResponse.json(
      {
        error: cluster!.status === 'confirmed' ? 'cluster_already_confirmed' : 'cluster_already_skipped',
        message: `Cluster status is '${cluster!.status}'`,
      },
      { status: 409 }
    )
  }

  const photoIds: string[] = cluster!.photo_ids || []
  const expectedCount = cluster!.photo_count || photoIds.length

  if (photoIds.length === 0) {
    return NextResponse.json(
      { error: 'no_photos_in_cluster' },
      { status: 400 }
    )
  }

  // ============================================================
  // E. 创建 Job 或验证现有 Job
  // ============================================================

  let jobId = body.job_id
  let jobName = body.job_name?.trim()

  if (!jobId) {
    // 生成 job 名称
    if (!jobName) {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      jobName = `Job from Rescue (${dateStr})`
    }

    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        organization_id,
        name: jobName,
        status: 'active',
        geofence_lat: cluster!.centroid_lat,
        geofence_lng: cluster!.centroid_lng,
      })
      .select('id, name')
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: 'confirm_failed', message: `Failed to create job: ${jobError.message}` },
        { status: 500 }
      )
    }

    jobId = newJob.id
    jobName = newJob.name
  } else {
    // 验证 job 属于 org
    const jobResult = await assertJobBelongsToOrg(auth.ctx, jobId)
    if (!jobResult.valid) {
      return NextResponse.json({ error: jobResult.error }, { status: jobResult.status })
    }
    jobName = jobResult.job.name
  }

  // ============================================================
  // F. 更新 photos (带并发保护)
  // 只更新仍未归档的: job_id IS NULL AND rescue_status='unreviewed'
  // ============================================================

  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      job_id: jobId,
      rescue_status: 'confirmed',
    })
    .eq('organization_id', organization_id)
    .in('id', photoIds)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (updateError) {
    // Rollback: 删除刚创建的 job (如果是新建的)
    if (!body.job_id) {
      await supabase.from('jobs').delete().eq('id', jobId)
    }
    return NextResponse.json(
      { error: 'confirm_failed', message: updateError.message },
      { status: 500 }
    )
  }

  const actualCount = count ?? 0

  // 并发保护: 检查更新行数
  if (actualCount < expectedCount) {
    // 部分照片已被其他操作处理
    // 不回滚 job (保留已更新的照片归档)
    // 返回 409 提示前端刷新
    const response = {
      error: 'some_photos_already_assigned',
      message: `Expected ${expectedCount} photos, but only ${actualCount} were updated. Some photos may have been processed by another operation.`,
      details: {
        expected: expectedCount,
        actual: actualCount,
        job_id: jobId,
        job_name: jobName,
      },
      action: 'refresh_scan',
    }
    return NextResponse.json(response, { status: 409 })
  }

  // ============================================================
  // G. 更新 cluster 状态
  // ============================================================

  if (useNormalizedTables) {
    await supabase
      .from('rescue_clusters')
      .update({
        status: 'confirmed',
        job_id: jobId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId)
  } else {
    // Fallback: 更新旧表 rescue_scan_sessions
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('clusters_confirmed')
      .eq('id', scanId)
      .single()

    await supabase
      .from('rescue_scan_sessions')
      .update({
        clusters_confirmed: [...(session?.clusters_confirmed || []), clusterId],
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanId)
  }

  // ============================================================
  // H. 构造响应 & 保存幂等键
  // ============================================================

  const response: ConfirmResponse = {
    cluster_id: clusterId,
    result: 'confirmed',
    job: {
      job_id: jobId!,
      name: jobName!,
    },
    updated: {
      photo_count: actualCount,
      expected_count: expectedCount,
    },
  }

  await saveIdempotencyKey(auth.ctx, route, idempotencyKey, JSON.stringify(body), response)

  return NextResponse.json(response)
}
