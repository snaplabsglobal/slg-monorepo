'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { RescueEntryCard } from '@/components/rescue'
import { DashboardLayout } from '@/components/layout'

/**
 * JSS Dashboard - Action Hub
 *
 * Per CDO document:
 * - Self-Rescue Card is always first
 * - Jobs snapshot below
 * - Uses standard DashboardLayout with sidebar/bottom nav
 */
export default function DashboardPage() {
  const router = useRouter()
  const step = useRescueStore((s) => s.step)

  // Determine rescue state
  const rescueInProgress = step !== 'landing' && step !== 'applied'
  const rescueCompleted = step === 'applied'

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/camera"
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Take Photo</div>
                <div className="text-xs text-gray-500">Snap first, assign later</div>
              </div>
            </Link>
            <Link
              href="/rescue"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Self-Rescue</div>
                <div className="text-xs text-gray-500">Organize old photos</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
