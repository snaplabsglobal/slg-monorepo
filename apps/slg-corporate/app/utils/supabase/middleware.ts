import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client for middleware usage
 * Supports cross-subdomain session sharing via cookie configuration
 */
export async function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions: CookieOptions = {
              ...options,
              // Enable cross-subdomain session sharing
              // Set domain to parent domain (e.g., '.snaplabs.global') for subdomain sharing
              domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || options?.domain,
              // SameSite configuration
              sameSite: (process.env.NEXT_PUBLIC_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
              // Secure cookies in production
              secure: process.env.NODE_ENV === 'production',
            }
            request.cookies.set(name, value)
            response.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  return { supabase, response }
}
