'use client'

import { LoginForm } from '@slo/snap-auth/components/client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { checkOfflineSession } from '@/app/lib/auth/offline-session'

/**
 * LedgerSnap Login Page
 * CTO#1: When offline and no session, show "请在有网络的地方登录" instead of failing.
 */
function LoginPageInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    checkOfflineSession().then((result) => {
      if (!mounted) return
      if (result.status === 'offline_no_session' || result.status === 'offline_check_failed') {
        setOfflineMessage(result.message)
      } else {
        setOfflineMessage(null)
      }
    })
    return () => { mounted = false }
  }, [])

  if (offlineMessage) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
        <p className="text-amber-800 font-medium text-center mb-4">{offlineMessage}</p>
        <p className="text-sm text-gray-600 text-center">恢复网络后刷新页面即可登录</p>
      </div>
    )
  }

  return (
    <LoginForm
      theme="ls-web"
      redirectTo={redirect}
      title="Welcome to LedgerSnap"
      description="Sign in to manage your receipts and expenses"
      showRegisterLink={true}
      registerLink="/register"
      appOrigin="LS"
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <LoginPageInner />
    </Suspense>
  )
}
