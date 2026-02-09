/**
 * POST /api/rescue/scan/:scan_id/clusters/:cluster_id/confirm
 *
 * Confirms a cluster as a Job:
 * 1. Creates new job (or assigns to existing)
 * 2. Updates all photos in cluster: job_id, rescue_status='confirmed'
 *
 * Requires X-Idempotency-Key header for retry safety.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type ConfirmRequest = {
  job_name?: string
  job_id?: string | null
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
  let body: ConfirmRequest = {}
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

  // Check if already confirmed
  const confirmed = new Set(session.clusters_confirmed || [])
  if (confirmed.has(clusterId)) {
    return NextResponse.json(
      { error: 'cluster_already_confirmed' },
      { status: 409 }
    )
  }

  // Get photo IDs for this cluster
  const photoIds: string[] = cluster.photo_ids || []

  if (photoIds.length === 0) {
    return NextResponse.json(
      { error: 'no_photos_in_cluster' },
      { status: 400 }
    )
  }

  // Create job or use existing
  let jobId = body.job_id
  let jobName = body.job_name?.trim()

  if (!jobId) {
    // Generate job name if not provided
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
        geofence_lat: cluster.centroid?.lat,
        geofence_lng: cluster.centroid?.lng,
      })
      .select('id, name')
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: 'confirm_failed', message: jobError.message },
        { status: 500 }
      )
    }

    jobId = newJob.id
    jobName = newJob.name
  } else {
    // Verify job exists
    const { data: existingJob, error: jobLookupError } = await supabase
      .from('jobs')
      .select('id, name')
      .eq('id', jobId)
      .eq('organization_id', organization_id)
      .single()

    if (jobLookupError || !existingJob) {
      return NextResponse.json({ error: 'job_not_found' }, { status: 404 })
    }

    jobName = existingJob.name
  }

  // Update photos
  const { error: updateError, count } = await supabase
    .from('job_photos')
    .update({
      job_id: jobId,
      rescue_status: 'confirmed',
    })
    .eq('organization_id', organization_id)
    .in('id', photoIds)

  if (updateError) {
    // Rollback job if we created it
    if (!body.job_id) {
      await supabase.from('jobs').delete().eq('id', jobId)
    }
    return NextResponse.json(
      { error: 'confirm_failed', message: updateError.message },
      { status: 500 }
    )
  }

  // Update session
  await supabase
    .from('rescue_scan_sessions')
    .update({
      clusters_confirmed: [...(session.clusters_confirmed || []), clusterId],
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId)

  const response = {
    cluster_id: clusterId,
    result: 'confirmed',
    job: {
      job_id: jobId,
      name: jobName,
    },
    updated: {
      photo_count: count ?? photoIds.length,
    },
  }

  // Save idempotency key
  if (idempotencyKey) {
    await supabase.from('rescue_idempotency_keys').insert({
      key: idempotencyKey,
      organization_id,
      endpoint: `confirm_cluster_${scanId}_${clusterId}`,
      request_hash: JSON.stringify(body),
      response,
    })
  }

  return NextResponse.json(response)
}
