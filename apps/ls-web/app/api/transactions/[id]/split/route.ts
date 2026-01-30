// app/api/transactions/[id]/split/route.ts
// Transaction split API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import {
  createTransactionSplit,
  getTransactionSplit,
  cancelTransactionSplit,
  validateSplitAmounts,
} from '@/app/lib/split/split'

// GET /api/transactions/[id]/split - Get split details
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

    const split = await getTransactionSplit(id)

    return NextResponse.json({ split })
  } catch (error: any) {
    console.error('Error in GET /api/transactions/[id]/split:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/transactions/[id]/split - Create split
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
    const { splitItems } = body

    if (!splitItems || !Array.isArray(splitItems) || splitItems.length === 0) {
      return NextResponse.json(
        { error: 'Split items are required' },
        { status: 400 }
      )
    }

    const splitId = await createTransactionSplit(id, splitItems)

    return NextResponse.json({ success: true, splitId }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/split:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id]/split - Cancel split
export async function DELETE(
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

    // Get split ID first
    const split = await getTransactionSplit(id)
    if (!split) {
      return NextResponse.json({ error: 'Split not found' }, { status: 404 })
    }

    await cancelTransactionSplit(split.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/transactions/[id]/split:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
