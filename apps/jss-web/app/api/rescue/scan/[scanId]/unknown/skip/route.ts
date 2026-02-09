/**
 * POST /api/rescue/scan/:scan_id/unknown/skip
 *
 * Skips unknown photos (marks as rescue_status='skipped').
 *
 * 必须行为:
 * 1. require idempotency key
 * 2. 事务内:
 *    - 校验 photo_ids 都属于 scan 的 unknown 集合
 *    - 更新 photos:
 *      WHERE id IN photo_ids AND job_id IS NULL AND rescue_status='unreviewed'
 *      set rescue_status='skipped'
 */

import { NextResponse } from 'next/server'
import {
  getSessionOrUnauthorized,
  checkIdempotencyKey,
  saveIdempotencyKey,
  assertScanBelongsToOrg,
} from '@/lib/server/rescue-guards'

type SkipRequest = {
  photo_ids: string[]
  reason?: string
}

type SkipResponse = {
  result: 'skipped'
  reason: string
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
  const route = `skip_unknown_${scanId}`

  // B. 检查幂等键
  const cached = await checkIdempotencyKey<SkipResponse>(auth.ctx, route, idempotencyKey)
  if (cached.cached) {
    return NextResponse.json(cached.response)
  }

  // Parse request
  let body: SkipRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.photo_ids || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
    return NextResponse.json({ error: 'invalid_photo_ids' }, { status: 400 })
  }

  // ============================================================
  // C. 校验 scan 属于 org 并获取 unknown photo_ids
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

  // ============================================================
  // E. 更新 photos: rescue_status='skipped'
  // ============================================================

  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      rescue_status: 'skipped',
    })
    .eq('organization_id', organization_id)
    .in('id', validPhotoIds)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')

  if (updateError) {
    return NextResponse.json(
      { error: 'skip_failed', message: updateError.message },
      { status: 500 }
    )
  }

  const actualCount = count ?? 0
  const expectedCount = validPhotoIds.length

  // F. 更新旧表 session (如果使用旧表)
  if (!scanResult.valid) {
    const { data: session } = await supabase
      .from('rescue_scan_sessions')
      .select('unknown_skipped_ids')
      .eq('id', scanId)
      .single()

    await supabase
      .from('rescue_scan_sessions')
      .update({
        unknown_skipped_ids: [...(session?.unknown_skipped_ids || []), ...validPhotoIds],
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanId)
  }

  // G. 构造响应 & 保存幂等键
  const response: SkipResponse = {
    result: 'skipped',
    reason: body.reason || 'missing_gps',
    updated: {
      photo_count: actualCount,
      expected_count: expectedCount,
    },
  }

  await saveIdempotencyKey(auth.ctx, route, idempotencyKey, JSON.stringify(body), response)

  return NextResponse.json(response)
}
