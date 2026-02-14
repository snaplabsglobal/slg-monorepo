'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'

/**
 * Rescue Intro Page
 *
 * "Before you start — want to rescue your photos?"
 *
 * This is the 30-second decision point for new users.
 * Only two choices: Start Self-Rescue or Skip for now
 */
export default function RescueIntroPage() {
  const router = useRouter()
  const startSession = useRescueStore((s) => s.startSession)

  const handleStartRescue = () => {
    // Start a new rescue session
    const sessionId = `rescue_${Date.now().toString(36)}`
    startSession(sessionId, 'user')
    router.push('/rescue/new')
  }

  const handleSkip = () => {
    // Skip for now - go to dashboard
    // Dashboard will still show the Rescue card (but weaker)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/icons/jss-logo.svg"
            alt="JobSite Snap"
            width={56}
            height={56}
            className="rounded-2xl"
          />
        </div>

        {/* Content */}
        <div className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-center text-2xl font-semibold text-gray-900">
            Before you start — want to rescue your photos?
          </h1>

          <p className="mt-4 text-center text-gray-600">
            Most contractors already have years of jobsite photos.
            <br />
            Self-Rescue helps you organize them by location and time — safely.
          </p>

          {/* Trust line - must be visible */}
          <p className="mt-4 text-center text-sm font-medium text-amber-600">
            Nothing changes unless you confirm.
          </p>

          {/* Actions - only two choices */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleStartRescue}
              className="w-full rounded-xl bg-amber-500 px-6 py-4 text-base font-semibold text-white hover:bg-amber-600"
            >
              Start Self-Rescue
            </button>

            <button
              onClick={handleSkip}
              className="w-full rounded-xl border border-gray-200 px-6 py-4 text-base text-gray-600 hover:bg-gray-50"
            >
              Skip for now
            </button>
          </div>

          {/* Tooltip */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Scan → Review → Confirm
            <br />
            Suggestions only. Undo available.
          </p>
        </div>
      </div>
    </div>
  )
}
