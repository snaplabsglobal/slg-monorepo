/**
 * Enqueue "bad" transactions (tax=0, total>0, not locked) into pending_analysis for cloud rescan.
 * Does not run AI; cron will pick up pending_analysis and call POST /api/receipts/:id/analyze.
 *
 * Run from repo root:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm enqueue-cloud-rescan
 * Or: set env in .env (root or apps/ls-web) and run: pnpm enqueue-cloud-rescan
 *
 * Acceptance:
 * - tax=0 && total>0 transactions → status set to pending, row in pending_analysis
 * - Cron (GET /api/analysis/cron) will process them and call analyze; results written back.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function taxZero(td: Record<string, unknown> | null | undefined): boolean {
  if (!td || typeof td !== 'object') return true
  const gst =
    (td.gst_amount as number) ??
    (td.gst_cents != null ? Number(td.gst_cents) / 100 : 0)
  const pst =
    (td.pst_amount as number) ??
    (td.pst_cents != null ? Number(td.pst_cents) / 100 : 0)
  return Number(gst || 0) === 0 && Number(pst || 0) === 0
}

async function main() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, total_amount, tax_details, status, organization_id')
    .gt('total_amount', 0)
    .limit(5000)

  if (error) throw error

  const bad = (data ?? []).filter((t: Record<string, unknown>) => {
    const status = t.status as string
    if (['exported', 'locked', 'voided'].includes(status)) return false
    return taxZero(t.tax_details as Record<string, unknown>) && Number(t.total_amount) > 0
  })

  if (!bad.length) {
    console.log('No bad transactions found.')
    return
  }

  const now = new Date().toISOString()

  // 1) Upsert pending_analysis (unique on transaction_id)
  const rows = bad.map((t: Record<string, unknown>) => ({
    transaction_id: t.id,
    organization_id: t.organization_id ?? null,
    status: 'pending',
    next_attempt_at: now,
    retry_count: 0,
    last_error: null,
    updated_at: now,
  }))

  const { error: upErr } = await supabase
    .from('pending_analysis')
    .upsert(rows, { onConflict: 'transaction_id' })

  if (upErr) throw upErr

  // 2) Set transactions to pending (same as replace / pending-analysis)
  const ids = bad.map((t: Record<string, unknown>) => t.id) as string[]

  const { error: txErr } = await supabase
    .from('transactions')
    .update({
      status: 'pending',
      needs_review: true,
      ai_confidence: 0,
      vendor_name: 'Analyzing...',
      updated_at: now,
    })
    .in('id', ids)

  if (txErr) throw txErr

  console.log(`Enqueued cloud rescan for ${ids.length} transactions.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
