import { createServerClient } from '@slo/snap-auth'

/**
 * Create a Supabase server client for use in Server Components and Server Actions
 */
export async function createClient() {
  return await createServerClient()
}
