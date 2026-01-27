'use client'

import { LoginForm } from '@slo/snap-auth/components/client'

/**
 * SLG Corporate Login Page
 * Uses shared authentication components from @slo/snap-auth
 * Registration is closed - invitation only
 */
export default function LoginPage() {
  return (
    <LoginForm
      theme="slg-corporate"
      redirectTo="/dashboard"
      title="Welcome Back"
      description="Sign in to your SnapLabs Global account"
      showRegisterLink={false}
    />
  )
}
