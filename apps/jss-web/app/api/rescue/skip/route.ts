/**
 * POST /api/rescue/skip
 *
 * Skips photos in Rescue Mode.
 * Sets rescue_status = 'skipped' for the specified photos.
 *
 * Input:
 *   {
 *     photo_ids: string[]
 *   }
 *
 * Output:
 *   {
 *     photos_skipped: number
 *   }
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type SkipRequest = {
  photo_ids: string[]
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
  let body: SkipRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { photo_ids } = body

  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return NextResponse.json(
      { error: 'photo_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  // ============================================================
  // Update photos: rescue_status = 'skipped'
  // ============================================================

  const { error: updateError, count: skippedCount } = await supabase
    .from('job_photos')
    .update({
      rescue_status: 'skipped',
    })
    .eq('organization_id', organization_id)
    .in('id', photo_ids)
    .is('job_id', null) // Only skip unassigned photos
    .eq('rescue_status', 'unreviewed') // Only skip unreviewed photos

  if (updateError) {
    console.error('Error skipping photos:', updateError)
    return NextResponse.json(
      { error: 'Failed to skip photos: ' + updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    photos_skipped: skippedCount ?? photo_ids.length,
  })
}
