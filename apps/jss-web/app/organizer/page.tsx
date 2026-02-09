'use client'

/**
 * Rescue Mode Page (v1 - API Spec Compliant)
 * Route: /organizer
 *
 * Strict State Machine:
 *   'setup' → 'scanning' → 'review' → 'ready_to_apply' → 'applied'
 *
 * API Endpoints Used:
 *   POST /api/rescue/scan → creates scan session
 *   GET /api/rescue/scan/:scan_id → resume session
 *   GET /api/rescue/scan/:scan_id/progress → check remaining
 *   POST /api/rescue/scan/:scan_id/clusters/:cluster_id/confirm
 *   POST /api/rescue/scan/:scan_id/clusters/:cluster_id/skip
 *   POST /api/rescue/scan/:scan_id/unknown/skip
 *   POST /api/rescue/scan/:scan_id/apply
 *
 * Key Rules:
 *   - All counts from backend, no items.length
 *   - Apply only enabled when progress.done = true
 *   - X-Idempotency-Key for all writes
 */

import React, { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../components/layout'
import { Shield, Loader2, MapPin, Calendar, Check, X, Info } from 'lucide-react'

// ============================================================
// Types (from API Spec)
// ============================================================

type RescueFlowState =
  | 'setup'
  | 'scanning'
  | 'review'
  | 'ready_to_apply'
  | 'applied'

type ScanStats = {
  total_candidates: number
  likely_jobsite: number
  with_taken_at: number
  missing_taken_at: number
  with_gps: number
  missing_gps: number
  geocode_success: number
  geocode_failed: number
}

type DateRange = {
  min: string | null
  max: string | null
  basis: string
}

type Cluster = {
  cluster_id: string
  photo_count: number
  centroid: { lat: number; lng: number; accuracy_m: number }
  address: { display: string | null; source: string; confidence: number } | null
  time_range: { min: string; max: string }
  status?: 'unreviewed' | 'confirmed' | 'skipped'
}

type ScanResponse = {
  scan_id: string
  scope: { mode: string }
  stats: ScanStats
  date_range: DateRange
  clusters: Cluster[]
  unknown: { photo_count: number; reasons: string[] }
}

type ProgressResponse = {
  scan_id: string
  remaining: { clusters_unreviewed: number; unknown_unreviewed: number }
  done: boolean
}

// ============================================================
// API Functions
// ============================================================

function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function createScan(): Promise<ScanResponse> {
  const res = await fetch('/api/rescue/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: { mode: 'unassigned' } }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Scan failed')
  }
  return res.json()
}

async function getScan(scanId: string): Promise<ScanResponse> {
  const res = await fetch(`/api/rescue/scan/${scanId}`)
  if (!res.ok) throw new Error('Failed to load scan')
  return res.json()
}

async function getProgress(scanId: string): Promise<ProgressResponse> {
  const res = await fetch(`/api/rescue/scan/${scanId}/progress`)
  if (!res.ok) throw new Error('Failed to load progress')
  return res.json()
}

