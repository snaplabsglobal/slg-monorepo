// POST /api/receipts/:id/pending-analysis
// Register transaction for async analysis (worker / script / UI). Cron only pulls pending_analysis.

import { NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, context: Ctx) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // 1) Transaction exists and not locked (same rules as replace)
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, status, organization_id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (['exported', 'locked', 'voided'].includes(tx.status ?? '')) {
      return NextResponse.json(
        { error: 'Transaction locked/exported/voided' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // 2) Upsert pending_analysis (unique on transaction_id)
    const { error: insErr } = await supabase
      .from('pending_analysis')
      .upsert(
        {
          transaction_id: id,
          organization_id: tx.organization_id ?? membership.organization_id,
          status: 'pending',
          next_attempt_at: now,
          retry_count: 0,
          last_error: null,
          updated_at: now,
        },
        { onConflict: 'transaction_id' }
      )

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // 3) Set transaction to pending (same as replace "Analyzing...")
    const { error: updErr } = await supabase
      .from('transactions')
      .update({
        status: 'pending',
        needs_review: true,
        ai_confidence: 0,
        vendor_name: 'Analyzing...',
        updated_at: now,
      })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
