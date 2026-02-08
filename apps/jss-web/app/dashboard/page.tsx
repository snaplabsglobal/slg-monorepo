'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { RescueEntryCard } from '@/components/rescue'

/**
 * JSS Dashboard - Action Hub
 *
 * Priority order (from document):
 * 1. Self-Rescue Entry/Status Card (always first)
 * 2. Jobs Snapshot
 * 3. Secondary links (Settings, Help)
 */
export default function DashboardPage() {
  const router = useRouter()
  const step = useRescueStore((s) => s.step)
  const session = useRescueStore((s) => s.session)

  // Determine rescue state
  const rescueInProgress = step !== 'landing' && step !== 'applied'
  const rescueCompleted = step === 'applied'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500">
              <svg
                className="h-5 w-5 text-white"
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
            <div>
              <div className="text-sm font-semibold text-gray-900">
                JobSite Snap
              </div>
              <div className="text-xs text-gray-500">Job Photos</div>
            </div>
          </div>

          <Link
            href="/auth/signout"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* PRIMARY ACTION: Self-Rescue Card */}
        {rescueCompleted ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-lg font-semibold text-green-800">
                    Self-Rescue completed
                  </span>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  Your photos are organized. Undo available for 24 hours.
                </p>
              </div>
              <button
                onClick={() => router.push('/rescue/buckets')}
                className="rounded-xl border border-green-300 px-3 py-2 text-sm text-green-700 hover:bg-green-100"
              >
                View summary
              </button>
            </div>
          </div>
        ) : rescueInProgress ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-amber-800">
                  Self-Rescue in progress
                </div>
                <p className="mt-1 text-sm text-amber-700">
                  You're halfway done. Continue organizing your photos.
                </p>
              </div>
              <button
                onClick={() => router.push('/rescue/buckets')}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Continue →
              </button>
            </div>
          </div>
        ) : (
          <RescueEntryCard />
        )}

        {/* JOBS SNAPSHOT */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your jobs</h2>
            <Link
              href="/jobs"
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              View all jobs
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {/* Placeholder for jobs - will be replaced with actual data */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700">
                No jobs yet
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Create your first job to start organizing photos
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              href="/jobs"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              View all jobs
            </Link>
            <Link
              href="/jobs/new"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              + New Job
            </Link>
          </div>
        </div>

        {/* SECONDARY ACTIONS */}
        <div className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-gray-700">
            Settings
          </Link>
          <span>·</span>
          <Link href="/camera" className="hover:text-gray-700">
            Camera
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-gray-700">
            About JSS
          </Link>
        </div>
      </main>
    </div>
  )
}