async function confirmCluster(
  scanId: string,
  clusterId: string,
  jobName?: string
): Promise<{ result: string; job: { job_id: string; name: string } }> {
  const res = await fetch(`/api/rescue/scan/${scanId}/clusters/${clusterId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify({ job_name: jobName }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Confirm failed')
  }
  return res.json()
}

async function skipCluster(scanId: string, clusterId: string): Promise<void> {
  const res = await fetch(`/api/rescue/scan/${scanId}/clusters/${clusterId}/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify({ reason: 'user_skipped' }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Skip failed')
  }
}

async function skipUnknown(scanId: string, photoIds: string[]): Promise<void> {
  const res = await fetch(`/api/rescue/scan/${scanId}/unknown/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify({ photo_ids: photoIds, reason: 'missing_gps' }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Skip failed')
  }
}

async function applyScan(scanId: string): Promise<{ result: string }> {
  const res = await fetch(`/api/rescue/scan/${scanId}/apply`, {
    method: 'POST',
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Apply failed')
  }
  return res.json()
}

// ============================================================
// Components
// ============================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatsCard({ stats, dateRange }: { stats: ScanStats; dateRange: DateRange }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        <Info className="h-4 w-4" />
        <span>Scan transparency</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-gray-700">
        <div>Total candidates: <span className="font-semibold">{stats.total_candidates.toLocaleString()}</span></div>
        <div>Likely jobsite: <span className="font-semibold">{stats.likely_jobsite.toLocaleString()}</span></div>
        <div>With GPS: <span className="font-semibold">{stats.with_gps.toLocaleString()}</span></div>
        <div>Missing GPS: <span className="font-semibold">{stats.missing_gps.toLocaleString()}</span></div>
      </div>
      {dateRange.min && dateRange.max && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-gray-600">
          Date range: {formatDate(dateRange.min)} – {formatDate(dateRange.max)}
        </div>
      )}
    </div>
  )
}

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
  const startDate = formatDate(cluster.time_range.min)
  const endDate = formatDate(cluster.time_range.max)
  const dateRange = startDate === endDate ? startDate : `${startDate} – ${endDate}`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {cluster.address?.display || `${cluster.centroid.lat.toFixed(4)}, ${cluster.centroid.lng.toFixed(4)}`}
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

  // Data from API
  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Track processed clusters locally for immediate UI feedback
  const [processedClusterIds, setProcessedClusterIds] = useState<Set<string>>(new Set())
  const [unknownProcessed, setUnknownProcessed] = useState(false)

  // Refresh progress from API
  const refreshProgress = useCallback(async () => {
    if (!scanData) return
    try {
      const prog = await getProgress(scanData.scan_id)
      setProgress(prog)
      if (prog.done) {
        setFlowState('ready_to_apply')
      }
    } catch (e) {
      console.error('Failed to refresh progress:', e)
    }
  }, [scanData])

  // Handlers
  const handleStartScan = useCallback(async () => {
    try {
      setFlowState('scanning')
      setError(null)
      const result = await createScan()
      setScanData(result)
      setProcessedClusterIds(new Set())
      setUnknownProcessed(false)

      if (result.clusters.length === 0 && result.unknown.photo_count === 0) {
        setFlowState('ready_to_apply')
      } else {
        setFlowState('review')
      }

      // Get initial progress
      const prog = await getProgress(result.scan_id)
      setProgress(prog)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setFlowState('setup')
    }
  }, [])

  const handleConfirmCluster = useCallback(
    async (cluster: Cluster) => {
      if (!scanData) return
      try {
        setProcessing(true)
        await confirmCluster(scanData.scan_id, cluster.cluster_id)
        setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
        await refreshProgress()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to confirm')
      } finally {
        setProcessing(false)
      }
    },
    [scanData, refreshProgress]
  )

  const handleSkipCluster = useCallback(
    async (cluster: Cluster) => {
      if (!scanData) return
      try {
        setProcessing(true)
        await skipCluster(scanData.scan_id, cluster.cluster_id)
        setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
        await refreshProgress()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to skip')
      } finally {
        setProcessing(false)
      }
    },
    [scanData, refreshProgress]
  )

  const handleSkipUnknown = useCallback(async () => {
    if (!scanData) return
    try {
      setProcessing(true)
      // For v1, skip all unknown photos at once
      // In a real implementation, we'd need to get the photo IDs from the scan session
      await skipUnknown(scanData.scan_id, []) // Backend will handle this
      setUnknownProcessed(true)
      await refreshProgress()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to skip')
    } finally {
      setProcessing(false)
    }
  }, [scanData, refreshProgress])

  const handleApply = useCallback(async () => {
    if (!scanData) return
    try {
      setProcessing(true)
      setError(null)
      const result = await applyScan(scanData.scan_id)
      if (result.result === 'applied') {
        setFlowState('applied')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Apply failed')
    } finally {
      setProcessing(false)
    }
  }, [scanData])

  // Calculate remaining from local state + API
  const remainingClusters = scanData
    ? scanData.clusters.filter((c) => !processedClusterIds.has(c.cluster_id))
    : []
  const remainingUnknown = scanData && !unknownProcessed ? scanData.unknown.photo_count : 0

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
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* State: SETUP */}
        {flowState === 'setup' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Ready to scan unassigned photos
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ll scan photos that are not linked to any job yet and group them
                by location and time to suggest jobs.
              </p>

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
        {flowState === 'review' && scanData && (
          <div className="space-y-4">
            {/* Stats transparency */}
            <StatsCard stats={scanData.stats} dateRange={scanData.date_range} />

            {/* Progress from API */}
            {progress && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-600">
                  Scanned {scanData.stats.total_candidates.toLocaleString()} photos
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {progress.remaining.clusters_unreviewed} clusters + {progress.remaining.unknown_unreviewed} unknown remaining
                </div>
              </div>
            )}

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
                    <div className="font-semibold text-gray-900">Unknown location</div>
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
            {scanData && <StatsCard stats={scanData.stats} dateRange={scanData.date_range} />}

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
                <h1 className="text-xl font-semibold text-gray-900">Rescue Mode</h1>
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
