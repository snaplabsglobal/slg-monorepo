'use client'

/**
 * Page 3: Group by Job
 * Route: /rescue/buckets
 *
 * Design principle from spec:
 * - Let user only answer: "Is this the same job site?"
 * - No session, no unit, no hour display
 * - Simple: [✓ One job] [Rename] [Skip for now]
 * - Mobile-first: single column, no horizontal scroll
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'

export default function BucketsPage() {
  const router = useRouter()
  const buckets = useRescueStore((s) => s.buckets)
  const groupNamingState = useRescueStore((s) => s.groupNamingState)
  const groupNames = useRescueStore((s) => s.groupNames)
  const setGroupNamingState = useRescueStore((s) => s.setGroupNamingState)
  const setGroupName = useRescueStore((s) => s.setGroupName)

  const [editingBucket, setEditingBucket] = useState<string | null>(null)
  const [tempName, setTempName] = useState('')

  // Filter out system buckets (unlocated, noise) for main list
  const jobBuckets = buckets.filter(
    (b) => b.bucketId !== 'bucket_unlocated' && b.bucketId !== 'bucket_noise'
  )
  const unlocatedBucket = buckets.find((b) => b.bucketId === 'bucket_unlocated')

  // Format date range as "Jul–Aug 2025" or "Feb–Apr 2024"
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

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
    const year = endDate.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${year}`
    }

    return `${startMonth}–${endMonth} ${year}`
  }

  // Handle "One job" confirmation
  const handleConfirmJob = (bucketId: string, name: string) => {
    setGroupNamingState(bucketId, NamingState.USER_CONFIRMED)
    setGroupName(bucketId, name)
  }

  // Handle rename
  const handleStartRename = (bucketId: string, currentName: string) => {
    setEditingBucket(bucketId)
    setTempName(currentName)
  }

  const handleSaveRename = (bucketId: string) => {
    if (tempName.trim()) {
      setGroupName(bucketId, tempName.trim())
      setGroupNamingState(bucketId, NamingState.USER_CONFIRMED)
    }
    setEditingBucket(null)
    setTempName('')
  }

  // Handle skip
  const handleSkip = (bucketId: string) => {
    setGroupNamingState(bucketId, NamingState.SKIPPED)
  }

  // Get bucket display state
  const getBucketState = (bucketId: string) => {
    const state = groupNamingState[bucketId]
    if (state === NamingState.USER_CONFIRMED) return 'confirmed'
    if (state === NamingState.SKIPPED) return 'skipped'
    return 'pending'
  }

  // Count confirmed jobs
  const confirmedCount = jobBuckets.filter(
    (b) => groupNamingState[b.bucketId] === NamingState.USER_CONFIRMED
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Review suggested jobs</h1>
        <p className="mt-1 text-sm text-gray-600">
          We'll only suggest which photos belong to the same job.
          <br />
          You'll review everything before anything is saved.
        </p>
      </div>

      {/* Progress indicator */}
      {jobBuckets.length > 0 && (
        <div className="text-sm text-gray-500">
          {confirmedCount} of {jobBuckets.length} jobs confirmed
        </div>
      )}

      {jobBuckets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          No job sites detected. All photos may be personal or unlocated.
        </div>
      ) : (
        <div className="space-y-4">
          {jobBuckets.map((bucket) => {
            const state = getBucketState(bucket.bucketId)
            const displayName = groupNames[bucket.bucketId] || bucket.suggestedLabel || `Job ${bucket.bucketId.slice(-4)}`
            const isEditing = editingBucket === bucket.bucketId

            return (
              <div
                key={bucket.bucketId}
                className={`rounded-xl border p-4 transition-all ${
                  state === 'confirmed'
                    ? 'border-green-200 bg-green-50'
                    : state === 'skipped'
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Job info */}
                <div className="mb-3">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="flex-1 rounded-lg border px-3 py-2 text-sm"
                        placeholder="Enter job name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(bucket.bucketId)
                          if (e.key === 'Escape') setEditingBucket(null)
                        }}
                      />
                      <button
                        className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"
                        onClick={() => handleSaveRename(bucket.bucketId)}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium text-gray-900">
                        {displayName}
                        {state === 'confirmed' && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        ≈ {bucket.photoIds.length.toLocaleString()} photos · {formatDateRange(bucket)}
                      </div>
                    </>
                  )}
                </div>

                {/* Suggested name hint */}
                {!isEditing && bucket.suggestedLabel && (
                  <div className="mb-3 text-xs text-gray-400">
                    Suggested name based on location
                  </div>
                )}

                {/* Action buttons - single row, mobile-friendly */}
                {!isEditing && state === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                      onClick={() => handleConfirmJob(bucket.bucketId, displayName)}
                    >
                      ✓ One job
                    </button>
                    <button
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => handleStartRename(bucket.bucketId, displayName)}
                    >
                      Rename
                    </button>
                    <button
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                      onClick={() => handleSkip(bucket.bucketId)}
                    >
                      Skip for now
                    </button>
                  </div>
                )}

                {/* Confirmed/Skipped state actions */}
                {!isEditing && state !== 'pending' && (
                  <div className="flex gap-2">
                    <button
                      className="text-sm text-gray-500 underline hover:text-gray-700"
                      onClick={() => handleStartRename(bucket.bucketId, displayName)}
                    >
                      Edit name
                    </button>
                    {state === 'skipped' && (
                      <button
                        className="text-sm text-gray-500 underline hover:text-gray-700"
                        onClick={() => handleConfirmJob(bucket.bucketId, displayName)}
                      >
                        Confirm as job
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unlocated photos - collapsed by default */}
      {unlocatedBucket && unlocatedBucket.photoIds.length > 0 && (
        <div className="border-t pt-4">
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {unlocatedBucket.photoIds.length.toLocaleString()} photos without GPS
                </div>
                <div className="text-xs text-gray-400">
                  You can organize these later
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust message */}
      <div className="text-center text-sm text-gray-500">
        Nothing has been changed yet.
        <br />
        You're in full control.
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
          className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
          onClick={() => router.push('/rescue/confirm')}
        >
          {confirmedCount > 0 ? `Continue with ${confirmedCount} jobs` : 'Continue'}
        </button>
      </div>
    </div>
  )
}
