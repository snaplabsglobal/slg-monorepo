// app/api/transactions/[id]/category/route.ts
// Transaction category API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import {
  getTransactionCategory,
  updateTransactionCategory,
  confirmCategory,
  autoAssignCategory,
} from '@/app/lib/categories/categories'

// GET /api/transactions/[id]/category - Get category for transaction
export async function GET(
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

    const category = await getTransactionCategory(id)

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error in GET /api/transactions/[id]/category:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/transactions/[id]/category - Set/update category
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

    const body = await request.json()
    const { categoryId, action = 'update' } = body

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    if (action === 'confirm') {
      await confirmCategory(id, categoryId)
    } else {
      await updateTransactionCategory(id, categoryId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/category:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
