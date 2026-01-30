// app/api/tags/suggest/route.ts
// AI tag suggestions API

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { getAISuggestedTags } from '@/app/lib/tags/tags'

// POST /api/tags/suggest - Get AI suggested tags
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { vendorName, amount } = body

    if (!vendorName || amount === undefined) {
      return NextResponse.json(
        { error: 'Vendor name and amount are required' },
        { status: 400 }
      )
    }

    const suggestions = await getAISuggestedTags(
      orgMember.organization_id,
      vendorName,
      amount
    )

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error('Error in POST /api/tags/suggest:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
