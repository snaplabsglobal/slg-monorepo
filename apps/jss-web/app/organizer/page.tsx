'use client'

/**
 * Rescue Mode Page (v1 - Engineering Implementation)
 * Route: /organizer
 *
 * Strict State Machine:
 *   'setup' → 'scanning' → 'review' → 'ready_to_apply' → 'applied'
 *
 * Data Source (ONLY valid input):
 *   job_id IS NULL AND rescue_status = 'unreviewed'
 *
 * Key Rules:
 *   - No fake data, no placeholder counts
 *   - Apply only succeeds when all items processed
 *   - Re-entering Rescue shows only new unprocessed items
 */

import React, { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../components/layout'
import { Shield, Loader2, MapPin, Calendar, Check, X } from 'lucide-react'

// ============================================================
// Types
// ============================================================

type RescueFlowState =
  | 'setup'
  | 'scanning'
  | 'review'
  | 'ready_to_apply'
  | 'applied'

type SummaryResponse = {
  unreviewed_count: number
  with_gps_count: number
  unknown_location_count: number
  has_rescue_items: boolean
  ready_to_apply: boolean
  migration_pending?: boolean
}

type Cluster = {
  cluster_id: string
  photo_ids: string[]
  photo_count: number
  lat: number
  lng: number
  start_date: string
  end_date: string
  geohash: string
}

type ScanResponse = {
  total_photos_scanned: number
  clusters: Cluster[]
  unknown_count: number
  unknown_photo_ids: string[]
}

// ============================================================
// API Functions
// ============================================================

async function fetchSummary(): Promise<SummaryResponse> {
  const res = await fetch('/api/rescue/summary')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function runScan(): Promise<ScanResponse> {
  const res = await fetch('/api/rescue/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'unassigned' }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function confirmCluster(
  clusterId: string,
  photoIds: string[],
  jobName?: string,
  lat?: number,
  lng?: number
): Promise<{ job_id: string; job_name: string }> {
  const res = await fetch('/api/rescue/confirm-cluster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cluster_id: clusterId,
      photo_ids: photoIds,
      job_name: jobName,
      lat,
      lng,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function skipPhotos(photoIds: string[]): Promise<void> {
  const res = await fetch('/api/rescue/skip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_ids: photoIds }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function applyRescue(): Promise<{ success: boolean; remaining_count: number }> {
  const res = await fetch('/api/rescue/apply', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Apply failed')
  return data
}

// ============================================================
// Components
// ============================================================

function ClusterCard({
  cluster,
  onConfirm,
  onSkip,
  isProcessing,
}: {
  cluster: Cluster
  onConfirm: () => void
  onSkip: () => void
  isProcessing: boolean
}) {
  const startDate = new Date(cluster.start_date).toLocaleDateString()
  const endDate = new Date(cluster.end_date).toLocaleDateString()
  const dateRange = startDate === endDate ? startDate : `${startDate} – ${endDate}`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {cluster.lat.toFixed(4)}, {cluster.lng.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{dateRange}</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {cluster.photo_count} photos
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="Skip"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-lg bg-amber-500 p-2 text-white hover:bg-amber-600 disabled:opacity-50"
            title="Confirm as Job"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

function RescueModeContent() {
  const router = useRouter()

  // State machine
  const [flowState, setFlowState] = useState<RescueFlowState>('setup')

  // Data
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [processedClusterIds, setProcessedClusterIds] = useState<Set<string>>(new Set())
  const [unknownProcessed, setUnknownProcessed] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Load initial summary
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchSummary()
        if (!cancelled) {
          setSummary(data)
          if (data.has_rescue_items) {
            setFlowState('setup')
          } else {
            setFlowState('ready_to_apply') // Nothing to review
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Calculate remaining items
  const remainingClusters = scanResult
    ? scanResult.clusters.filter((c) => !processedClusterIds.has(c.cluster_id))
    : []
  const remainingUnknown = scanResult && !unknownProcessed ? scanResult.unknown_count : 0
  const allProcessed = remainingClusters.length === 0 && remainingUnknown === 0

  // Update state when all processed
  useEffect(() => {
    if (scanResult && allProcessed && flowState === 'review') {
      setFlowState('ready_to_apply')
    }
  }, [scanResult, allProcessed, flowState])

  // Handlers
  const handleStartScan = useCallback(async () => {
    try {
      setFlowState('scanning')
      setError(null)
      const result = await runScan()
      setScanResult(result)
      setProcessedClusterIds(new Set())
      setUnknownProcessed(false)

      if (result.clusters.length === 0 && result.unknown_count === 0) {
        setFlowState('ready_to_apply')
      } else {
        setFlowState('review')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setFlowState('setup')
    }
  }, [])

  const handleConfirmCluster = useCallback(
    async (cluster: Cluster) => {
      try {
        setProcessing(true)
        await confirmCluster(
          cluster.cluster_id,
          cluster.photo_ids,
          undefined, // Use default name
          cluster.lat,
          cluster.lng
        )
        setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to confirm')
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  const handleSkipCluster = useCallback(async (cluster: Cluster) => {
    try {
      setProcessing(true)
      await skipPhotos(cluster.photo_ids)
      setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to skip')
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleSkipUnknown = useCallback(async () => {
    if (!scanResult) return
    try {
      setProcessing(true)
      await skipPhotos(scanResult.unknown_photo_ids)
      setUnknownProcessed(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to skip')
    } finally {
      setProcessing(false)
    }
  }, [scanResult])

  const handleApply = useCallback(async () => {
    try {
      setProcessing(true)
      setError(null)
      const result = await applyRescue()
      if (result.success) {
        setFlowState('applied')
      } else {
        setError(`Cannot apply: ${result.remaining_count} items still need review`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Apply failed')
    } finally {
      setProcessing(false)
    }
  }, [])

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <DashboardLayout>
        <main className="mx-auto max-w-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Rescue Mode</h1>
              <p className="mt-0.5 text-sm text-gray-500">Loading…</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Rescue Mode</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Fix photos that need attention. Nothing changes unless you confirm.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* State: SETUP */}
        {flowState === 'setup' && summary && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {summary.unreviewed_count.toLocaleString()} photos need review
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                These photos are not linked to any job yet. We&apos;ll group them by
                location and time to suggest jobs.
              </p>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>• {summary.with_gps_count.toLocaleString()} with GPS (can be clustered)</div>
                <div>• {summary.unknown_location_count.toLocaleString()} without GPS</div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleStartScan}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Start Scan
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              💡 Nothing will be changed unless you review and confirm each suggestion.
            </div>
          </div>
        )}

        {/* State: SETUP (no items) */}
        {flowState === 'setup' && summary && !summary.has_rescue_items && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-lg font-semibold text-gray-900">All good 👍</div>
            <div className="mt-2 text-sm text-gray-500">
              No photos need attention right now.
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => router.push('/jobs')}
              >
                Go to Jobs
              </button>
              <button
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                onClick={() => router.push('/camera')}
              >
                Go to Camera
              </button>
            </div>
          </div>
        )}

        {/* State: SCANNING */}
        {flowState === 'scanning' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
            <div className="mt-4 text-lg font-semibold text-gray-900">
              Scanning photos...
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Grouping by location and time
            </p>
          </div>
        )}

        {/* State: REVIEW */}
        {flowState === 'review' && scanResult && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-600">
                Scanned {scanResult.total_photos_scanned.toLocaleString()} photos
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {remainingClusters.length} clusters + {remainingUnknown} unknown remaining
              </div>
            </div>

            {/* Clusters */}
            {remainingClusters.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Suggested Jobs ({remainingClusters.length})
                </h3>
                {remainingClusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.cluster_id}
                    cluster={cluster}
                    onConfirm={() => handleConfirmCluster(cluster)}
                    onSkip={() => handleSkipCluster(cluster)}
                    isProcessing={processing}
                  />
                ))}
              </div>
            )}

            {/* Unknown photos */}
            {remainingUnknown > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Unknown location
                    </div>
                    <div className="text-sm text-gray-600">
                      {remainingUnknown} photos without GPS
                    </div>
                  </div>
                  <button
                    onClick={handleSkipUnknown}
                    disabled={processing}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Skip all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State: READY_TO_APPLY */}
        {flowState === 'ready_to_apply' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-lg font-semibold text-green-600">
                ✓ Ready to apply
              </div>
              <p className="mt-2 text-sm text-gray-600">
                All items have been reviewed. Click Apply to finalize.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleApply}
                  disabled={processing}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {processing ? 'Applying...' : 'Apply & Exit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: APPLIED */}
        {flowState === 'applied' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-lg font-semibold text-gray-900">
              Rescue completed ✓
            </div>
            <div className="mt-2 text-sm text-gray-500">You&apos;re all set.</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => router.push('/jobs')}
              >
                Go to Jobs
              </button>
              <button
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                onClick={() => router.push('/camera')}
              >
                Go to Camera
              </button>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}

export default function RescueModePage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <main className="mx-auto max-w-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Rescue Mode
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">Loading…</p>
              </div>
            </div>
          </main>
        </DashboardLayout>
      }
    >
      <RescueModeContent />
    </Suspense>
  )
}
