'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Onboarding Check - Redirect Page
 *
 * Simply redirects to Jobs page (default destination after login)
 */
export default function OnboardingCheckPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/jobs')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  )
}
