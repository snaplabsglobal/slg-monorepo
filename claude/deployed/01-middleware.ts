// middleware.ts
// Enhanced middleware with app-level permission checking

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkAppAccess, logAppAccess } from '@/lib/permissions/permissions'

// 定义当前应用的代码
const CURRENT_APP_CODE = process.env.NEXT_PUBLIC_APP_CODE || 'jobsite-snap'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

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
      // 检查用户是否有权限访问当前应用
      const hasAccess = await checkAppAccess(user.id, CURRENT_APP_CODE)

      // 记录访问日志
      await logAppAccess({
        userId: user.id,
        appCode: CURRENT_APP_CODE,
        accessGranted: hasAccess,
        denialReason: hasAccess ? null : 'insufficient_subscription_tier',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      })

      // ============================================
      // 软拦截：重定向到升级页面
      // ============================================
      if (!hasAccess) {
        // 获取用户的数据快照（用于个性化升级提示）
        const userData = await getUserDataSnapshot(user.id)
        
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// ============================================
// 辅助函数：获取用户数据快照
// ============================================
async function getUserDataSnapshot(userId: string) {
  // 这里可以查询用户在其他应用的数据
  // 例如：LedgerSnap 中的收据数量
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 示例：获取 LedgerSnap 数据
    // 实际实现需要根据你的数据库结构调整
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user_id: userId })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Failed to get user data snapshot:', error)
    return null
  }
}
