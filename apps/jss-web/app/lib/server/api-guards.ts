/**
 * API Route Guard Helpers
 *
 * Auth and org context for API routes.
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// Types
// ============================================================

export type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  organization_id: string
  user_id: string
}

// ============================================================
// Auth Guards
// ============================================================

/**
 * Get user session with org context, or throw
 */
export async function requireSessionOrg(): Promise<SessionContext> {
  const r = await getOrganizationIdOrThrow()
  const { data: { user } } = await r.supabase.auth.getUser()

  if (!user?.id) {
    throw new Error('Unauthorized: No user')
  }

  return {
    supabase: r.supabase,
    organization_id: r.organization_id,
    user_id: user.id,
  }
}

/**
 * Get session or return 401 response
 */
export async function getSessionOrUnauthorized(): Promise<
  | { ok: true; ctx: SessionContext }
  | { ok: false; response: NextResponse }
> {
  try {
    const ctx = await requireSessionOrg()
    return { ok: true, ctx }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
}
