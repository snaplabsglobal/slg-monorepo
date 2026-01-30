// app/api/tags/route.ts
// Tags API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { getTags, createTag, getPopularTags } from '@/app/lib/tags/tags'

// GET /api/tags - Get all tags for user's organization
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'all' | 'popular'
    const limit = parseInt(searchParams.get('limit') || '10')

    let tags
    if (type === 'popular') {
      tags = await getPopularTags(orgMember.organization_id, limit)
    } else {
      tags = await getTags(orgMember.organization_id)
    }

    return NextResponse.json({ tags })
  } catch (error: any) {
    console.error('Error in GET /api/tags:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create a new tag
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
    const { name, display_name, color, icon, category } = body

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    const tag = await createTag(orgMember.organization_id, {
      name,
      display_name,
      color,
      icon,
      category,
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tags:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
