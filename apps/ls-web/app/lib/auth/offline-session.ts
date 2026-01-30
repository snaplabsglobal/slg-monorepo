/**
 * CTO#1: Offline session check. Do not redirect to login when offline.
 * Use from client components only (getSession + navigator.onLine).
 */

import { createBrowserClient } from '@slo/snap-auth'

export type OfflineSessionResult =
  | { status: 'valid'; session: { access_token: string; expires_at?: number } }
  | { status: 'offline_no_session'; message: '请在有网络的地方登录' }
  | { status: 'offline_check_failed'; message: '离线模式，使用本地 session' }
  | { status: 'session_expired'; redirect: '/login' }
  | { status: 'session_check_error'; redirect: '/login' }

export async function checkOfflineSession(): Promise<OfflineSessionResult> {
  if (typeof window === 'undefined') {
    return { status: 'session_check_error', redirect: '/login' }
  }

  const supabase = createBrowserClient()

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      if (!navigator.onLine) {
        return { status: 'offline_no_session', message: '请在有网络的地方登录' }
      }
      return { status: 'session_expired', redirect: '/login' }
    }

    const expiresAt = (session.expires_at ?? 0) * 1000
    const willExpireSoon = expiresAt - Date.now() < 5 * 60 * 1000
    if (willExpireSoon && navigator.onLine) {
      await supabase.auth.refreshSession()
    }

    return { status: 'valid', session }
  } catch {
    if (!navigator.onLine) {
      return { status: 'offline_check_failed', message: '离线模式，使用本地 session' }
    }
    return { status: 'session_check_error', redirect: '/login' }
  }
}
