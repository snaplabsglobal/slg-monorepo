/**
 * POST /api/rescue/confirm-cluster
 *
 * Confirms a cluster from Rescue Mode scan.
 *
 * Actions:
 *   1. Create new job (with optional name)
 *   2. Update all photos in cluster:
 *      - job_id = new_job_id
 *      - rescue_status = 'confirmed'
 *
 * Input:
 *   {
 *     cluster_id: string
 *     photo_ids: string[]
 *     job_name?: string      // Optional, defaults to "Job from Rescue"
 *     lat?: number           // For geofence
 *     lng?: number           // For geofence
 *   }
 *
 * Output:
 *   {
 *     job_id: string
 *     job_name: string
 *     photos_updated: number
 *   }
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type ConfirmClusterRequest = {
  cluster_id: string
  photo_ids: string[]
  job_name?: string
  lat?: number
  lng?: number
}

export async function POST(req: Request) {
  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const code = msg === 'Unauthorized' ? 401 : 403
    return NextResponse.json({ error: msg }, { status: code })
  }

  // Parse request
  let body: ConfirmClusterRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { cluster_id, photo_ids, job_name, lat, lng } = body

  if (!cluster_id) {
    return NextResponse.json({ error: 'cluster_id is required' }, { status: 400 })
  }

  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return NextResponse.json(
      { error: 'photo_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  // Generate job name if not provided
  const finalJobName = job_name?.trim() || `Job from Rescue (${new Date().toLocaleDateString()})`

  // ============================================================
  // Step 1: Create new job
  // ============================================================

  const jobInsert: Record<string, unknown> = {
    organization_id,
    name: finalJobName,
    status: 'active',
  }

  // Add geofence if coordinates provided
  if (lat != null && lng != null) {
    jobInsert.geofence_lat = lat
    jobInsert.geofence_lng = lng
  }

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert(jobInsert)
    .select('id, name')
    .single()

  if (jobError) {
    console.error('Error creating job:', jobError)
    return NextResponse.json(
      { error: 'Failed to create job: ' + jobError.message },
      { status: 500 }
    )
  }

  // ============================================================
  // Step 2: Update all photos in cluster
  //   - job_id = new_job_id
  //   - rescue_status = 'confirmed'
  // ============================================================

  const { error: updateError, count: updatedCount } = await supabase
    .from('job_photos')
    .update({
      job_id: newJob.id,
      rescue_status: 'confirmed',
    })
    .eq('organization_id', organization_id)
    .in('id', photo_ids)

  if (updateError) {
    // Rollback: delete the job we just created
    await supabase.from('jobs').delete().eq('id', newJob.id)

    console.error('Error updating photos:', updateError)
    return NextResponse.json(
      { error: 'Failed to update photos: ' + updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    job_id: newJob.id,
    job_name: newJob.name,
    photos_updated: updatedCount ?? photo_ids.length,
    cluster_id,
  })
}
