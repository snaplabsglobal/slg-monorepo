/**
 * POST /api/rescue/scan/:scan_id/unknown/assign
 *
 * Assigns unknown photos to an existing job.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type AssignRequest = {
  job_id: string
  photo_ids: string[]
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params
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

  // Validate photo_ids are in unknown list
  const unknownSet = new Set(session.unknown_photo_ids || [])
  const alreadyAssigned = new Set(session.unknown_assigned_ids || [])
  const alreadySkipped = new Set(session.unknown_skipped_ids || [])

  const validPhotoIds = body.photo_ids.filter(
    (id) => unknownSet.has(id) && !alreadyAssigned.has(id) && !alreadySkipped.has(id)
  )

  if (validPhotoIds.length === 0) {
    return NextResponse.json(
      { error: 'no_valid_photos', message: 'All photos already processed or not in unknown list' },
      { status: 400 }
    )
  }

  // Verify job exists
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('id', body.job_id)
    .eq('organization_id', organization_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'job_not_found' }, { status: 404 })
  }

  // Update photos
  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      job_id: body.job_id,
      rescue_status: 'confirmed',
    })
    .eq('organization_id', organization_id)
    .in('id', validPhotoIds)
    .is('job_id', null)

  if (updateError) {
    return NextResponse.json(
      { error: 'assign_failed', message: updateError.message },
      { status: 500 }
    )
  }

  // Update session
  await supabase
    .from('rescue_scan_sessions')
    .update({
      unknown_assigned_ids: [...(session.unknown_assigned_ids || []), ...validPhotoIds],
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId)

  const response = {
    result: 'assigned',
    job_id: body.job_id,
    job_name: job.name,
    updated: {
      photo_count: count ?? validPhotoIds.length,
    },
  }

  // Save idempotency key
  if (idempotencyKey) {
    await supabase.from('rescue_idempotency_keys').insert({
      key: idempotencyKey,
      organization_id,
      endpoint: `assign_unknown_${scanId}`,
      request_hash: JSON.stringify(body),
      response,
    })
  }

  return NextResponse.json(response)
}
