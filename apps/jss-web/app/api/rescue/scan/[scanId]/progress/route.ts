/**
 * GET /api/rescue/scan/:scan_id/progress
 *
 * Returns current progress for the scan session.
 * UI 的 Apply enable/disable 只看这个接口。
 *
 * 必须行为:
 * - 返回 remaining (真实 DB count)
 * - clusters_unreviewed = count(*) from rescue_clusters where scan_id=? and status='unreviewed'
 * - unknown 的 remaining:
 *   count of photos where job_id is null and rescue_status='unreviewed' AND photo_id in rescue_unknown.photo_ids
 * - done = (clusters_unreviewed==0 && unknown_unreviewed==0)
 *
 * Stateless Mode:
 * - scan_id = "stateless" → 直接返回 done: true
 * - 防止 UI progress 卡住
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized, assertScanBelongsToOrg } from '@/lib/server/rescue-guards'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  // ============================================================
  // Stateless Mode: scan_id = "stateless" → done: true
  // ============================================================
  if (scanId === 'stateless') {
    return NextResponse.json({
      scan_id: 'stateless',
      stateless: true,
      remaining: {
        clusters_unreviewed: 0,
        unknown_unreviewed: 0,
      },
      processed: {
        clusters_confirmed: 0,
        clusters_skipped: 0,
        unknown_assigned: 0,
        unknown_skipped: 0,
      },
      totals: {
        clusters: 0,
        unknown: 0,
      },
      done: true,
      status: 'stateless',
    })
  }

  // A. requireSessionOrg
  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx

  // ============================================================
  // B. 尝试新表 rescue_scans + rescue_clusters
  // ============================================================

  const scanResult = await assertScanBelongsToOrg(auth.ctx, scanId)

  if (scanResult.valid) {
    // 新表模式: 从 rescue_clusters 直接查询状态

    // 1. 查询 clusters 状态统计
    const { data: clusterStats } = await supabase
      .from('rescue_clusters')
      .select('status')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)

    const clusters = clusterStats || []
    const totalClusters = clusters.length
    const clustersUnreviewed = clusters.filter(c => c.status === 'unreviewed').length
    const clustersConfirmed = clusters.filter(c => c.status === 'confirmed').length
    const clustersSkipped = clusters.filter(c => c.status === 'skipped').length

    // 2. 查询 unknown 照片状态 (真实 DB count)
    const { data: unknown } = await supabase
      .from('rescue_unknown')
      .select('photo_ids')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)
      .single()

    let unknownUnreviewed = 0
    let unknownAssigned = 0
    let unknownSkipped = 0
    const totalUnknown = unknown?.photo_ids?.length || 0

    if (unknown?.photo_ids && unknown.photo_ids.length > 0) {
      // 真实查询: 检查这些 photo_ids 当前的状态
      const { data: photoStates } = await supabase
        .from('job_photos')
        .select('id, job_id, rescue_status')
        .eq('organization_id', organization_id)
        .in('id', unknown.photo_ids)

      for (const photo of photoStates || []) {
        if (photo.job_id != null) {
          unknownAssigned++
        } else if (photo.rescue_status === 'skipped') {
          unknownSkipped++
        } else {
          unknownUnreviewed++
        }
      }
    }

    const done = clustersUnreviewed === 0 && unknownUnreviewed === 0

    return NextResponse.json({
      scan_id: scanId,
      remaining: {
        clusters_unreviewed: clustersUnreviewed,
        unknown_unreviewed: unknownUnreviewed,
      },
      processed: {
        clusters_confirmed: clustersConfirmed,
        clusters_skipped: clustersSkipped,
        unknown_assigned: unknownAssigned,
        unknown_skipped: unknownSkipped,
      },
      totals: {
        clusters: totalClusters,
        unknown: totalUnknown,
      },
      done,
      status: scanResult.scan.status,
    })
  }

  // ============================================================
  // C. Fallback: 旧表 rescue_scan_sessions
  // ============================================================

  const { data: session, error } = await supabase
    .from('rescue_scan_sessions')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', organization_id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  }

  // 计算 remaining (旧方式)
  const totalClusters = (session.clusters || []).length
  const confirmedClusters = (session.clusters_confirmed || []).length
  const skippedClusters = (session.clusters_skipped || []).length
  const clustersUnreviewed = totalClusters - confirmedClusters - skippedClusters

  const totalUnknown = (session.unknown_photo_ids || []).length
  const assignedUnknown = (session.unknown_assigned_ids || []).length
  const skippedUnknown = (session.unknown_skipped_ids || []).length

  // 真实查询 unknown 照片状态
  let unknownUnreviewed = totalUnknown - assignedUnknown - skippedUnknown

  if (session.unknown_photo_ids && session.unknown_photo_ids.length > 0) {
    const { data: photoStates } = await supabase
      .from('job_photos')
      .select('id, job_id, rescue_status')
      .eq('organization_id', organization_id)
      .in('id', session.unknown_photo_ids)

    let actualUnreviewed = 0
    let actualAssigned = 0
    let actualSkipped = 0

    for (const photo of photoStates || []) {
      if (photo.job_id != null) {
        actualAssigned++
      } else if (photo.rescue_status === 'skipped') {
        actualSkipped++
      } else {
        actualUnreviewed++
      }
    }

    unknownUnreviewed = actualUnreviewed
  }

  const done = clustersUnreviewed === 0 && unknownUnreviewed === 0

  return NextResponse.json({
    scan_id: scanId,
    remaining: {
      clusters_unreviewed: clustersUnreviewed,
      unknown_unreviewed: unknownUnreviewed,
    },
    processed: {
      clusters_confirmed: confirmedClusters,
      clusters_skipped: skippedClusters,
      unknown_assigned: assignedUnknown,
      unknown_skipped: skippedUnknown,
    },
    totals: {
      clusters: totalClusters,
      unknown: totalUnknown,
    },
    done,
    status: session.status,
  })
}
