// app/api/transactions/[id]/delete/route.ts
// Soft delete (Layer 1)

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

    // Simplified: No deletion_reason required, just soft delete
    // If already exported/locked, disallow deletion (Layer 3)
    const { data: current } = await supabase
      .from('transactions')
      .select('id,status,deleted_at')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (current.status === 'exported' || current.status === 'locked') {
      return NextResponse.json(
        { error: 'Exported records cannot be deleted. Please void instead.' },
        { status: 409 }
      )
    }

    // Simple soft delete: just set deleted_at (no deletion_reason required)
    const { data, error } = await (supabase as any)
      .from('transactions')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        // Note: deletion_reason is optional, not required for simple deletion
      })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ transaction: data })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/delete:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

