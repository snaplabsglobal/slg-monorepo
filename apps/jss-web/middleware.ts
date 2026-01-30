// middleware.ts
// Enhanced middleware with app-level permission checking
// Uses Edge-safe permissions (no next/headers) so middleware can run in Edge.

import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@slo/snap-auth'
import {
  checkAppAccessWithClient,
  logAppAccessWithClient,
  getUserDataSnapshotWithClient,
} from '@/lib/permissions/permissions-edge'

// 定义当前应用的代码
const CURRENT_APP_CODE = process.env.NEXT_PUBLIC_APP_CODE || 'jobsite-snap'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/profile', '/settings', '/projects', '/timecards']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Auth routes that should redirect to dashboard if already logged in
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Public paths that don't require authentication
  const publicPaths = ['/', '/about', '/pricing', '/contact', '/upgrade']
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname === path
  )

  // ============================================
  // 1. 未登录用户处理
  // ============================================
  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ============================================
  // 2. 已登录用户访问认证页面
  // ============================================
  if (user && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ============================================
  // 3. 应用级别权限检查（核心逻辑）
  // ============================================
  if (user && isProtectedPath) {
    try {
      // 使用 middleware 的 supabase（不依赖 next/headers）
      const hasAccess = await checkAppAccessWithClient(
        supabase,
        user.id,
        CURRENT_APP_CODE
      )

      await logAppAccessWithClient(supabase, {
        userId: user.id,
        appCode: CURRENT_APP_CODE,
        accessGranted: hasAccess,
        denialReason: hasAccess ? null : 'insufficient_subscription_tier',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      })

      // ============================================
      // 软拦截：重定向到升级页面
      // ============================================
      if (!hasAccess) {
        const userData = await getUserDataSnapshotWithClient(supabase, user.id)
        
        const upgradeUrl = new URL('/upgrade', request.url)
        upgradeUrl.searchParams.set('from', 'paywall')
        upgradeUrl.searchParams.set('app', CURRENT_APP_CODE)
        upgradeUrl.searchParams.set('path', request.nextUrl.pathname)
        
        // 存储用户数据到 session（可选）
        if (userData) {
          upgradeUrl.searchParams.set('data', JSON.stringify(userData))
        }

        return NextResponse.redirect(upgradeUrl)
      }
    } catch (error) {
      console.error('Permission check error:', error)
      // 出错时允许访问，但记录错误
      // 生产环境可能需要更严格的处理
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
