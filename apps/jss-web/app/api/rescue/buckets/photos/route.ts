/**
 * POST /api/rescue/buckets/photos
 *
 * Batch fetch photo thumbnails by IDs.
 * Used by bucket detail page to load photos in batches.
 *
 * Body:
 * - photo_ids: string[] (1-200)
 *
 * Returns photos in the same order as requested IDs.
 */

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Body = {
  photo_ids: string[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Session-based auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get org from membership
  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (memErr || !membership?.organization_id) {
    return NextResponse.json(
      { error: 'No organization membership' },
      { status: 403 }
    )
  }

  // Parse body
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray(body.photo_ids) ? body.photo_ids : []

  if (ids.length < 1 || ids.length > 200) {
    return NextResponse.json(
      { error: 'photo_ids must be 1..200' },
      { status: 400 }
    )
  }

  // Fetch photos
  const { data, error } = await supabase
    .from('job_photos')
    .select('id,thumbnail_url,file_url,taken_at,created_at')
    .eq('organization_id', membership.organization_id)
    .in('id', ids)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  // Keep same order as requested IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map((data ?? []).map((p: any) => [p.id, p]))

  const items = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      id: p.id,
      thumbnail_url: p.thumbnail_url ?? null,
      file_url: p.file_url,
      taken_at: p.taken_at,
      created_at: p.created_at,
    }))

  return NextResponse.json({ items })
}
