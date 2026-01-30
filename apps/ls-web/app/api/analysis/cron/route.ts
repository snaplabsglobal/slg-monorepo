// CTO#1: Process pending_analysis - call analyze API; max 3 retries, 5min backoff.
// Secure with CRON_SECRET. Vercel Cron: every 5 min.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 20
const MAX_RETRIES = 3
const BACKOFF_MINUTES = 5

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
      { error: 'Missing Supabase env' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceKey)
  const now = new Date().toISOString()

  const { data: rows, error: fetchError } = await (supabase as any)
    .from('pending_analysis')
    .select('id, transaction_id, retry_count')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .lt('retry_count', MAX_RETRIES)
    .order('next_attempt_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    console.error('[analysis/cron] Fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ processed: 0 })
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let processed = 0
  for (const row of rows) {
    const { id, transaction_id: txId, retry_count } = row

    const { error: updateError } = await (supabase as any)
      .from('pending_analysis')
      .update({
        status: 'processing',
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) continue

    try {
      const res = await fetch(`${baseUrl}/api/receipts/${txId}/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        const { error: doneError } = await (supabase as any)
          .from('pending_analysis')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', id)
        if (!doneError) processed++
        continue
      }

      const body = await res.text()
      const nextRetry = retry_count + 1
      const nextAttempt = new Date(Date.now() + BACKOFF_MINUTES * 60 * 1000).toISOString()
      const newStatus = nextRetry >= MAX_RETRIES ? 'failed' : 'pending'

      await (supabase as any)
        .from('pending_analysis')
        .update({
          status: newStatus,
          retry_count: nextRetry,
          next_attempt_at: nextAttempt,
          last_error: body.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const nextRetry = row.retry_count + 1
      const nextAttempt = new Date(Date.now() + BACKOFF_MINUTES * 60 * 1000).toISOString()
      const newStatus = nextRetry >= MAX_RETRIES ? 'failed' : 'pending'
      await (supabase as any)
        .from('pending_analysis')
        .update({
          status: newStatus,
          retry_count: nextRetry,
          next_attempt_at: nextAttempt,
          last_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }
  }

  return NextResponse.json({ processed })
}
