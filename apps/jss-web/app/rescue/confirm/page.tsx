'use client'

/**
 * Page 5: Confirm & Apply
 * Route: /rescue/confirm
 *
 * Final review and apply
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'

export default function ConfirmPage() {
  const router = useRouter()
  const buckets = useRescueStore((s) => s.buckets)
  const photoAssignment = useRescueStore((s) => s.photoAssignment)
  const applyPlan = useRescueStore((s) => s.applyPlan)
  const isApplying = useRescueStore((s) => s.isApplying)
  const reset = useRescueStore((s) => s.reset)

  const [applied, setApplied] = useState(false)

  // Calculate summary
  const buildingBuckets = buckets.filter(
    (b) => b.bucketId !== 'bucket_unlocated' && b.bucketId !== 'bucket_noise'
  )

  let totalPhotos = 0
  let assignedPhotos = 0
  let unassignedPhotos = 0
  let sessionsAssigned = 0

  for (const bucket of buildingBuckets) {
    for (const session of bucket.sessions) {
      const hasAssignment = session.photoIds.some(
        (pid) => photoAssignment[pid] !== null && photoAssignment[pid] !== undefined
      )
      const allAssigned = session.photoIds.every(
        (pid) => photoAssignment[pid] !== null && photoAssignment[pid] !== undefined
      )

      totalPhotos += session.photoIds.length

      if (allAssigned) {
        sessionsAssigned++
        assignedPhotos += session.photoIds.length
      } else {
        for (const pid of session.photoIds) {
          if (photoAssignment[pid]) {
            assignedPhotos++
          } else {
            unassignedPhotos++
          }
        }
      }
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Review & confirm</h1>
        <p className="mt-1 text-sm text-gray-600">
          Check your changes before applying
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border p-4">
        <h2 className="font-medium">Summary</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-2xl font-semibold">
              {buildingBuckets.length}
            </div>
            <div className="text-sm text-gray-500">Buckets</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-2xl font-semibold">{sessionsAssigned}</div>
            <div className="text-sm text-gray-500">Sessions assigned</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-2xl font-semibold">
              {assignedPhotos.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Photos organized</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-2xl font-semibold">0</div>
            <div className="text-sm text-gray-500">Deleted</div>
          </div>
        </div>
      </div>

      {/* Confirmation copy */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <div className="font-medium text-yellow-800">Before you apply</div>
        <ul className="mt-2 space-y-1 text-sm text-yellow-700">
          <li>Nothing changes until you click Confirm.</li>
          <li>You can undo for 24 hours.</li>
        </ul>
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
