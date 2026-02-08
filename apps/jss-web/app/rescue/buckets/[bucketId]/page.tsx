'use client'

/**
 * Page 4: Job Detail Preview
 * Route: /rescue/buckets/[bucketId]
 *
 * Phase 1 simplified design from spec:
 * - No session/unit complexity
 * - Just show photo preview for this job
 * - User can confirm or go back
 *
 * "Rescue only answers: which job? Not: which unit?"
 */

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'

export default function BucketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bucketId = params.bucketId as string

  const buckets = useRescueStore((s) => s.buckets)
  const groupNames = useRescueStore((s) => s.groupNames)
  const groupNamingState = useRescueStore((s) => s.groupNamingState)
  const setGroupName = useRescueStore((s) => s.setGroupName)
  const setGroupNamingState = useRescueStore((s) => s.setGroupNamingState)

  const bucket = buckets.find((b) => b.bucketId === bucketId)

  if (!bucket) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">Job not found</div>
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/rescue/buckets')}
        >
          Back to jobs
        </button>
      </div>
    )
  }

  const displayName = groupNames[bucketId] || bucket.suggestedLabel || `Job ${bucketId.slice(-4)}`
  const isConfirmed = groupNamingState[bucketId] === NamingState.USER_CONFIRMED

  // Format date range
  const formatDateRange = () => {
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

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startYear}`
    }
    if (startYear === endYear) {
      return `${startMonth}–${endMonth} ${startYear}`
    }
    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`
  }

  const handleConfirm = () => {
    setGroupNamingState(bucketId, NamingState.USER_CONFIRMED)
    setGroupName(bucketId, displayName)
    router.push('/rescue/buckets')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{displayName}</h1>
        <div className="mt-1 text-sm text-gray-500">
          ≈ {bucket.photoIds.length.toLocaleString()} photos · {formatDateRange()}
        </div>
      </div>

      {/* Photo grid preview */}
      <div className="rounded-xl border bg-gray-50 p-4">
        <div className="mb-3 text-sm text-gray-500">Photo preview</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {/* Show placeholder thumbnails */}
          {[...Array(Math.min(24, bucket.photoIds.length))].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gray-200"
            />
          ))}
          {bucket.photoIds.length > 24 && (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
              +{bucket.photoIds.length - 24}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm text-amber-800">
          <strong>Is this one job site?</strong>
          <br />
          All these photos appear to be from the same location.
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          className="w-full rounded-xl bg-gray-900 px-6 py-4 text-base font-semibold text-white hover:bg-black"
          onClick={handleConfirm}
        >
          ✓ Yes, this is one job
        </button>

        <button
          className="w-full rounded-xl border border-gray-200 px-6 py-4 text-base text-gray-600 hover:bg-gray-50"
          onClick={() => router.push('/rescue/buckets')}
        >
          Go back
        </button>
      </div>

      {/* Trust message */}
      <div className="text-center text-sm text-gray-500">
        You can rename or skip this job on the previous screen.
      </div>
    </div>
  )
}
