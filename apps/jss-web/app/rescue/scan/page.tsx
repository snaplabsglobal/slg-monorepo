'use client'

/**
 * Page 2: Scan & Clean
 * Route: /rescue/scan
 *
 * Scan photos and show statistics with filtering.
 * Design principle: Build trust by showing we're reducing noise, not making decisions.
 *
 * From product spec:
 * - Show real, complete date range (Jul 2021 – Aug 2026 format)
 * - Show filtered vs jobsite photo counts
 * - "Suggestions only. Nothing has been applied."
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
  const [filteredStats, setFilteredStats] = useState<{
    jobsitePhotos: number
    filteredOut: number
  } | null>(null)

  // Format date as "Jul 2021" or "Aug 2026"
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

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

    // Find date range - use real month/year format
    const timestamps = photos
      .filter((p) => p.takenAtUtc)
      .map((p) => new Date(p.takenAtUtc).getTime())
      .sort((a, b) => a - b)

    if (timestamps.length > 0) {
      const startDate = new Date(timestamps[0])
      const endDate = new Date(timestamps[timestamps.length - 1])
      setDateRange({
        start: formatMonthYear(startDate),
        end: formatMonthYear(endDate),
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

    // Find noise bucket (personal/travel photos)
    const noiseBucket = buckets.find((b) => b.bucketId === 'bucket_noise')
    if (noiseBucket) {
      setNoisePhotoIds(noiseBucket.photoIds)
    }

    // Calculate filtered stats
    // Jobsite = building buckets, Filtered = noise + some unlocated
    const buildingBuckets = buckets.filter(
      (b) => b.bucketId !== 'bucket_unlocated' && b.bucketId !== 'bucket_noise'
    )
    const jobsitePhotos = buildingBuckets.reduce((sum, b) => sum + b.photoIds.length, 0)
    const filteredOut = (noiseBucket?.photoIds.length || 0)

    setFilteredStats({
      jobsitePhotos,
      filteredOut,
    })

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
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          {scanComplete ? 'Rescue your photo library' : 'Scanning your photos...'}
        </h1>
        {!scanComplete && (
          <p className="mt-1 text-sm text-gray-600">
            Looking for jobsite photos...
          </p>
        )}
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

      {/* Results card - show after scan complete */}
      {scanComplete && filteredStats && (
        <div className="rounded-xl border bg-gray-50 p-6">
          <div className="text-lg font-medium text-gray-900">We found:</div>
          <ul className="mt-3 space-y-2 text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-gray-400">•</span>
              <span className="font-medium">{scanProgress.processed.toLocaleString()}</span> photos total
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">•</span>
              <span className="font-medium text-green-700">{filteredStats.jobsitePhotos.toLocaleString()}</span> likely jobsite photos
            </li>
            {filteredStats.filteredOut > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{filteredStats.filteredOut.toLocaleString()}</span>
                <span className="text-gray-500">personal or travel photos (excluded)</span>
              </li>
            )}
          </ul>

          {/* Date range */}
          {dateRange && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">Date range:</div>
              <div className="font-medium text-gray-900">
                {dateRange.start} – {dateRange.end}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trust message - critical for user confidence */}
      {scanComplete && (
        <div className="text-center text-sm text-gray-500">
          Suggestions only. Nothing has been applied.
        </div>
      )}

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
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
            onClick={() => router.push('/rescue/buckets')}
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  )
}
