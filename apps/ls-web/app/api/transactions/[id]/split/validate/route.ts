// app/api/transactions/[id]/split/validate/route.ts
// Validate split amounts API

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { validateSplitAmounts } from '@/app/lib/split/split'

// POST /api/transactions/[id]/split/validate - Validate split amounts
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
    const { splitAmounts } = body

    if (!splitAmounts || !Array.isArray(splitAmounts)) {
      return NextResponse.json(
        { error: 'Split amounts array is required' },
        { status: 400 }
      )
    }

    const validation = await validateSplitAmounts(id, splitAmounts)

    return NextResponse.json({ validation })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/split/validate:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
