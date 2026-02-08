'use client'

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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
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
