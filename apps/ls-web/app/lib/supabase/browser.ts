/**
 * Browser-only Supabase client singleton for Realtime and client-side usage.
 * Single instance avoids duplicate subscriptions and "Subscription timed out" from channel leakage.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserSupabase must be called in the browser')
  }
  if (client) return client

  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: { timeout: 20000 },
      auth: { persistSession: true, autoRefreshToken: true },
    }
  )
  return client
}
