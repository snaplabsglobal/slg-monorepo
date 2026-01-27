import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client for server-side usage (Server Components, Route Handlers)
 * Supports cross-subdomain session sharing via cookie configuration
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions: CookieOptions = {
                ...options,
                // Enable cross-subdomain session sharing
                domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || options?.domain,
                // SameSite configuration
                sameSite: (process.env.NEXT_PUBLIC_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
                // Secure cookies in production
                secure: process.env.NODE_ENV === 'production',
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
