import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@slo/snap-auth'

/**
 * Middleware to protect routes and handle authentication
 * Protects /dashboard and redirects unauthenticated users to /login
 * 
 * SSO: Uses same Supabase project as other apps for single sign-on
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Public auth routes
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // If accessing protected route without authentication, redirect to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing auth routes while authenticated, redirect to dashboard
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
