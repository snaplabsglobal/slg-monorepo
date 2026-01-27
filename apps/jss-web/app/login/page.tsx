'use client'

import { LoginForm } from '@slo/snap-auth/components/client'

/**
 * JobSite Snap Login Page
 * Uses shared authentication components with vibrant orange theme
 * Focus: Energy, action, construction site vibrancy
 */
export default function LoginPage() {
  return (
    <LoginForm
      theme="jss-web"
      redirectTo="/dashboard"
      title="Welcome to JobSite Snap"
      description="Sign in to manage your job site timecards"
      showRegisterLink={true}
      registerLink="/register"
      appOrigin="JSS"
    />
  )
}
