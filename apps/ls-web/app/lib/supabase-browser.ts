/**
 * Browser-only Supabase client for client components.
 * Uses createClient from @supabase/supabase-js + localStorage session.
 * Do not import @slo/snap-auth here so client bundles never pull in next/headers.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowser(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseBrowser must be called in the browser')
  }
  if (browserClient) return browserClient
  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
  return browserClient
}
