// app/api/tags/[transactionId]/route.ts
// Transaction tags API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import {
  getTransactionTags,
  addTagToTransaction,
  removeTagFromTransaction,
  getAISuggestedTags,
} from '@/app/lib/tags/tags'

// GET /api/tags/[transactionId] - Get tags for a transaction
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tags = await getTransactionTags(transactionId)
    return NextResponse.json({ tags })
  } catch (error: any) {
    console.error('Error in GET /api/tags/[transactionId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tags/[transactionId] - Add tag to transaction
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tagId, source = 'user_manual', userConfirmed = true } = body

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    const result = await addTagToTransaction(
      transactionId,
      tagId,
      source,
      userConfirmed
    )

    return NextResponse.json({ success: true, id: result })
  } catch (error: any) {
    console.error('Error in POST /api/tags/[transactionId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tags/[transactionId] - Remove tag from transaction
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    await removeTagFromTransaction(transactionId, tagId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/tags/[transactionId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
