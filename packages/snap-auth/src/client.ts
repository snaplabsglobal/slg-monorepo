import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Creates a Supabase client for browser-side usage
 * Cookie domain configuration is handled in middleware for cross-subdomain support
 * 
 * For SSO across subdomains, ensure all apps use the same Supabase project
 * and configure NEXT_PUBLIC_COOKIE_DOMAIN in environment variables
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Also export as createBrowserClient for convenience
export { createClient as createBrowserClient }
