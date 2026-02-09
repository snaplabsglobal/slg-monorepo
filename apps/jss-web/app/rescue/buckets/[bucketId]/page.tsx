'use client'

/**
 * Page 4: Job Detail Preview
 * Route: /rescue/buckets/[bucketId]
 *
 * Upgraded to show real thumbnails with batch loading:
 * - Real thumbnails (not gray placeholders)
 * - Load more button (60 photos per batch)
 * - Exact count (no ≈ symbol)
 * - Skeleton loading states
 */

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'

type PhotoThumb = {
  id: string
  thumbnail_url: string | null
  file_url: string
  taken_at: string
}

async function fetchPhotoThumbs(photoIds: string[]) {
  const res = await fetch('/api/rescue/buckets/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_ids: photoIds }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ items: PhotoThumb[] }>
}

export default function BucketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bucketId = params.bucketId as string

  const buckets = useRescueStore((s) => s.buckets)
  const groupNames = useRescueStore((s) => s.groupNames)
  const setGroupName = useRescueStore((s) => s.setGroupName)
  const setGroupNamingState = useRescueStore((s) => s.setGroupNamingState)

  const bucket = buckets.find((b) => b.bucketId === bucketId)

  const displayName = useMemo(() => {
    if (!bucket) return ''
    return (
      groupNames[bucketId] ||
      bucket.suggestedLabel ||
      `Job ${bucketId.slice(-4)}`
    )
  }, [bucket, groupNames, bucketId])

  // Pagination: slice IDs → fetch thumbnails
  const BATCH = 60
  const allIds = bucket?.photoIds ?? []
  const total = allIds.length

  const [loadedCount, setLoadedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PhotoThumb[]>([])
  const [err, setErr] = useState<string | null>(null)

  // Reset when bucket changes
  useEffect(() => {
    setLoadedCount(0)
    setItems([])
    setErr(null)
  }, [bucketId])

  const hasMore = loadedCount < total

  const loadMore = useCallback(async () => {
    if (!bucket || loading) return
    if (loadedCount >= total) return

    try {
      setLoading(true)
      setErr(null)

      const nextIds = allIds.slice(loadedCount, loadedCount + BATCH)
      const r = await fetchPhotoThumbs(nextIds)

      // Merge and dedupe
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id))
        const merged = [...prev]
        for (const it of r.items) {
          if (!seen.has(it.id)) merged.push(it)
        }
        return merged
      })

      setLoadedCount((c) => c + nextIds.length)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load photos'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }, [bucket, loading, loadedCount, total, allIds])

  // Initial load
  useEffect(() => {
    if (!bucket) return
    if (total === 0) return

    // Auto-load first batch
    if (loadedCount === 0 && items.length === 0 && !loading) {
      loadMore()
    }
  }, [bucket, total, loadedCount, items.length, loading, loadMore])

  // Format date range
  const formatDateRange = () => {
    if (!bucket) return ''
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{displayName}</h1>
        <div className="mt-1 text-sm text-gray-500">
          {total.toLocaleString()} photos
          <span className="mx-2">·</span>
          Loaded {items.length.toLocaleString()}
          {formatDateRange() && (
            <>
              <span className="mx-2">·</span>
              {formatDateRange()}
            </>
          )}
        </div>
        {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
      </div>

      {/* Photo grid - Real thumbnails */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {items.map((p) => {
          const src = p.thumbnail_url ?? p.file_url
          return (
            <div
              key={p.id}
              className="aspect-square overflow-hidden rounded-lg bg-gray-100"
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )
        })}

        {/* Skeletons while loading */}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`sk_${i}`}
              className="aspect-square animate-pulse rounded-lg bg-gray-200"
            />
          ))}
      </div>

      {/* Load More */}
      <div>
        {hasMore ? (
          <button
            className="w-full rounded-xl border px-6 py-4 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : items.length > 0 ? (
          <div className="text-center text-xs text-gray-500">No more photos</div>
        ) : null}
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
