'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'

/**
 * Onboarding Check - Logic Page (No UI)
 *
 * Determines if user should see Self-Rescue intro or go to Dashboard
 *
 * Logic (from document):
 * - If rescueCompleted → Dashboard
 * - If hasExistingPhotos (default true for web) → Rescue Intro
 * - Else → Dashboard
 */
export default function OnboardingCheckPage() {
  const router = useRouter()
  const step = useRescueStore((s) => s.step)

  useEffect(() => {
    // Check rescue status
    const rescueCompleted = step === 'applied'
    const rescueInProgress = step !== 'landing' && step !== 'applied'

    if (rescueCompleted) {
      // Already completed rescue, go to dashboard
      router.replace('/dashboard')
    } else if (rescueInProgress) {
      // Resume in-progress rescue
      router.replace('/rescue/buckets')
    } else {
      // First time or skipped - show rescue intro
      // For web, we default to assuming user has existing photos
      router.replace('/onboarding/rescue-intro')
    }
  }, [router, step])

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  )
}
