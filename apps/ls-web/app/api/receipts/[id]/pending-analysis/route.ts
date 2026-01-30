// CTO#1: Register transaction for async analysis (called by upload-queue worker after quick-upload success)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: transactionId } = await params
  if (!transactionId) {
    return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const organizationId = (orgMember as any)?.organization_id ?? null

    const { error: insertError } = await (supabase as any)
      .from('pending_analysis')
      .upsert(
        {
          transaction_id: transactionId,
          organization_id: organizationId,
          status: 'pending',
          retry_count: 0,
          next_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'transaction_id', ignoreDuplicates: false }
      )

    if (insertError) {
      console.error('[pending-analysis] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[pending-analysis] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
