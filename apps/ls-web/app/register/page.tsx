'use client'

import { RegisterForm } from '@slo/snap-auth/components/client'

/**
 * LedgerSnap Registration Page
 * Uses shared authentication components with architectural blue theme
 */
export default function RegisterPage() {
  return (
    <RegisterForm
      theme="ls-web"
      redirectTo="/dashboard"
      title="Create Your Account"
      description="Join LedgerSnap and start tracking your expenses"
      showLoginLink={true}
      loginLink="/login"
    />
  )
}
