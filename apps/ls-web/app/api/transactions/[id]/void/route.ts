// app/api/transactions/[id]/void/route.ts
// Void an exported/locked record (Layer 3)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
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

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason : ''
    if (!reason) {
      return NextResponse.json({ error: 'Void reason is required' }, { status: 400 })
    }

    const { data: current } = await supabase
      .from('transactions')
      .select('id,status')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (current.status !== 'exported' && current.status !== 'locked') {
      return NextResponse.json({ error: 'Only exported/locked records can be voided' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transaction: data })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/void:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

