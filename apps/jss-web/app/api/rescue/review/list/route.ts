/**
 * GET /api/rescue/review/list
 *
 * Lists photos for a specific review bucket with cursor pagination.
 * Uses session-based auth to get organization_id.
 *
 * Query params:
 * - bucket: unknownLocation | geocodeFailed | lowAccuracy | likelyPersonal | unsure
 * - limit: 1-120 (default 60)
 * - cursor: ISO timestamp for pagination
 */

import { NextResponse, NextRequest } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

type Bucket =
  | 'unknownLocation'
  | 'geocodeFailed'
  | 'lowAccuracy'
  | 'likelyPersonal'
  | 'unsure'

function isBucket(v: string | null): v is Bucket {
  return (
    v === 'unknownLocation' ||
    v === 'geocodeFailed' ||
    v === 'lowAccuracy' ||
    v === 'likelyPersonal' ||
    v === 'unsure'
  )
}

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url)
  const bucketParam = url.searchParams.get('bucket')
  const limitParam = url.searchParams.get('limit') ?? '60'
  const cursor = url.searchParams.get('cursor')

  const limit = Math.max(1, Math.min(120, Number(limitParam) || 60))

  if (!bucketParam || !isBucket(bucketParam)) {
    return NextResponse.json(
      {
        error:
          'bucket must be one of unknownLocation|geocodeFailed|lowAccuracy|likelyPersonal|unsure',
      },
      { status: 400 }
    )
  }

  let q = supabase
    .from('job_photos')
    .select(
      [
        'id',
        'organization_id',
        'job_id',
        'thumbnail_url',
        'file_url',
        'taken_at',
        'created_at',
        'temp_lat',
        'temp_lng',
        'temp_accuracy_m',
        'jobsite_score',
        'jobsite_reasons',
        'ai_classification',
        'user_classification',
      ].join(',')
    )
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Cursor pagination
  if (cursor) {
    q = q.lt('created_at', cursor)
  }

  // Bucket filters
  switch (bucketParam) {
    case 'unknownLocation':
      // Missing GPS
      q = q.or('temp_lat.is.null,temp_lng.is.null')
      break

    case 'lowAccuracy':
      // Has GPS but accuracy > 200m
      q = q
        .not('temp_lat', 'is', null)
        .not('temp_lng', 'is', null)
        .gt('temp_accuracy_m', 200)
      break

    case 'geocodeFailed':
      // smart_trace_suggestion->geo->status === 'failed'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.contains('smart_trace_suggestion', { geo: { status: 'failed' } } as any)
      break

    case 'likelyPersonal':
      q = q.or(
        'user_classification.eq.personal,and(user_classification.is.null,ai_classification.eq.personal)'
      )
      break

    case 'unsure':
      q = q
        .is('user_classification', null)
        .or('ai_classification.is.null,ai_classification.eq.unsure')
      break
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((p: any) => {
    const hasGps = p.temp_lat != null && p.temp_lng != null
    const reasonTags = Array.isArray(p.jobsite_reasons)
      ? p.jobsite_reasons
      : p.jobsite_reasons?.tags ?? p.jobsite_reasons ?? []

    return {
      id: p.id,
      job_id: p.job_id,
      thumbnail_url: p.thumbnail_url ?? null,
      file_url: p.file_url,
      taken_at: p.taken_at,
      created_at: p.created_at,
      has_gps: hasGps,
      accuracy_m: p.temp_accuracy_m ?? null,
      score: p.jobsite_score ?? null,
      reason_tags: Array.isArray(reasonTags) ? reasonTags.slice(0, 5) : [],
    }
  })

  const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null

  return NextResponse.json({
    bucket: bucketParam,
    limit,
    next_cursor: nextCursor,
    items,
  })
}
