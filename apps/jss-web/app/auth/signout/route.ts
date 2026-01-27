import { createServerClient } from '@slo/snap-auth'
import { redirect } from 'next/navigation'

/**
 * Sign out route handler
 * Handles POST requests to sign out the user
 */
export async function POST() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
