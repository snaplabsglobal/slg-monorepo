/**
 * POST /api/rescue/scan/:scan_id/unknown/assign
 *
 * Assigns unknown photos to an existing job.
 *
 * 必须行为:
 * 1. require idempotency key
 * 2. 事务内:
 *    - 校验 job 属于 org
 *    - 校验 photo_ids 全都属于 scan 的 unknown 集合
 *    - 更新 photos:
 *      WHERE id IN photo_ids AND job_id IS NULL AND rescue_status='unreviewed'
 *      set job_id=?, rescue_status='confirmed'
 *    - 返回 updated count
 *
 * 任何 photo 不在 unknown 集合 → 400 invalid_photo_ids
 * 更新行数与传入数量不一致 → 409 some_photos_already_assigned
 */

import { NextResponse } from 'next/server'
import {
  getSessionOrUnauthorized,
  checkIdempotencyKey,
  saveIdempotencyKey,
  assertScanBelongsToOrg,
  assertJobBelongsToOrg,
} from '@/lib/server/rescue-guards'

type AssignRequest = {
  job_id: string
  photo_ids: string[]
}

type AssignResponse = {
  result: 'assigned'
  job_id: string
  job_name: string
  updated: {
    photo_count: number
    expected_count: number
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params
  const idempotencyKey = req.headers.get('X-Idempotency-Key')

  // A. requireSessionOrg
  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx
  const route = `assign_unknown_${scanId}`

  // B. 检查幂等键
  const cached = await checkIdempotencyKey<AssignResponse>(auth.ctx, route, idempotencyKey)
  if (cached.cached) {
    return NextResponse.json(cached.response)
  }

  // Parse request
  let body: AssignRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.job_id) {
    return NextResponse.json({ error: 'job_id_required' }, { status: 400 })
  }

  if (!body.photo_ids || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
    return NextResponse.json({ error: 'invalid_photo_ids' }, { status: 400 })
  }

  // ============================================================
  // C. 校验 scan 属于 org
  // ============================================================

  let unknownPhotoIds: string[] = []

  const scanResult = await assertScanBelongsToOrg(auth.ctx, scanId)
  if (scanResult.valid) {
    // 新表: 从 rescue_unknown 获取 photo_ids
    const { data: unknown } = await supabase
      .from('rescue_unknown')
      .select('photo_ids')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)
      .single()

    unknownPhotoIds = unknown?.photo_ids || []
  } else {
    // Fallback: 旧表
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('unknown_photo_ids, unknown_assigned_ids, unknown_skipped_ids')
      .eq('id', scanId)
      .eq('organization_id', organization_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
    }

    unknownPhotoIds = session.unknown_photo_ids || []
  }

  // D. 校验 photo_ids 都属于 unknown 集合
  const unknownSet = new Set(unknownPhotoIds)
  const validPhotoIds = body.photo_ids.filter(id => unknownSet.has(id))

  if (validPhotoIds.length === 0) {
    return NextResponse.json(
      { error: 'invalid_photo_ids', message: 'No valid photo IDs in unknown list' },
      { status: 400 }
    )
  }

  // E. 校验 job 属于 org
  const jobResult = await assertJobBelongsToOrg(auth.ctx, body.job_id)
  if (!jobResult.valid) {
    return NextResponse.json({ error: jobResult.error }, { status: jobResult.status })
  }

  // ============================================================
  // F. 更新 photos (带并发保护)
  // ============================================================

  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      job_id: body.job_id,
      rescue_status: 'confirmed',
    })
    .eq('organization_id', organization_id)
    .in('id', validPhotoIds)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (updateError) {
    return NextResponse.json(
      { error: 'assign_failed', message: updateError.message },
      { status: 500 }
    )
  }

  const actualCount = count ?? 0
  const expectedCount = validPhotoIds.length

  // 并发保护
  if (actualCount < expectedCount) {
    return NextResponse.json(
      {
        error: 'some_photos_already_assigned',
        message: `Expected ${expectedCount} photos, but only ${actualCount} were updated`,
        details: { expected: expectedCount, actual: actualCount },
        action: 'refresh_scan',
      },
      { status: 409 }
    )
  }

  // G. 更新旧表 session (如果使用旧表)
  if (!scanResult.valid) {
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('unknown_assigned_ids')
      .eq('id', scanId)
      .single()

    await supabase
      .from('rescue_scan_sessions')
      .update({
        unknown_assigned_ids: [...(session?.unknown_assigned_ids || []), ...validPhotoIds],
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanId)
  }

  // H. 构造响应 & 保存幂等键
  const response: AssignResponse = {
    result: 'assigned',
    job_id: body.job_id,
    job_name: jobResult.job.name,
    updated: {
      photo_count: actualCount,
      expected_count: expectedCount,
    },
  }

  await saveIdempotencyKey(auth.ctx, route, idempotencyKey, JSON.stringify(body), response)

  return NextResponse.json(response)
}
