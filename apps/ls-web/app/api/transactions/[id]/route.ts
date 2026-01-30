// app/api/transactions/[id]/route.ts
// Transaction detail API (GET) + edit (PATCH)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type RouteContext = { params: Promise<{ id: string }> }

function pickUpdatableFields(body: any) {
  const updates: Record<string, any> = {}

  if (typeof body?.vendor_name === 'string' || body?.vendor_name === null) {
    updates.vendor_name = body.vendor_name
  }
  if (typeof body?.transaction_date === 'string') {
    updates.transaction_date = body.transaction_date
  }
  if (typeof body?.category_user === 'string' || body?.category_user === null) {
    updates.category_user = body.category_user
  }
  if (typeof body?.status === 'string') {
    updates.status = body.status
  }
  if (typeof body?.needs_review === 'boolean') {
    updates.needs_review = body.needs_review
  }
  if (body?.total_amount !== undefined) {
    const n = Number(body.total_amount)
    if (!Number.isNaN(n)) updates.total_amount = n
  }

  // tax_details may be JSONB; allow replacing whole object (optional)
  if (body?.tax_details && typeof body.tax_details === 'object') {
    updates.tax_details = body.tax_details
  }

  return updates
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // If transaction is deleted, return 404 unless Recycle Bin context (includeDeleted=true)
    if (data.deleted_at && !includeDeleted) {
      return NextResponse.json(
        { error: 'Transaction has been deleted. Please check the Recycle Bin.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ transaction: data })
  } catch (error: any) {
    console.error('Error in GET /api/transactions/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // lock rules (Layer 3) + soft delete protection
    const { data: current } = await supabase
      .from('transactions')
      .select('status, deleted_at')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (current.deleted_at) {
      return NextResponse.json({ error: 'Deleted records cannot be edited. Restore first.' }, { status: 409 })
    }

    if (current.status === 'exported' || current.status === 'locked' || current.status === 'voided') {
      return NextResponse.json({ error: 'Locked records cannot be edited.' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const updates = pickUpdatableFields(body)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
    }

    // Always update updated_at if exists
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ transaction: data })
  } catch (error: any) {
    console.error('Error in PATCH /api/transactions/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

