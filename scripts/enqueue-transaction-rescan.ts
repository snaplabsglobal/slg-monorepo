/**
 * Enqueue transactions where total_amount > 0 but tax (gst+pst) is all zero for cloud rescan.
 * Run from repo root with: pnpm exec npx tsx scripts/enqueue-transaction-rescan.ts
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL + service role key)
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, total_amount, tax_details')
    .gt('total_amount', 0)
    .limit(5000)

  if (error) throw error

  const bad = (data ?? []).filter((t: { id: string; total_amount?: number; tax_details?: Record<string, unknown> }) => {
    const td = t.tax_details ?? {}
    const gst =
      td.gst_amount ?? (td.gst_cents != null ? Number(td.gst_cents) / 100 : 0)
    const pst =
      td.pst_amount ?? (td.pst_cents != null ? Number(td.pst_cents) / 100 : 0)
    return (
      Number(gst || 0) === 0 &&
      Number(pst || 0) === 0 &&
      Number(t.total_amount || 0) > 0
    )
  })

  if (!bad.length) {
    console.log('No bad transactions found.')
    return
  }

  const rows = bad.map((t: { id: string }) => ({
    transaction_id: t.id,
    status: 'queued',
    reason: 'tax_zero_total_positive_backfill',
  }))

  const { error: insErr } = await supabase
    .from('transaction_rescan_jobs')
    .upsert(rows, { onConflict: 'transaction_id' })

  if (insErr) throw insErr

  console.log(`Enqueued ${rows.length} rescan jobs.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
