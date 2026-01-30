// app/api/transactions/[id]/category/auto/route.ts
// Auto-assign category for a transaction

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { autoAssignCategory } from '@/app/lib/categories/categories'

// POST /api/transactions/[id]/category/auto - Auto-assign category
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from('transactions')
      .select('vendor_name, total_amount')
      .eq('id', id)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const categoryId = await autoAssignCategory(
      id,
      transaction.vendor_name || '',
      Number(transaction.total_amount)
    )

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Could not auto-assign category' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, categoryId })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/category/auto:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

