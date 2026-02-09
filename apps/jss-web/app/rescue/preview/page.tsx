'use client'

/**
 * Rescue Preview Page
 * Route: /rescue/preview
 *
 * Step 2: Shows preview of what will be scanned
 * - Photo count
 * - Date range
 * - Selected scope confirmation
 */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Lightbulb } from 'lucide-react'

type PreviewData = {
  photo_count: number
  date_range: { min: string | null; max: string | null }
  scope_label: string
  scope: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function PreviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scope = searchParams.get('scope') || 'unassigned'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PreviewData | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/rescue/preview?scope=${scope}`)
        if (!res.ok) {
          throw new Error(await res.text())
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load preview')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [scope])

  function handleStartScan() {
    // Navigate to organizer with scope parameter
    router.push(`/rescue/organizer?scope=${scope}`)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Preparing scan...
            </h1>
          </div>
        </div>
        <div className="animate-pulse rounded-xl border bg-white p-5">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Ready to scan
            </h1>
          </div>
        </div>
        <div className="text-sm text-red-600">{error ?? 'Failed to load'}</div>
        <button
          type="button"
          onClick={() => router.push('/rescue/setup')}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Go back
        </button>
      </main>
    )
  }

  const dateRangeText =
    data.date_range.min && data.date_range.max
      ? `${formatDate(data.date_range.min)} – ${formatDate(data.date_range.max)}`
      : 'No dates available'

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-2">
          <Shield className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ready to scan</h1>
        </div>
      </div>

      {/* Preview Info */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-lg text-gray-900">
          You&apos;re about to scan{' '}
          <span className="font-bold">
            {data.photo_count.toLocaleString()}
          </span>{' '}
          photos
        </div>

        <div className="text-sm text-gray-600">
          Date range: {dateRangeText}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-sm text-gray-600">
            This is based on your selected scope:
          </div>
          <div className="mt-1 font-semibold text-gray-900">
            ✓ {data.scope_label}
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex gap-3 rounded-xl bg-amber-50 p-4">
        <Lightbulb className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          Nothing will be changed unless you review and apply suggestions
          later.
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleStartScan}
          className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
        >
          Start scan
        </button>
        <button
          type="button"
          onClick={() => router.push('/rescue/setup')}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Change scope
        </button>
      </div>
    </main>
  )
}

export default function RescuePreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md space-y-6 p-6">
          <div className="text-gray-600">Loading...</div>
        </main>
      }
    >
      <PreviewContent />
    </Suspense>
  )
}
