/**
 * POST /api/rescue/confirm
 *
 * Rescue Mode v1 - Confirm Endpoint (Endpoint B)
 * 唯一的写操作入口
 *
 * 用途：用户确认一个 cluster（或 unknown 子集），创建/选择 job，
 *       并把这些 photos 绑定到 job。
 *
 * Request (B1: 创建新 Job):
 *   {
 *     "action": "create_job_and_assign",
 *     "job": { "name": "...", "address": "..." },
 *     "photo_ids": ["p1","p2","p3"]
 *   }
 *
 * Request (B2: 分配到已有 Job):
 *   {
 *     "action": "assign_to_existing_job",
 *     "job_id": "job_123",
 *     "photo_ids": ["p1","p2","p3"]
 *   }
 *
 * Response:
 *   { "ok": true, "job_id": "job_123", "assigned_count": 360 }
 *
 * DB 规则（必须）:
 * - 只允许更新 job_id + rescue_status='confirmed'
 * - 必须保证幂等：重复 confirm 不应重复创建 job / 不应报错
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized } from '@/lib/server/rescue-guards'

type ConfirmRequest =
  | {
      action: 'create_job_and_assign'
      job: { name: string; address?: string | null }
      photo_ids: string[]
    }
  | {
      action: 'assign_to_existing_job'
      job_id: string
      photo_ids: string[]
    }

export async function POST(req: Request) {
  try {
    // A. requireSessionOrg
    const auth = await getSessionOrUnauthorized()
    if (!auth.ok) return auth.response

    const { supabase, organization_id } = auth.ctx

    // Parse request
    let body: ConfirmRequest
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

    let jobId: string
    let jobName: string

    // ============================================================
    // B1: Create new job and assign
    // ============================================================
    if (body.action === 'create_job_and_assign') {
      if (!body.job?.name) {
        return NextResponse.json(
          { ok: false, error: 'invalid_request', message: 'job.name is required for create_job_and_assign' },
          { status: 400 }
        )
      }

      jobName = body.job.name.trim()

      // Create job
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          organization_id,
          name: jobName,
          status: 'active',
        })
        .select('id, name')
        .single()

      if (jobError) {
        return NextResponse.json(
          { ok: false, error: 'job_creation_failed', message: jobError.message },
          { status: 500 }
        )
      }

      jobId = newJob.id
      jobName = newJob.name
    }
    // ============================================================
    // B2: Assign to existing job
    // ============================================================
    else if (body.action === 'assign_to_existing_job') {
      if (!body.job_id) {
        return NextResponse.json(
          { ok: false, error: 'invalid_request', message: 'job_id is required for assign_to_existing_job' },
          { status: 400 }
        )
      }

      // Verify job exists and belongs to org
      const { data: existingJob, error: jobError } = await supabase
        .from('jobs')
        .select('id, name')
        .eq('id', body.job_id)
        .eq('organization_id', organization_id)
        .single()

      if (jobError || !existingJob) {
        return NextResponse.json(
          { ok: false, error: 'job_not_found', message: 'Job not found or access denied' },
          { status: 404 }
        )
      }

      jobId = existingJob.id
      jobName = existingJob.name
    } else {
      return NextResponse.json(
        { ok: false, error: 'invalid_action', message: 'action must be create_job_and_assign or assign_to_existing_job' },
        { status: 400 }
      )
    }

    // ============================================================
    // Update photos: SET job_id, rescue_status='confirmed'
    // WHERE id IN photo_ids AND job_id IS NULL AND rescue_status='unreviewed'
    //
    // 幂等性：已经 confirmed 的照片不会被重复更新
    // ============================================================

    const { error: updateError, count } = await supabase
      .from('job_photos')
      .update({
        job_id: jobId,
        rescue_status: 'confirmed',
      })
      .eq('organization_id', organization_id)
      .in('id', body.photo_ids)
      .is('job_id', null)
      .eq('rescue_status', 'unreviewed')

    if (updateError) {
      // Rollback: delete job if we just created it and update failed
      if (body.action === 'create_job_and_assign') {
        await supabase.from('jobs').delete().eq('id', jobId)
      }
      return NextResponse.json(
        { ok: false, error: 'update_failed', message: updateError.message },
        { status: 500 }
      )
    }

    const assignedCount = count ?? 0

    // If no photos were updated, it's still OK (idempotent behavior)
    // The photos might have already been assigned

    return NextResponse.json({
      ok: true,
      job_id: jobId,
      job_name: jobName,
      assigned_count: assignedCount,
      requested_count: body.photo_ids.length,
    })
  } catch (error) {
    console.error('[rescue/confirm] Unhandled error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
