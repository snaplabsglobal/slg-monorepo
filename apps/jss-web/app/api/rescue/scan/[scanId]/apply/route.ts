/**
 * POST /api/rescue/scan/:scan_id/apply
 *
 * Finalizes the rescue session.
 *
 * 必须行为:
 * 1. 读 progress (同样逻辑)
 * 2. 若 remaining > 0: 返回 409 not_ready_to_apply + remaining
 * 3. 否则: 写 rescue_scans.status='applied' + 返回 success
 *
 * Apply 不写归档，这样流程才稳定、可解释、可恢复。
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized, assertScanBelongsToOrg } from '@/lib/server/rescue-guards'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  // A. requireSessionOrg
  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx

  // ============================================================
  // B. 尝试新表 rescue_scans
  // ============================================================

  const scanResult = await assertScanBelongsToOrg(auth.ctx, scanId)

  if (scanResult.valid) {
    const scan = scanResult.scan

    // 已经 applied
    if (scan.status === 'applied') {
      return NextResponse.json({
        scan_id: scanId,
        result: 'applied',
        message: 'Session was already applied',
      })
    }

    // 计算 remaining (真实 DB count)
    const { data: clusterStats } = await supabase
      .from('rescue_clusters')
      .select('status')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)

    const clusters = clusterStats || []
    const clustersUnreviewed = clusters.filter(c => c.status === 'unreviewed').length
    const clustersConfirmed = clusters.filter(c => c.status === 'confirmed').length
    const clustersSkipped = clusters.filter(c => c.status === 'skipped').length

    // 查询 unknown 照片状态
    const { data: unknown } = await supabase
      .from('rescue_unknown')
      .select('photo_ids')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)
      .single()

    let unknownUnreviewed = 0
    let unknownAssigned = 0
    let unknownSkipped = 0

    if (unknown?.photo_ids && unknown.photo_ids.length > 0) {
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

    // Reject if not ready
    if (clustersUnreviewed > 0 || unknownUnreviewed > 0) {
      return NextResponse.json(
        {
          error: 'not_ready_to_apply',
          remaining: {
            clusters_unreviewed: clustersUnreviewed,
            unknown_unreviewed: unknownUnreviewed,
          },
        },
        { status: 409 }
      )
    }

    // Mark session as applied
    const { error: updateError } = await supabase
      .from('rescue_scans')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanId)

    if (updateError) {
      return NextResponse.json(
        { error: 'apply_failed', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      scan_id: scanId,
      result: 'applied',
      summary: {
        clusters_confirmed: clustersConfirmed,
        clusters_skipped: clustersSkipped,
        unknown_assigned: unknownAssigned,
        unknown_skipped: unknownSkipped,
      },
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

  // Check if already applied
  if (session.status === 'applied') {
    return NextResponse.json({
      scan_id: scanId,
      result: 'applied',
      message: 'Session was already applied',
    })
  }

  // Calculate remaining
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
    for (const photo of photoStates || []) {
      if (photo.job_id == null && photo.rescue_status !== 'skipped') {
        actualUnreviewed++
      }
    }
    unknownUnreviewed = actualUnreviewed
  }

  // Reject if not ready
  if (clustersUnreviewed > 0 || unknownUnreviewed > 0) {
    return NextResponse.json(
      {
        error: 'not_ready_to_apply',
        remaining: {
          clusters_unreviewed: clustersUnreviewed,
          unknown_unreviewed: unknownUnreviewed,
        },
      },
      { status: 409 }
    )
  }

  // Mark session as applied
  const { error: updateError } = await supabase
    .from('rescue_scan_sessions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId)

  if (updateError) {
    return NextResponse.json(
      { error: 'apply_failed', message: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    scan_id: scanId,
    result: 'applied',
    summary: {
      clusters_confirmed: confirmedClusters,
      clusters_skipped: skippedClusters,
      unknown_assigned: assignedUnknown,
      unknown_skipped: skippedUnknown,
    },
  })
}
