'use client'

/**
 * Page 3: Buckets List
 * Route: /rescue/buckets
 *
 * Show suggested groups (building-level buckets)
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'

export default function BucketsPage() {
  const router = useRouter()
  const buckets = useRescueStore((s) => s.buckets)
  const photos = useRescueStore((s) => s.photos)

  // Filter out system buckets (unlocated, noise) for main list
  const buildingBuckets = buckets.filter(
    (b) => b.bucketId !== 'bucket_unlocated' && b.bucketId !== 'bucket_noise'
  )
  const unlocatedBucket = buckets.find((b) => b.bucketId === 'bucket_unlocated')
  const noiseBucket = buckets.find((b) => b.bucketId === 'bucket_noise')

  const formatDateRange = (bucket: (typeof buckets)[0]) => {
    const sessions = bucket.sessions
    if (sessions.length === 0) return ''

    const starts = sessions
      .map((s) => s.dateRange?.start)
      .filter(Boolean)
      .sort()
    const ends = sessions
      .map((s) => s.dateRange?.end)
      .filter(Boolean)
      .sort()
      .reverse()

    if (starts.length === 0) return ''

    const startDate = new Date(starts[0]!)
    const endDate = ends.length > 0 ? new Date(ends[0]!) : startDate

    const formatMonth = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    if (
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()
    ) {
      return formatMonth(startDate)
    }

    return `${formatMonth(startDate)} – ${formatMonth(endDate)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Suggested groups</h1>
        <p className="mt-1 text-sm text-gray-600">
          Suggestions based on location & time. Nothing applied yet.
        </p>
      </div>

      {buildingBuckets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          No building groups detected. All photos may be unlocated or scattered.
        </div>
      ) : (
        <div className="space-y-3">
          {buildingBuckets.map((bucket) => (
            <div
              key={bucket.bucketId}
              className="rounded-xl border p-4 transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">
                    {bucket.suggestedLabel || `Group ${bucket.bucketId}`}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {bucket.photoIds.length.toLocaleString()} photos ·{' '}
                    {bucket.sessions.length} sessions ·{' '}
                    {formatDateRange(bucket)}
                  </div>

                  {/* Preview thumbnails placeholder */}
                  <div className="mt-3 flex gap-1">
                    {[...Array(Math.min(5, bucket.sessions.length))].map(
                      (_, i) => (
                        <div
                          key={i}
                          className="h-12 w-12 rounded-lg bg-gray-200"
                        />
                      )
                    )}
                  </div>
                </div>

                <button
                  className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
                  onClick={() =>
                    router.push(`/rescue/buckets/${bucket.bucketId}`)
                  }
                >
                  Review & assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System buckets */}
      <div className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-medium text-gray-500">System buckets</h2>

        {unlocatedBucket && unlocatedBucket.photoIds.length > 0 && (
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Unlocated (No GPS)</div>
                <div className="text-sm text-gray-500">
                  {unlocatedBucket.photoIds.length.toLocaleString()} photos
                </div>
              </div>
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() =>
                  router.push(`/rescue/buckets/${unlocatedBucket.bucketId}`)
                }
              >
                Review
              </button>
            </div>
          </div>
        )}

        {noiseBucket && noiseBucket.photoIds.length > 0 && (
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Noise / Scattered GPS</div>
                <div className="text-sm text-gray-500">
                  {noiseBucket.photoIds.length.toLocaleString()} photos
                </div>
              </div>
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() =>
                  router.push(`/rescue/buckets/${noiseBucket.bucketId}`)
                }
              >
                Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 border-t pt-6">
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/rescue/scan')}
        >
          Back
        </button>
        <button
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
          onClick={() => router.push('/rescue/confirm')}
        >
          Continue to confirm
        </button>
      </div>
    </div>
  )
}
