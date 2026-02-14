/**
 * JSS Photo Analysis Cron
 *
 * Process pending_photo_analysis queue - call analyze API for each photo.
 * Secured with CRON_SECRET. Vercel Cron: every 5 min.
 *
 * Config: max 3 retries, 5min backoff
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 20
const MAX_RETRIES = 3
const BACKOFF_MINUTES = 5

export async function GET(request: NextRequest) {
  // Auth check
  const auth = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Supabase client with service role
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

  // Fetch pending items ready for processing
  const { data: rows, error: fetchError } = await supabase
    .from('pending_photo_analysis')
    .select('id, photo_id, job_id, retry_count')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .lt('retry_count', MAX_RETRIES)
    .order('next_attempt_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    console.error('[photos/analysis/cron] Fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ processed: 0 })
  }

  // Base URL for internal API calls
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  let processed = 0

  for (const row of rows) {
    const { id, photo_id: photoId, job_id: jobId, retry_count } = row

    // Mark as processing
    const { error: updateError } = await supabase
      .from('pending_photo_analysis')
      .update({
        status: 'processing',
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) continue

    try {
      // Call the analyze API
      const res = await fetch(`${baseUrl}/api/photos/${photoId}/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (res.ok) {
        // Success - mark as done
        const { error: doneError } = await supabase
          .from('pending_photo_analysis')
          .update({
            status: 'done',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (!doneError) processed++
        continue
      }

      // Failed - handle retry
      const body = await res.text()
      const nextRetry = retry_count + 1
      const nextAttempt = new Date(
        Date.now() + BACKOFF_MINUTES * 60 * 1000
      ).toISOString()
      const newStatus = nextRetry >= MAX_RETRIES ? 'failed' : 'pending'

      await supabase
        .from('pending_photo_analysis')
        .update({
          status: newStatus,
          retry_count: nextRetry,
          next_attempt_at: nextAttempt,
          last_error: body.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    } catch (err: unknown) {
      // Exception - handle retry
      const msg = err instanceof Error ? err.message : String(err)
      const nextRetry = retry_count + 1
      const nextAttempt = new Date(
        Date.now() + BACKOFF_MINUTES * 60 * 1000
      ).toISOString()
      const newStatus = nextRetry >= MAX_RETRIES ? 'failed' : 'pending'

      await supabase
        .from('pending_photo_analysis')
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

  return NextResponse.json({ processed, total: rows.length })
}
