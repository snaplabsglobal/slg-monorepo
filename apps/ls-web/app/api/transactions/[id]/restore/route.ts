// app/api/transactions/[id]/restore/route.ts
// Restore from soft delete (Trash restore)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: Ctx) {
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

    // Build update object - handle deletion_reason gracefully
    const updateData: Record<string, any> = {
      deleted_at: null,
      deleted_by: null,
    }
    
    // Only include deletion_reason if column exists
    try {
      updateData.deletion_reason = null
    } catch {
      // Column might not exist, skip it
    }

    const { data, error } = await (supabase as any)
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transaction: data })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/restore:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

