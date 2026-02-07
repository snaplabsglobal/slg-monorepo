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
      redirectTo="/jobs"
      title="Create Your Account"
      description="Join JobSite Snap and capture job site photos"
      showLoginLink={true}
      loginLink="/login"
    />
  )
}
