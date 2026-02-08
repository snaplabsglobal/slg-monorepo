'use client'

/**
 * Page 4: Bucket Detail
 * Route: /rescue/buckets/[bucketId]
 *
 * Core page for multi-unit assignment + Fix flow
 */

import React, { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRescueStore, computeAutoPickMinority } from '@/lib/rescue'
import { getSessionDisplayState } from '@/lib/rescue/clustering'
import type { UnitId, RescueSessionSegment } from '@/lib/rescue'

type SessionCardProps = {
  session: RescueSessionSegment
  bucketId: string
  onOpenDrawer: () => void
}

function SessionCard({ session, bucketId, onOpenDrawer }: SessionCardProps) {
  const photoAssignment = useRescueStore((s) => s.photoAssignment)
  const assignSession = useRescueStore((s) => s.assignSession)
  const bucketUIState = useRescueStore((s) => s.bucketUIState)

  const displayState = useMemo(
    () => getSessionDisplayState(session, photoAssignment),
    [session, photoAssignment]
  )

  const minority = useMemo(
    () => computeAutoPickMinority(session.photoIds, photoAssignment),
    [session.photoIds, photoAssignment]
  )

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const timeRange = session.dateRange
    ? `${formatTime(session.dateRange.start)} – ${formatTime(session.dateRange.end)}`
    : 'Unknown time'

  // Get status display
  const getStatusBadge = () => {
    if (displayState === 'assigned') {
      const unit = photoAssignment[session.photoIds[0]]
      return (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
          {unit}
        </span>
      )
    }
    if (displayState === 'mixed') {
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
          Mixed
        </span>
      )
    }
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        Unassigned
      </span>
    )
  }

  const units: Array<Exclude<UnitId, null>> = ['A', 'B', 'C']

  return (
    <div className="rounded-xl border p-4 transition-all hover:border-gray-300">
      <div className="flex items-center justify-between gap-4">
        <button className="flex-1 text-left" onClick={onOpenDrawer}>
          <div className="flex items-center gap-2">
            <div className="font-medium">Session {timeRange}</div>
            {getStatusBadge()}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {session.photoIds.length} photos
          </div>
        </button>

        <div className="flex items-center gap-1">
          {/* Quick assign buttons */}
          {units.map((unit) => (
            <button
              key={unit}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                displayState === 'assigned' &&
                photoAssignment[session.photoIds[0]] === unit
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => assignSession(session.sessionId, unit)}
            >
              {unit}
            </button>
          ))}
          <button
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
              displayState === 'unassigned'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => assignSession(session.sessionId, null)}
          >
            U
          </button>

          {/* Fix button for mixed sessions */}
          {displayState === 'mixed' && minority.autoPick && (
            <button
              className="ml-2 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200"
              onClick={onOpenDrawer}
            >
              Fix ({minority.selected.length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BucketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bucketId = params.bucketId as string

  const buckets = useRescueStore((s) => s.buckets)
  const photoAssignment = useRescueStore((s) => s.photoAssignment)
  const assignPhotos = useRescueStore((s) => s.assignPhotos)
  const moveSelectedToUnit = useRescueStore((s) => s.moveSelectedToUnit)
  const bucketUIState = useRescueStore((s) => s.bucketUIState)
  const setBucketUIState = useRescueStore((s) => s.setBucketUIState)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])

  const bucket = buckets.find((b) => b.bucketId === bucketId)

  if (!bucket) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">Bucket not found</div>
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/rescue/buckets')}
        >
          Back to buckets
        </button>
      </div>
    )
  }

  const activeSession = bucket.sessions.find(
    (s) => s.sessionId === activeSessionId
  )

  const units: Array<Exclude<UnitId, null>> = ['A', 'B', 'C']
  const uiState = bucketUIState[bucketId] || {}
  const stickyDestination = uiState.lastFixDestination

  // Auto-pick minority when opening drawer
  const openDrawer = (sessionId: string) => {
    const session = bucket.sessions.find((s) => s.sessionId === sessionId)
    if (!session) return

    setActiveSessionId(sessionId)

    // Auto-pick minority photos
    const result = computeAutoPickMinority(session.photoIds, photoAssignment)
    if (result.autoPick) {
      setSelectedPhotoIds(result.selected)
    } else {
      setSelectedPhotoIds([])
    }
  }

  const closeDrawer = () => {
    setActiveSessionId(null)
    setSelectedPhotoIds([])
  }

  const handleMoveToUnit = (unitId: UnitId) => {
    if (selectedPhotoIds.length === 0) return
    moveSelectedToUnit(selectedPhotoIds, unitId, bucketId)
    setSelectedPhotoIds([])
    closeDrawer()
  }

  // Order unit buttons with sticky first
  const orderedUnits = stickyDestination
    ? [stickyDestination as Exclude<UnitId, null>, ...units.filter((u) => u !== stickyDestination)]
    : units

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {bucket.suggestedLabel || `Bucket ${bucket.bucketId}`}
          </h1>
          <div className="mt-1 text-sm text-gray-500">
            {bucket.photoIds.length.toLocaleString()} photos ·{' '}
            {bucket.sessions.length} sessions
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => router.push('/rescue/buckets')}
          >
            Skip this bucket
          </button>
        </div>
      </div>

      {/* Units bar */}
      <div className="rounded-xl border bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Units:</span>
          {units.map((unit) => (
            <span
              key={unit}
              className="rounded-lg bg-white px-3 py-1 text-sm font-medium shadow-sm"
            >
              {unit}
            </span>
          ))}
          <span className="rounded-lg bg-white px-3 py-1 text-sm font-medium text-gray-400 shadow-sm">
            Unassigned
          </span>
        </div>
        {uiState.lastUsedUnitId && (
          <div className="mt-2 text-xs text-gray-500">
            Last used: {uiState.lastUsedUnitId}
          </div>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-2">
        {bucket.sessions.map((session) => (
          <SessionCard
            key={session.sessionId}
            session={session}
            bucketId={bucketId}
            onOpenDrawer={() => openDrawer(session.sessionId)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 border-t pt-6">
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/rescue/buckets')}
        >
          Back
        </button>
        <button
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
          onClick={() => router.push('/rescue/buckets')}
        >
          Done with this bucket
        </button>
      </div>

      {/* Session Timeline Drawer */}
      {activeSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-4xl rounded-t-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  Session{' '}
                  {activeSession.dateRange
                    ? `${new Date(activeSession.dateRange.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${new Date(activeSession.dateRange.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : activeSession.sessionId}
                </div>
                <div className="text-sm text-gray-500">
                  {activeSession.photoIds.length} photos
                </div>
              </div>
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            {/* Auto-pick banner */}
            {selectedPhotoIds.length > 0 && (
              <div className="mt-4 rounded-xl bg-yellow-50 p-4">
                <div className="text-sm text-yellow-800">
                  We selected {selectedPhotoIds.length} photos that don't match
                  the main group. Nothing changes until you move them.
                </div>
                <button
                  className="mt-2 text-sm text-yellow-700 underline"
                  onClick={() => setSelectedPhotoIds([])}
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Timeline strip (simplified) */}
            <div className="mt-4 flex gap-1 overflow-x-auto py-2">
              {activeSession.photoIds.slice(0, 48).map((pid) => {
                const isSelected = selectedPhotoIds.includes(pid)
                const unit = photoAssignment[pid]
                return (
                  <button
                    key={pid}
                    className={`h-12 w-12 flex-shrink-0 rounded-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-yellow-500 ring-offset-2'
                        : 'hover:ring-2 hover:ring-gray-300'
                    } ${
                      unit === 'A'
                        ? 'bg-blue-200'
                        : unit === 'B'
                          ? 'bg-green-200'
                          : unit === 'C'
                            ? 'bg-purple-200'
                            : 'bg-gray-200'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedPhotoIds((prev) =>
                          prev.filter((id) => id !== pid)
                        )
                      } else {
                        setSelectedPhotoIds((prev) => [...prev, pid])
                      }
                    }}
                  >
                    <span className="text-[10px] font-medium">
                      {unit || '-'}
                    </span>
                  </button>
                )
              })}
              {activeSession.photoIds.length > 48 && (
                <div className="flex h-12 items-center px-2 text-xs text-gray-500">
                  +{activeSession.photoIds.length - 48} more
                </div>
              )}
            </div>

            {/* Move toolbar */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">
                Move {selectedPhotoIds.length} selected to:
              </span>
              {orderedUnits.map((unit, idx) => (
                <button
                  key={unit}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    idx === 0 && stickyDestination === unit
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  disabled={selectedPhotoIds.length === 0}
                  onClick={() => handleMoveToUnit(unit)}
                >
                  {unit}
                  {idx === 0 && stickyDestination === unit && ' (sticky)'}
                </button>
              ))}
              <button
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
                disabled={selectedPhotoIds.length === 0}
                onClick={() => handleMoveToUnit(null)}
              >
                Unassigned
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
