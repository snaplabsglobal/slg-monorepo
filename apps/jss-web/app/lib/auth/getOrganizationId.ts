/**
 * Session-based Auth Helper
 *
 * Gets organization_id from user's session without needing URL params.
 * Derives: user → organization_members → organization_id
 *
 * Fits current "single-org per user" architecture.
 * Future multi-org support can add an org picker.
 */

import { createClient } from '@/lib/supabase/server'

export async function getOrganizationIdOrThrow() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    throw new Error('Unauthorized')
  }

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (memErr || !membership?.organization_id) {
    throw new Error('No organization membership')
  }

  return {
    supabase,
    user,
    organization_id: membership.organization_id,
  }
}
