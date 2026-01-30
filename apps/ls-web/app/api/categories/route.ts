// app/api/categories/route.ts
// Accounting categories API

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { getAccountingCategories } from '@/app/lib/categories/categories'

// GET /api/categories - Get all accounting categories
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await getAccountingCategories()

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
