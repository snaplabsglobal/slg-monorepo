// app/api/cron/cleanup-recycle-bin/route.ts
// Physically deletes transactions that were soft-deleted more than 30 days ago.
// Schedule: daily at 2 AM (e.g. Vercel Cron: "0 2 * * *").
// Secure with CRON_SECRET: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function keyFromAttachmentUrl(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    const path = u.pathname
    return path.startsWith('/') ? path.slice(1) : path
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceKey)
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

  const { data: rows, error: fetchError } = await supabase
    .from('transactions')
    .select('id, attachment_url')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)

  if (fetchError) {
    console.error('[cleanup-recycle-bin] Fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ success: true, deleted_count: 0 })
  }

  for (const row of rows) {
    const key = keyFromAttachmentUrl(row.attachment_url as string | null)
    if (key) {
      try {
        const { deleteFromR2 } = await import('@slo/snap-storage/server')
        await deleteFromR2(key)
      } catch (e: any) {
        if (!e?.message?.includes('not configured')) {
          console.error('[cleanup-recycle-bin] R2 delete failed for', row.id, e)
        }
      }
    }
  }

  const ids = rows.map((r) => r.id)
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('[cleanup-recycle-bin] Delete error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted_count: ids.length })
}
