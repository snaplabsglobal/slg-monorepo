'use client'

/**
 * Rescue Mode Page
 * Route: /organizer
 *
 * Three-state logic:
 * - Inactive: "All good" - no photos need attention
 * - Active: Shows bucket list with counts
 * - Resolved: Brief flash after "Apply & Exit"
 *
 * Product philosophy:
 * - Not a feature page, but a "system safety valve"
 * - 90% of the time should show "All good"
 * - Only appears when system needs help
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../components/layout'
import { Shield } from 'lucide-react'

type RescueSummaryResponse = {
  sampled: boolean
  sample_limit: number
  summary: {
    total_photos_scanned: number
    likely_jobsite_count: number
    likely_personal_count: number
    unsure_count: number
    unknown_location_count: number
    low_accuracy_count: number
    geocode_failed_count: number
  }
  buckets: {
    unknownLocation: { count: number }
    geocodeFailed: { count: number }
    lowAccuracy: { count: number }
    likelyPersonal: { count: number }
    unsure: { count: number }
  }
  capabilities: {
    geocode_is_proxy: boolean
    suggestions_based_on_job_id: boolean
  }
}

type PageState = 'inactive' | 'active' | 'resolved'

async function fetchRescueSummary(): Promise<RescueSummaryResponse> {
  const res = await fetch('/api/rescue/summary', { method: 'GET' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function BucketRow({
  label,
  count,
  onClick,
}: {
  label: string
  count: number
  onClick: () => void
}) {
  if (count === 0) return null

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="text-sm text-gray-500">{count.toLocaleString()}</div>
    </button>
  )
}

export default function RescueModePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<RescueSummaryResponse | null>(null)

  // Brief "just completed" state
  const [resolvedFlash, setResolvedFlash] = useState(false)

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const r = await fetchRescueSummary()
        if (!cancelled) setData(r)
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load'
          setErr(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Calculate: any items needing attention?
  const hasRescueItems = useMemo(() => {
    if (!data) return false
    const b = data.buckets
    return (
      (b.unknownLocation?.count ?? 0) > 0 ||
      (b.geocodeFailed?.count ?? 0) > 0 ||
      (b.lowAccuracy?.count ?? 0) > 0 ||
      (b.likelyPersonal?.count ?? 0) > 0 ||
      (b.unsure?.count ?? 0) > 0
    )
  }, [data])

  // Total items needing review
  const totalNeedsReview = useMemo(() => {
    if (!data) return 0
    const b = data.buckets
    return (
      (b.unknownLocation?.count ?? 0) +
      (b.geocodeFailed?.count ?? 0) +
      (b.lowAccuracy?.count ?? 0) +
      (b.likelyPersonal?.count ?? 0) +
      (b.unsure?.count ?? 0)
    )
  }, [data])

  // Page state
  const pageState: PageState = useMemo(() => {
    if (resolvedFlash) return 'resolved'
    return hasRescueItems ? 'active' : 'inactive'
  }, [resolvedFlash, hasRescueItems])

  // Apply & Exit behavior
  async function onApplyAndExit() {
    setResolvedFlash(true)

    // Optional: call /api/rescue/resolve to record last_resolved_at

    setTimeout(async () => {
      setResolvedFlash(false)
      try {
        setLoading(true)
        const r = await fetchRescueSummary()
        setData(r)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 900)
  }

  // Loading state
  if (loading) {
    return (
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
    )
  }

  // Error state
  if (err || !data) {
    return (
      <DashboardLayout>
        <main className="mx-auto max-w-2xl space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Rescue Mode
              </h1>
            </div>
          </div>
          <div className="text-sm text-red-600">{err ?? 'Failed'}</div>
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => location.reload()}
          >
            Retry
          </button>
        </main>
      </DashboardLayout>
    )
  }

  const sampledNote = data.sampled
    ? `Computed from latest ${data.sample_limit} photos`
    : null

  const geocodeNote = data.capabilities.geocode_is_proxy
    ? 'Address status is estimated from available metadata.'
    : null

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Rescue Mode
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Fix photos that need attention. Nothing changes unless you
                confirm.
              </p>
            </div>
          </div>

          {sampledNote && (
            <div className="text-xs text-gray-400">{sampledNote}</div>
          )}
          {geocodeNote && (
            <div className="text-xs text-gray-400">{geocodeNote}</div>
          )}
        </div>

        {/* State: RESOLVED */}
        {pageState === 'resolved' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-lg font-semibold text-gray-900">
              Rescue completed ✓
            </div>
            <div className="mt-2 text-sm text-gray-500">
              You&apos;re all set.
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

        {/* State: INACTIVE */}
        {pageState === 'inactive' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-lg font-semibold text-gray-900">
              All good 👍
            </div>
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

        {/* State: ACTIVE */}
        {pageState === 'active' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-sm text-gray-500">Needs review</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {totalNeedsReview.toLocaleString()} photos
              </div>

              <div className="mt-4 space-y-2">
                <BucketRow
                  label="Unknown location"
                  count={data.buckets.unknownLocation.count}
                  onClick={() =>
                    router.push('/rescue/review/unknownLocation')
                  }
                />
                <BucketRow
                  label="Geocode failed"
                  count={data.buckets.geocodeFailed.count}
                  onClick={() => router.push('/rescue/review/geocodeFailed')}
                />
                <BucketRow
                  label="Low accuracy"
                  count={data.buckets.lowAccuracy.count}
                  onClick={() => router.push('/rescue/review/lowAccuracy')}
                />
                <BucketRow
                  label="Likely personal"
                  count={data.buckets.likelyPersonal.count}
                  onClick={() =>
                    router.push('/rescue/review/likelyPersonal')
                  }
                />
                <BucketRow
                  label="Unsure"
                  count={data.buckets.unsure.count}
                  onClick={() => router.push('/rescue/review/unsure')}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-sm text-gray-500">Finish</div>
              <div className="mt-2 text-sm text-gray-700">
                When you&apos;re done reviewing, you can exit Rescue Mode.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => router.push('/jobs')}
                >
                  Go to Jobs
                </button>
                <button
                  className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                  onClick={onApplyAndExit}
                >
                  Apply & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
