'use client'

import { LoginForm } from '@slo/snap-auth/components/client'

/**
 * LedgerSnap Login Page
 * Uses shared authentication components with architectural blue theme
 * Focus: Financial rigor, professional, trustworthy
 */
export default function LoginPage() {
  return (
    <LoginForm
      theme="ls-web"
      redirectTo="/dashboard"
      title="Welcome to LedgerSnap"
      description="Sign in to manage your receipts and expenses"
      showRegisterLink={true}
      registerLink="/register"
      appOrigin="LS"
    />
  )
}
