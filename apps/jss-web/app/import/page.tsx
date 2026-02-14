'use client'

/**
 * Import Photos - Main Entry Point
 * Route: /import
 *
 * Scans unassigned photos and groups them by location/time
 * to help users quickly organize photos into jobs.
 *
 * v1 API Contract:
 * - POST /api/import/scan → compute suggestions (stateless)
 * - POST /api/import/confirm → assign photos to job
 * - POST /api/import/skip → mark photos as skipped
 */

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../components/layout'
import { Upload, Loader2, MapPin, Calendar, Check, X, ChevronRight } from 'lucide-react'

// ============================================================
// Types (v1 API Contract)
// ============================================================

type ScanStats = {
  total_candidates: number
  cluster_count: number
  unknown_count: number
  with_taken_at: number
  missing_taken_at: number
  with_gps: number
  missing_gps: number
}

type Cluster = {
  cluster_id: string
  suggested_job: {
    name: string
    address: string | null
    lat: number
    lng: number
  }
  photo_ids: string[]
  photo_count: number
  reasons: string[]
}

type ScanResponse = {
  stateless: true
  scope: { mode: string }
  stats: ScanStats
  date_range: { min: string | null; max: string | null; basis: string }
  clusters: Cluster[]
  unknown: { photo_ids: string[]; photo_count: number; reasons: string[] }
}

// ============================================================
// API Functions (v1)
// ============================================================

async function callScan(): Promise<ScanResponse> {
  const res = await fetch('/api/import/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: { mode: 'unassigned' }, limit: 2000 }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message || data.error || 'Scan failed')
  }
  return res.json()
}

async function callConfirm(
  action: 'create_job_and_assign' | 'assign_to_existing_job',
  photoIds: string[],
  jobName?: string,
  jobId?: string
): Promise<{ ok: boolean; job_id: string; assigned_count: number }> {
  const body =
    action === 'create_job_and_assign'
      ? { action, job: { name: jobName }, photo_ids: photoIds }
      : { action, job_id: jobId, photo_ids: photoIds }

  const res = await fetch('/api/import/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message || data.error || 'Confirm failed')
  }
  return res.json()
}

async function callSkip(
  photoIds: string[],
  reason: 'not_jobsite' | 'missing_info' | 'skip_for_now'
): Promise<{ ok: boolean; skipped_count: number }> {
  const res = await fetch('/api/import/skip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_ids: photoIds, reason }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message || data.error || 'Skip failed')
  }
  return res.json()
}

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {cluster.suggested_job.address ||
                `${cluster.suggested_job.lat.toFixed(4)}, ${cluster.suggested_job.lng.toFixed(4)}`}
            </span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {cluster.photo_count} photos
          </div>
          <div className="text-sm text-gray-500">{cluster.suggested_job.name}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="Skip"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-lg bg-amber-500 p-2.5 text-white hover:bg-amber-600 disabled:opacity-50"
            title="Create Job"
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

type FlowState = 'idle' | 'scanning' | 'results' | 'done'

export default function ImportPhotosPage() {
  const router = useRouter()

  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Track processed items for immediate UI feedback
  const [processedClusterIds, setProcessedClusterIds] = useState<Set<string>>(new Set())
  const [unknownSkipped, setUnknownSkipped] = useState(false)

  // ============================================================
  // Handlers
  // ============================================================

  const handleStartScan = useCallback(async () => {
    try {
      setFlowState('scanning')
      setError(null)
      setProcessedClusterIds(new Set())
      setUnknownSkipped(false)

      const result = await callScan()
      setScanData(result)

      if (result.clusters.length === 0 && result.unknown.photo_count === 0) {
        setFlowState('done')
      } else {
        setFlowState('results')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setFlowState('idle')
    }
  }, [])

  const handleConfirmCluster = useCallback(async (cluster: Cluster) => {
    try {
      setProcessing(true)
      setError(null)
      await callConfirm('create_job_and_assign', cluster.photo_ids, cluster.suggested_job.name)
      setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to confirm')
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleSkipCluster = useCallback(async (cluster: Cluster) => {
    try {
      setProcessing(true)
      setError(null)
      await callSkip(cluster.photo_ids, 'skip_for_now')
      setProcessedClusterIds((prev) => new Set([...prev, cluster.cluster_id]))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to skip')
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleSkipUnknown = useCallback(async () => {
    if (!scanData) return
    try {
      setProcessing(true)
      setError(null)
      await callSkip(scanData.unknown.photo_ids, 'missing_info')
      setUnknownSkipped(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to skip')
    } finally {
      setProcessing(false)
    }
  }, [scanData])

  // ============================================================
  // Derived state
  // ============================================================

  const remainingClusters = scanData
    ? scanData.clusters.filter((c) => !processedClusterIds.has(c.cluster_id))
    : []
  const remainingUnknown = scanData && !unknownSkipped ? scanData.unknown.photo_count : 0

  // Auto-transition to done when all processed
  const allDone =
    scanData &&
    remainingClusters.length === 0 &&
    remainingUnknown === 0 &&
    flowState === 'results'

  // ============================================================
  // Render
  // ============================================================

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Upload className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Import Photos</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Organize unassigned photos into jobs
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* State: IDLE - Show Start Scan */}
        {flowState === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Ready to organize your photos
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ll find photos without a job and group them by location and time
                to help you create jobs quickly.
              </p>

              <div className="mt-6">
                <button
                  onClick={handleStartScan}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Find Unassigned Photos
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Nothing will change unless you confirm each suggestion.
            </div>
          </div>
        )}

        {/* State: SCANNING */}
        {flowState === 'scanning' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
            <div className="mt-4 text-lg font-semibold text-gray-900">
              Finding photos...
            </div>
            <p className="mt-2 text-sm text-gray-500">Grouping by location and time</p>
          </div>
        )}

        {/* State: RESULTS */}
        {flowState === 'results' && scanData && !allDone && (
          <div className="space-y-4">
            {/* Stats summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">
                Found {scanData.stats.total_candidates} unassigned photos
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm">
                <span className="font-semibold text-gray-900">
                  {remainingClusters.length} group{remainingClusters.length !== 1 ? 's' : ''} to review
                </span>
                {remainingUnknown > 0 && (
                  <span className="text-gray-500">
                    + {remainingUnknown} without location
                  </span>
                )}
              </div>
              {scanData.date_range.min && scanData.date_range.max && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(scanData.date_range.min)} – {formatDate(scanData.date_range.max)}
                </div>
              )}
            </div>

            {/* Clusters */}
            {remainingClusters.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Suggested Jobs
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
                    <div className="font-semibold text-gray-900">No location data</div>
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

        {/* State: DONE (or all processed) */}
        {(flowState === 'done' || allDone) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-lg font-semibold text-green-600">
              {scanData?.stats.total_candidates === 0
                ? 'No photos to import'
                : 'All done!'}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {scanData?.stats.total_candidates === 0
                ? 'All your photos are already assigned to jobs.'
                : 'All photos have been organized.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/jobs')}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Go to Jobs
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
