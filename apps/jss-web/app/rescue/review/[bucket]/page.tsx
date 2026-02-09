'use client'

/**
 * Review Bucket Page
 * Route: /rescue/review/[bucket]
 *
 * Shows photos in a specific review bucket (unknownLocation, likelyPersonal, etc.)
 * Users can:
 * - View reason tags explaining classification
 * - Multi-select photos
 * - Bulk mark as jobsite/personal
 * - Assign to suggested job or create new job
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

import { ReviewHeader } from '@/rescue/_components/ReviewHeader'
import { PhotoGrid } from '@/rescue/_components/PhotoGrid'
import { PhotoTile } from '@/rescue/_components/PhotoTile'
import { BulkActionsBar } from '@/rescue/_components/BulkActionsBar'

import {
  type ReviewBucket,
  bucketTitle,
  bucketSubtitle,
} from '@/rescue/review/_mock/reviewMock'

type ApiItem = {
  id: string
  thumbnail_url: string | null
  file_url: string
  taken_at: string
  created_at: string
  has_gps: boolean
  accuracy_m: number | null
  score: number | null
  reason_tags: string[]
}

function toBucket(raw: string | string[] | undefined): ReviewBucket | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v) return null
  const allowed: ReviewBucket[] = [
    'unknownLocation',
    'geocodeFailed',
    'lowAccuracy',
    'likelyPersonal',
    'unsure',
  ]
  return allowed.includes(v as ReviewBucket) ? (v as ReviewBucket) : null
}

function fmtTakenAt(iso?: string): string {
  if (!iso) return 'No photo time'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function fetchBucketPhotos(bucket: string, cursor?: string | null) {
  const qs = new URLSearchParams()
  qs.set('bucket', bucket)
  qs.set('limit', '60')
  if (cursor) qs.set('cursor', cursor)

  const res = await fetch(`/api/rescue/review/list?${qs.toString()}`, {
    method: 'GET',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    items: ApiItem[]
    next_cursor: string | null
  }>
}

async function markPhotos(
  photoIds: string[],
  user_classification: 'jobsite' | 'personal' | null
) {
  const res = await fetch('/api/rescue/review/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photo_ids: photoIds,
      user_classification,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    updated: number
    ids: string[]
  }>
}

export default function ReviewBucketPage() {
  const router = useRouter()
  const params = useParams()
  const bucket = toBucket(params?.bucket)

  const [photos, setPhotos] = useState<ApiItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Initial load
  useEffect(() => {
    if (!bucket) return

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setHasMore(true)
        setPhotos([])
        setNextCursor(null)

        const r = await fetchBucketPhotos(bucket, null)
        if (cancelled) return

        setPhotos(r.items)
        setNextCursor(r.next_cursor)
        setHasMore(!!r.next_cursor && r.items.length > 0)
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load'
          alert(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bucket])

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !bucket) return

    try {
      setLoadingMore(true)
      const r = await fetchBucketPhotos(bucket, nextCursor)

      // Dedupe
      setPhotos((prev) => {
        const seen = new Set(prev.map((x) => x.id))
        const merged = [...prev]
        for (const it of r.items) {
          if (!seen.has(it.id)) merged.push(it)
        }
        return merged
      })

      setNextCursor(r.next_cursor)
      setHasMore(!!r.next_cursor && r.items.length > 0)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load more'
      alert(msg)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, bucket, nextCursor])

  // Remove photos after marking
  const removeByIds = useCallback((ids: string[]) => {
    if (!ids.length) return
    const set = new Set(ids)
    setPhotos((prev) => prev.filter((p) => !set.has(p.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleMarkJobsite = useCallback(async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    try {
      const r = await markPhotos(ids, 'jobsite')
      removeByIds(r.ids)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      alert(msg)
    }
  }, [selected, removeByIds])

  const handleMarkPersonal = useCallback(async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    try {
      const r = await markPhotos(ids, 'personal')
      removeByIds(r.ids)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      alert(msg)
    }
  }, [selected, removeByIds])

  if (!bucket) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <h1 className="text-xl font-black">Invalid bucket</h1>
        <button
          type="button"
          onClick={() => router.push('/rescue/buckets')}
          className="mt-3 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold hover:bg-gray-50"
        >
          Back to Rescue
        </button>
      </main>
    )
  }

  const title = bucketTitle[bucket]
  const subtitle = bucketSubtitle[bucket]

  return (
    <main className="mx-auto max-w-lg p-4">
      <ReviewHeader
        title={title}
        subtitle={subtitle}
        count={photos.length}
        selectedCount={selected.size}
        onBack={() => router.push('/rescue/buckets')}
      />

      {loading ? (
        <div className="mt-4 text-gray-500">Loading…</div>
      ) : (
        <>
          <PhotoGrid>
            {photos.map((p) => (
              <PhotoTile
                key={p.id}
                id={p.id}
                thumbUrl={p.thumbnail_url ?? p.file_url}
                selected={selected.has(p.id)}
                takenAtLabel={fmtTakenAt(p.taken_at)}
                reasonTags={p.reason_tags}
                scoreLabel={
                  typeof p.score === 'number' ? `score ${p.score}` : undefined
                }
                onToggle={() => toggle(p.id)}
              />
            ))}
          </PhotoGrid>

          {/* Load More */}
          <div className="mt-4">
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={`w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold ${
                  loadingMore
                    ? 'cursor-not-allowed text-gray-400'
                    : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : photos.length > 0 ? (
              <div className="text-center text-xs text-gray-500">
                No more photos
              </div>
            ) : null}
          </div>
        </>
      )}

      <BulkActionsBar
        selectedCount={selected.size}
        onAssignToSuggestedJob={() => {
          alert('Assign to suggested job (TODO UI)')
        }}
        onCreateNewJob={() => {
          alert('Create new job (TODO UI)')
        }}
        onMarkJobsite={handleMarkJobsite}
        onMarkPersonal={handleMarkPersonal}
      />
    </main>
  )
}
