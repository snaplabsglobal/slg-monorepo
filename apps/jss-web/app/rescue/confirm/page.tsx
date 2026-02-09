'use client'

/**
 * Page 5: Confirm & Apply
 * Route: /rescue/confirm
 *
 * Final review and apply
 *
 * From spec (260208_JSS_SelfRescueMode_CTO执行版_整合精简.md):
 * - Show: groups named as jobs, photos organized, 0 deleted
 * - "Nothing changes until you click Confirm."
 * - Undo available for 24 hours
 *
 * Stateless Mode:
 * - No batch apply (changes applied individually per confirm)
 * - Show summary of confirmed jobs
 * - No undo (changes already applied)
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'
import { LimitedModeBanner } from '../_components/LimitedModeBanner'

export default function ConfirmPage() {
  const router = useRouter()
  const buckets = useRescueStore((s) => s.buckets) || []
  const stateless = useRescueStore((s) => s.stateless) ?? false
  const groupNames = useRescueStore((s) => s.groupNames) || {}
  const groupNamingState = useRescueStore((s) => s.groupNamingState) || {}
  const applyPlan = useRescueStore((s) => s.applyPlan)
  const isApplying = useRescueStore((s) => s.isApplying) ?? false
  const reset = useRescueStore((s) => s.reset)

  const [applied, setApplied] = useState(false)

  // Calculate summary - simplified per spec
  const jobBuckets = buckets.filter(
    (b) => b.bucketId !== 'bucket_unlocated' && b.bucketId !== 'bucket_noise'
  )

  // Count confirmed groups (named as jobs)
  const namedGroups = jobBuckets.filter(
    (b) => groupNamingState[b.bucketId] === NamingState.USER_CONFIRMED
  )

  // Count photos in named groups
  const photosOrganized = namedGroups.reduce(
    (sum, b) => sum + b.photoIds.length,
    0
  )

  const handleApply = async () => {
    await applyPlan()
    setApplied(true)
  }

  const handleUndo = () => {
    // In real implementation, this would call the undo API
    alert('Undo would restore previous state (not implemented in demo)')
  }

  const handleDone = () => {
    reset()
    router.push('/')
  }

  if (applied) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-green-50 p-6 text-center">
          <div className="text-2xl font-semibold text-green-800">
            Rescue applied!
          </div>
          <p className="mt-2 text-sm text-green-700">
            Your photos have been organized. Undo available for 24 hours.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // Stateless Mode: Changes already applied individually
  // ============================================================
  if (stateless) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Summary</h1>
          <p className="mt-1 text-sm text-gray-600">
            Your confirmed jobs have been created
          </p>
        </div>

        <LimitedModeBanner />

        {/* Summary */}
        <div className="rounded-xl border bg-gray-50 p-6">
          <div className="text-lg font-medium text-gray-900 mb-4">
            Rescue complete:
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-green-500">•</span>
              <span className="font-medium">{namedGroups.length}</span> jobs created
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">•</span>
              <span className="font-medium">{photosOrganized.toLocaleString()}</span> photos organized
            </div>
          </div>
        </div>

        {/* Named groups list */}
        {namedGroups.length > 0 && (
          <div className="space-y-2">
            {namedGroups.map((bucket) => (
              <div key={bucket.bucketId} className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="font-medium text-green-900">
                  {groupNames[bucket.bucketId] || bucket.suggestedLabel}
                  <span className="ml-2 text-green-600">✓</span>
                </div>
                <div className="text-sm text-green-700">
                  {bucket.photoIds.length.toLocaleString()} photos
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            In limited mode, changes were applied immediately when you confirmed each job.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center pt-4">
          <button
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // Stateful Mode: Batch apply
  // ============================================================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Review & confirm</h1>
        <p className="mt-1 text-sm text-gray-600">
          Check your changes before applying
        </p>
      </div>

      {/* Summary - simplified per spec */}
      <div className="rounded-xl border bg-gray-50 p-6">
        <div className="text-lg font-medium text-gray-900 mb-4">
          You&apos;re about to organize:
        </div>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-green-500">•</span>
            <span className="font-medium">{namedGroups.length}</span> groups named as jobs
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">•</span>
            <span className="font-medium">{photosOrganized.toLocaleString()}</span> photos organized
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">•</span>
            <span className="font-medium">0</span> photos deleted
          </div>
        </div>
      </div>

      {/* Named groups list */}
      {namedGroups.length > 0 && (
        <div className="space-y-2">
          {namedGroups.map((bucket) => (
            <div key={bucket.bucketId} className="rounded-lg border p-3">
              <div className="font-medium">
                {groupNames[bucket.bucketId] || bucket.suggestedLabel}
              </div>
              <div className="text-sm text-gray-500">
                {bucket.photoIds.length.toLocaleString()} photos
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation copy - per spec */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm text-blue-900">
          Nothing changes until you click Confirm.
          <br />
          You can undo for 24 hours.
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-4">
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/rescue/buckets')}
        >
          Go back
        </button>
        <button
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black disabled:bg-gray-300"
          disabled={isApplying}
          onClick={handleApply}
        >
          {isApplying ? 'Applying...' : 'Confirm & apply'}
        </button>
      </div>
    </div>
  )
}
