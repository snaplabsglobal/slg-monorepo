// POST /api/receipts/:id/analyze
// Run AI analysis for a transaction (called by cron or UI retry). Writes back status per repo enum.

import { NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { createClient } from '@supabase/supabase-js'
import { getTransactionTaxAndConfidence } from '@slo/shared-utils'

type Ctx = { params: Promise<{ id: string }> }

function allowCron(request: Request): boolean {
  const auth = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  return !!(secret && auth === `Bearer ${secret}`)
}

async function ensureAuthAndOrg(request: Request, transactionId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership?.organization_id) {
    return { error: NextResponse.json({ error: 'No organization' }, { status: 400 }) }
  }
  return { supabase, organizationId: membership.organization_id }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const { id } = await context.params
    const now = new Date().toISOString()

    let supabase: Awaited<ReturnType<typeof createServerClient>>
    let organizationId: string

    if (allowCron(request)) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !serviceKey) {
        return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
      }
      supabase = createClient(url, serviceKey) as any
      organizationId = '' // service role, no org filter needed
    } else {
      const authResult = await ensureAuthAndOrg(request, id)
      if ('error' in authResult) return authResult.error
      supabase = authResult.supabase
      organizationId = authResult.organizationId
    }

    // 1) Get pending_analysis row by transaction_id
    const { data: pa, error: paErr } = await supabase
      .from('pending_analysis')
      .select('*')
      .eq('transaction_id', id)
      .maybeSingle()

    if (paErr) return NextResponse.json({ error: paErr.message }, { status: 500 })
    if (!pa) return NextResponse.json({ error: 'pending_analysis not found' }, { status: 404 })
    if (pa.status === 'done' || pa.status === 'failed') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // 2) Lock: if still pending, set to processing (cron may have already set it)
    if (pa.status === 'pending') {
      const { error: lockErr } = await supabase
        .from('pending_analysis')
        .update({ status: 'processing', updated_at: now })
        .eq('transaction_id', id)
        .eq('status', 'pending')
      if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 500 })
    }

    // 3) Load transaction
    const q = supabase.from('transactions').select('*').eq('id', id)
    const scoped = organizationId ? q.eq('organization_id', organizationId) : q
    const { data: tx, error: txErr } = await scoped.maybeSingle()

    if (txErr || !tx) {
      await supabase
        .from('pending_analysis')
        .update({
          status: 'failed',
          last_error: 'transaction not found',
          updated_at: now,
        })
        .eq('transaction_id', id)
      return NextResponse.json({ error: 'transaction not found' }, { status: 404 })
    }

    try {
      // 4) Run AI analysis (replace with your real implementation, e.g. fetch attachment_url -> Gemini)
      const ai = await runAiAnalyzeTransaction(tx)

      // 5) Apply tax/confidence rules (getTransactionTaxAndConfidence)
      const { confidence, needs_review } = getTransactionTaxAndConfidence({
        total_amount: ai.total_amount,
        tax_details: ai.tax_details,
        ai_confidence: ai.ai_confidence,
        raw_data: ai.raw_data,
      })

      // 6) Write back: success -> needs_review (never auto-approved); never set is_verified
      const nextStatus = 'needs_review'

      const updatePayload: Record<string, unknown> = {
        tax_details: ai.tax_details,
        raw_data: ai.raw_data,
        ai_confidence: confidence ?? 0,
        needs_review: true,
        status: nextStatus,
        vendor_name: ai.vendor_name ?? tx.vendor_name,
        total_amount: ai.total_amount ?? tx.total_amount,
        updated_at: now,
        is_verified: false,
      }

      const updQuery = organizationId
        ? supabase.from('transactions').update(updatePayload).eq('id', id).eq('organization_id', organizationId)
        : supabase.from('transactions').update(updatePayload).eq('id', id)
      const { error: updErr } = await updQuery

      if (updErr) throw updErr

      // 7) Mark pending_analysis done
      await supabase
        .from('pending_analysis')
        .update({
          status: 'done',
          last_error: null,
          updated_at: now,
        })
        .eq('transaction_id', id)

      return NextResponse.json({ ok: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)

      // Failure: transactions.status = 'error'
      const failPayload = {
        status: 'error',
        needs_review: true,
        updated_at: now,
        is_verified: false,
      }
      const failQuery = organizationId
        ? supabase.from('transactions').update(failPayload).eq('id', id).eq('organization_id', organizationId)
        : supabase.from('transactions').update(failPayload).eq('id', id)
      await failQuery

      // pending_analysis retry is handled by analysis/cron (it updates retry_count, next_attempt_at on non-ok response)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** Replace with real AI: fetch attachment_url image, call Gemini (or your analyzer), return normalized result. */
async function runAiAnalyzeTransaction(tx: Record<string, unknown>): Promise<{
  tax_details: Record<string, unknown>
  raw_data: Record<string, unknown>
  ai_confidence: number
  vendor_name: string | null
  total_amount: number
}> {
  // TODO: wire to your receipt analyzer (e.g. claude/deployed receipt-analyzer + geminiResultToTransaction)
  // For now: pass through existing data so cron doesn't 500 and transaction gets needs_review
  const tax_details = (tx.tax_details && typeof tx.tax_details === 'object'
    ? { ...(tx.tax_details as Record<string, unknown>) }
    : {}) as Record<string, unknown>
  const raw_data = (tx.raw_data && typeof tx.raw_data === 'object'
    ? { ...(tx.raw_data as Record<string, unknown>) }
    : {}) as Record<string, unknown>
  const ai_confidence = typeof tx.ai_confidence === 'number' ? tx.ai_confidence : 0.5
  const vendor_name = typeof tx.vendor_name === 'string' ? tx.vendor_name : null
  const total_amount = typeof tx.total_amount === 'number' ? tx.total_amount : 0

  return {
    tax_details,
    raw_data,
    ai_confidence,
    vendor_name,
    total_amount,
  }
}
