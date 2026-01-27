import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Sign out route handler
 * Handles POST requests to sign out the user
 */
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
