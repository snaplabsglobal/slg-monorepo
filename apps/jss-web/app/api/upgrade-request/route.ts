// app/api/upgrade-request/route.ts
// Server-only: creates upgrade request (avoids next/headers in Client Components)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { createUpgradeRequest } from '@/lib/permissions/permissions'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const toTier = (body.toTier as string) || 'pro_jss'
    const appCode = (body.appCode as string) || 'jobsite-snap'
    const referralSource = (body.referralSource as string) || 'direct'
    const userDataSnapshot = (body.userDataSnapshot as Record<string, unknown>) || {}

    await createUpgradeRequest({
      userId: user.id,
      toTier,
      appCode,
      referralSource,
      userDataSnapshot,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Upgrade request error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create upgrade request',
      },
      { status: 500 }
    )
  }
}
