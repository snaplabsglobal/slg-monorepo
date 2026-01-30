// GET /api/projects – list user's organizations as "projects" for offline cache
import { NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: memberships } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (!memberships?.length) {
      return NextResponse.json({ projects: [] })
    }

    const orgIds = memberships.map((m: { organization_id: string }) => m.organization_id)
    const { data: orgs } = await (supabase as any)
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    const projects = (orgs || []).map((o: { id: string; name: string }) => ({
      id: o.id,
      name: o.name ?? 'Unnamed',
    }))

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('[api/projects]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
