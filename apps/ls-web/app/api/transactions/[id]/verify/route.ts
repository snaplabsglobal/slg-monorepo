// app/api/transactions/[id]/verify/route.ts
// Confirm receipt data (set is_verified=true) — LedgerSnap AI recognition flow

import { NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Ctx) {
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

    const { error: err1 } = await supabase
      .from('transactions')
      .update({ is_verified: true })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)

    if (err1) {
      const msg = (err1 as Error).message || String(err1)
      const columnMissing = /is_verified|column.*does not exist/i.test(msg)
      if (columnMissing) {
        console.warn('[verify] is_verified column missing — run migration 20260202000000_add_is_verified.sql; falling back to status/needs_review')
        const { error: err2 } = await supabase
          .from('transactions')
          .update({ status: 'approved', needs_review: false })
          .eq('id', id)
          .eq('organization_id', membership.organization_id)
        if (err2) return NextResponse.json({ error: (err2 as Error).message }, { status: 400 })
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[verify]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
