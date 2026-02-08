'use client'

/**
 * Page 2: Scan
 * Route: /rescue/scan
 *
 * Scan photos and show statistics
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore, MockPresets } from '@/lib/rescue'

export default function ScanPage() {
  const router = useRouter()
  const {
    isScanning,
    scanProgress,
    setIsScanning,
    setScanProgress,
    addPhotos,
    setBuckets,
    setUnlocatedPhotoIds,
    setNoisePhotoIds,
    goToStep,
  } = useRescueStore()

  const [scanComplete, setScanComplete] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  // Simulate scanning with mock data
  const startScan = useCallback(async () => {
    setIsScanning(true)
    setScanComplete(false)

    // Use medium preset for demo (can change to small/large5k/huge20k)
    const { photos, buckets } = MockPresets.medium1k()

    // Simulate progressive scanning
    const total = photos.length
    let processed = 0
    let withGps = 0
    let withoutGps = 0

    // Find date range
    const timestamps = photos
      .filter((p) => p.takenAtUtc)
      .map((p) => new Date(p.takenAtUtc).getTime())
      .sort((a, b) => a - b)

    if (timestamps.length > 0) {
      const startDate = new Date(timestamps[0])
      const endDate = new Date(timestamps[timestamps.length - 1])
      setDateRange({
        start: startDate.getFullYear().toString(),
        end: endDate.getFullYear().toString(),
      })
    }

    // Simulate progressive scan
    for (let i = 0; i < total; i += 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))

      const batch = photos.slice(i, Math.min(i + 50, total))
      processed += batch.length

      for (const p of batch) {
        if (p.lat !== undefined && p.lng !== undefined) {
          withGps++
        } else {
          withoutGps++
        }
      }

      setScanProgress({
        total,
        processed,
        withGps,
        withoutGps,
      })
    }

    // Store the results
    addPhotos(photos)
    setBuckets(buckets)

    // Find unlocated bucket
    const unlocatedBucket = buckets.find((b) => b.bucketId === 'bucket_unlocated')
    if (unlocatedBucket) {
      setUnlocatedPhotoIds(unlocatedBucket.photoIds)
    }

    // Find noise bucket
    const noiseBucket = buckets.find((b) => b.bucketId === 'bucket_noise')
    if (noiseBucket) {
      setNoisePhotoIds(noiseBucket.photoIds)
    }

    setIsScanning(false)
    setScanComplete(true)
    goToStep('groups')
  }, [
    setIsScanning,
    setScanProgress,
    addPhotos,
    setBuckets,
    setUnlocatedPhotoIds,
    setNoisePhotoIds,
    goToStep,
  ])

  // Start scan on mount
  useEffect(() => {
    startScan()
  }, [startScan])

  const stopScan = () => {
    setIsScanning(false)
    router.push('/rescue/new')
  }

  const progress =
    scanProgress.total > 0
      ? Math.round((scanProgress.processed / scanProgress.total) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {scanComplete ? 'Scan complete' : 'Scanning your photos...'}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-gray-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-sm text-gray-500">{progress}% complete</div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="text-2xl font-semibold">
            {scanProgress.processed.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Photos found</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-2xl font-semibold">
            {scanProgress.withGps.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">With GPS</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-2xl font-semibold">
            {scanProgress.withoutGps.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">No location</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-2xl font-semibold">
            {dateRange ? `${dateRange.start} – ${dateRange.end}` : '—'}
          </div>
          <div className="text-sm text-gray-500">Date range</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {isScanning ? (
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={stopScan}
          >
            Stop scanning
          </button>
        ) : scanComplete ? (
          <button
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
            onClick={() => router.push('/rescue/buckets')}
          >
            Review groups
          </button>
        ) : null}
      </div>
    </div>
  )
}
