'use client'

import { RegisterForm } from '@slo/snap-auth/components/client'

/**
 * JobSite Snap Registration Page
 * Uses shared authentication components with vibrant orange theme
 */
export default function RegisterPage() {
  return (
    <RegisterForm
      theme="jss-web"
      redirectTo="/dashboard"
      title="Create Your Account"
      description="Join JobSite Snap and digitize your timecards"
      showLoginLink={true}
      loginLink="/login"
    />
  )
}
