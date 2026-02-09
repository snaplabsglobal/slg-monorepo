/**
 * POST /api/rescue/review/mark
 *
 * Bulk mark photos as jobsite or personal.
 * Uses session-based auth to get organization_id.
 *
 * Body:
 * - photo_ids: string[] (1-500)
 * - user_classification: "jobsite" | "personal" | null
 */

import { NextResponse, NextRequest } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type Body = {
  photo_ids: string[]
  user_classification: 'jobsite' | 'personal' | null
}

export async function POST(req: NextRequest) {
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

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const photoIds = Array.isArray(body.photo_ids) ? body.photo_ids : []

  if (photoIds.length < 1 || photoIds.length > 500) {
    return NextResponse.json(
      { error: 'photo_ids must be 1..500' },
      { status: 400 }
    )
  }

  const uc = body.user_classification
  if (!(uc === null || uc === 'jobsite' || uc === 'personal')) {
    return NextResponse.json(
      { error: 'user_classification must be jobsite | personal | null' },
      { status: 400 }
    )
  }

  // Update with org filter (RLS + where)
  const { data, error } = await supabase
    .from('job_photos')
    .update({ user_classification: uc })
    .eq('organization_id', organization_id)
    .in('id', photoIds)
    .select('id')

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  return NextResponse.json({
    updated: data?.length ?? 0,
    ids: data?.map((r: { id: string }) => r.id) ?? [],
  })
}
