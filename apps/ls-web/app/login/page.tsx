'use client'

import { LoginForm } from '@slo/snap-auth/components/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

/**
 * LedgerSnap Login Page
 * Uses shared authentication components with architectural blue theme
 * Focus: Financial rigor, professional, trustworthy
 */
function LoginPageInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

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
