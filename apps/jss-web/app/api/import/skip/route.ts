/**
 * POST /api/rescue/skip
 *
 * Rescue Mode v1 - Skip Endpoint (Endpoint C)
 * 让照片永远不再出现在 Rescue 建议中
 *
 * Request:
 *   {
 *     "photo_ids": ["u1","u2"],
 *     "reason": "not_jobsite|missing_info|skip_for_now"
 *   }
 *
 * Response:
 *   { "ok": true, "skipped_count": 77 }
 *
 * DB 规则（必须）:
 * - 写 rescue_status='skipped'
 * - 以后 scan 不得再返回这些 photo
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized } from '@/lib/server/api-guards'

type SkipReason = 'not_jobsite' | 'missing_info' | 'skip_for_now'

type SkipRequest = {
  photo_ids: string[]
  reason: SkipReason
}

const VALID_REASONS: SkipReason[] = ['not_jobsite', 'missing_info', 'skip_for_now']

export async function POST(req: Request) {
  try {
    // A. requireSessionOrg
    const auth = await getSessionOrUnauthorized()
    if (!auth.ok) return auth.response

    const { supabase, organization_id } = auth.ctx

    // Parse request
    let body: SkipRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { ok: false, error: 'invalid_request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate photo_ids
    if (!body.photo_ids || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_request', message: 'photo_ids is required and must be non-empty array' },
        { status: 400 }
      )
    }

    // Validate reason
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_request', message: `reason must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      )
    }

    // ============================================================
    // Update photos: SET rescue_status='skipped'
    // WHERE id IN photo_ids AND job_id IS NULL AND rescue_status='unreviewed'
    //
    // 幂等性：已经 skipped 的照片不会被重复更新
    // ============================================================

    const { error: updateError, count } = await supabase
      .from('job_photos')
      .update({
        rescue_status: 'skipped',
      })
      .eq('organization_id', organization_id)
      .in('id', body.photo_ids)
      .is('job_id', null)
      .eq('rescue_status', 'unreviewed')

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: 'update_failed', message: updateError.message },
        { status: 500 }
      )
    }

    const skippedCount = count ?? 0

    return NextResponse.json({
      ok: true,
      skipped_count: skippedCount,
      requested_count: body.photo_ids.length,
      reason: body.reason,
    })
  } catch (error) {
    console.error('[rescue/skip] Unhandled error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
