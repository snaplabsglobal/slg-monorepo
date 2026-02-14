import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@slo/snap-auth'
import { isAdminEmail } from '@slo/snap-types'

/**
 * Middleware to protect routes and handle authentication
 * Protects /dashboard and /admin routes
 * Implements admin-only access for /admin paths
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin routes - require admin email
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  
  if (isAdminPath) {
    // If not authenticated, redirect to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // If authenticated but not admin, return 403 or redirect to dashboard
    if (!isAdminEmail(user.email)) {
      // Redirect non-admin users to their dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url), { status: 403 })
    }
  }

  // Protected routes
  const protectedPaths = ['/dashboard']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Public auth routes (login only - register is closed)
  const authPaths = ['/login']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect /register to /login (invitation-only system)
  if (request.nextUrl.pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If accessing protected route without authentication, redirect to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing auth routes while authenticated, redirect based on role
  if (isAuthPath && user) {
    if (isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - ceo (CEO Control Tower - no auth required)
     * - api/ceo (CEO API endpoints - no auth required)
     * - proof-pack (public evidence exposure)
     */
    '/((?!_next/static|_next/image|favicon.ico|ceo|api/ceo|proof-pack|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
