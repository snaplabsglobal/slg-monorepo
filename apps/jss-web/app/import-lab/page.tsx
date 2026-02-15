'use client'

/**
 * Import Mode - Phase C Technical Validation Lab
 * Route: /import-lab
 *
 * Purpose: Validate 4 technical requirements before building full Import Mode
 *
 * Validation Items:
 * 1. Can read EXIF (time + GPS) from iPhone photos
 * 2. Can batch parse 300+ photos without crashing
 * 3. Can filter by 30 days + 100m distance
 * 4. Can reverse geocode to get address
 *
 * NO UI polish. Plain diagnostic output.
 */

import React, { useState, useCallback, useRef } from 'react'
import { parseExif, parseExifBatch, getExifStats, PhotoExifData, ParseProgress } from '../lib/import/exif-parser'
import { filterPhotos, reverseGeocode, formatTimestamp, haversineDistance } from '../lib/import/geo-utils'

// Constants from spec
const MAX_FILES = 800
const DISTANCE_THRESHOLD_M = 100
const TIME_WINDOW_DAYS = 30
const BATCH_SIZE = 50

type LabState = 'idle' | 'seed-selected' | 'parsing' | 'filtering' | 'done'

interface SeedPhoto {
  file: File
  exif: PhotoExifData
  address: string | null
  addressLoading: boolean
}

interface Results {
  totalSelected: number
  parsed: number
  withGps: number
  withTimestamp: number
  matched: number
  elapsedMs: number
  stats: ReturnType<typeof getExifStats>
}

export default function ImportLabPage() {
  const [state, setState] = useState<LabState>('idle')
  const [seed, setSeed] = useState<SeedPhoto | null>(null)
  const [progress, setProgress] = useState<ParseProgress | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsedPhotos, setParsedPhotos] = useState<PhotoExifData[]>([])
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoExifData[]>([])

  const seedInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ============================================================
  // Step 1: Select Seed Photo
  // ============================================================

  const handleSeedSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setState('seed-selected')

    try {
      // Parse EXIF
      const exif = await parseExif(file, 0)

      const seedData: SeedPhoto = {
        file,
        exif,
        address: null,
        addressLoading: true,
      }
      setSeed(seedData)

      // Start reverse geocode (async, non-blocking)
      if (exif.lat !== null && exif.lng !== null) {
        // Use env variable or skip if not available
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        reverseGeocode(exif.lat, exif.lng, apiKey)
          .then(result => {
            setSeed(prev => prev ? { ...prev, address: result.formatted, addressLoading: false } : null)
          })
          .catch(() => {
            setSeed(prev => prev ? { ...prev, address: `${exif.lat?.toFixed(4)}, ${exif.lng?.toFixed(4)}`, addressLoading: false } : null)
          })
      } else {
        setSeed(prev => prev ? { ...prev, address: 'No GPS data', addressLoading: false } : null)
      }
    } catch (err) {
      setError(`Failed to read seed photo: ${(err as Error).message}`)
      setState('idle')
    }

    // Reset input for re-selection
    e.target.value = ''
  }, [])

  // ============================================================
  // Step 2: Select Batch Photos & Parse EXIF
  // ============================================================

  const handleBatchSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check max files limit
    if (files.length > MAX_FILES) {
      setError(`Please select fewer than ${MAX_FILES} photos for optimal performance. You selected ${files.length}.`)
      e.target.value = ''
      return
    }

    if (!seed?.exif.lat || !seed?.exif.lng || !seed?.exif.timestamp) {
      setError('Seed photo must have GPS and timestamp data for filtering.')
      e.target.value = ''
      return
    }

    setError(null)
    setState('parsing')
    setParsedPhotos([])
    setMatchedPhotos([])
    setResults(null)

    const fileArray: File[] = Array.from(files)
    const startTime = Date.now()

    // Setup abort controller
    abortRef.current = new AbortController()

    try {
      // Parse EXIF in batches
      const parsed = await parseExifBatch(
        fileArray,
        BATCH_SIZE,
        (prog) => {
          setProgress(prog)
        },
        abortRef.current.signal
      )

      setParsedPhotos(parsed)
      setState('filtering')

      // Filter by distance + time
      const photoData = parsed.map(p => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
      }))

      const filterResult = filterPhotos(
        photoData,
        seed.exif.lat!,
        seed.exif.lng!,
        seed.exif.timestamp!,
        DISTANCE_THRESHOLD_M,
        TIME_WINDOW_DAYS
      )

      const matched = filterResult.matchedIndices.map(i => parsed[i])
      setMatchedPhotos(matched)

      const stats = getExifStats(parsed)
      const elapsedMs = Date.now() - startTime

      setResults({
        totalSelected: fileArray.length,
        parsed: parsed.length,
        withGps: stats.withGps,
        withTimestamp: stats.withTimestamp,
        matched: matched.length,
        elapsedMs,
        stats,
      })

      setState('done')
    } catch (err) {
      if ((err as Error).message === 'Parsing cancelled') {
        setError('Parsing was cancelled')
      } else {
        setError(`Parsing failed: ${(err as Error).message}`)
      }
      setState('seed-selected')
    }

    // Reset input for re-selection
    e.target.value = ''
  }, [seed])

  // ============================================================
  // Cancel
  // ============================================================

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ============================================================
  // Reset
  // ============================================================

  const handleReset = useCallback(() => {
    setState('idle')
    setSeed(null)
    setProgress(null)
    setResults(null)
    setError(null)
    setParsedPhotos([])
    setMatchedPhotos([])
  }, [])

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="rounded-lg bg-amber-500 p-4 text-white">
          <h1 className="text-xl font-bold">Import Mode Lab</h1>
          <p className="text-sm opacity-90">Phase C Technical Validation</p>
        </div>

        {/* Validation Checklist */}
        <div className="rounded-lg bg-white p-4">
          <h2 className="font-semibold text-gray-900">Validation Items</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li className={seed?.exif.lat && seed?.exif.timestamp ? 'text-green-600' : 'text-gray-500'}>
              {seed?.exif.lat && seed?.exif.timestamp ? '✅' : '⬜'} 1. Read EXIF (GPS + Time)
            </li>
            <li className={results && results.parsed >= 300 ? 'text-green-600' : 'text-gray-500'}>
              {results && results.parsed >= 300 ? '✅' : '⬜'} 2. Batch parse 300+ photos
            </li>
            <li className={results?.matched !== undefined ? 'text-green-600' : 'text-gray-500'}>
              {results?.matched !== undefined ? '✅' : '⬜'} 3. Filter by 30 days + 100m
            </li>
            <li className={seed?.address && !seed.addressLoading ? 'text-green-600' : 'text-gray-500'}>
              {seed?.address && !seed.addressLoading && seed.address !== 'No GPS data' ? '✅' : '⬜'} 4. Reverse geocode address
            </li>
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Seed Selection */}
        <div className="rounded-lg bg-white p-4">
          <h2 className="font-semibold text-gray-900">Step 1: Select Seed Photo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose one photo to set the reference location and time.
          </p>

          <input
            ref={seedInputRef}
            type="file"
            accept="image/*"
            onChange={handleSeedSelect}
            className="hidden"
          />

          <button
            onClick={() => seedInputRef.current?.click()}
            className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Select Seed Photo
          </button>

          {/* Seed Info */}
          {seed && (
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-3 font-mono text-xs">
              <div><strong>File:</strong> {seed.file.name}</div>
              <div><strong>Size:</strong> {(seed.file.size / 1024).toFixed(1)} KB</div>
              <div>
                <strong>GPS:</strong>{' '}
                {seed.exif.lat !== null && seed.exif.lng !== null
                  ? `${seed.exif.lat.toFixed(6)}, ${seed.exif.lng.toFixed(6)}`
                  : <span className="text-red-600">Not found</span>}
              </div>
              <div>
                <strong>Timestamp:</strong>{' '}
                {seed.exif.timestamp
                  ? formatTimestamp(seed.exif.timestamp)
                  : <span className="text-red-600">Not found</span>}
              </div>
              <div>
                <strong>DateTimeOriginal:</strong>{' '}
                {seed.exif.dateTimeOriginal || <span className="text-gray-400">N/A</span>}
              </div>
              <div>
                <strong>Address:</strong>{' '}
                {seed.addressLoading
                  ? <span className="text-amber-600">Loading...</span>
                  : seed.address || <span className="text-gray-400">N/A</span>}
              </div>
              {seed.exif.error && (
                <div className="text-red-600"><strong>Error:</strong> {seed.exif.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Batch Selection (only if seed is ready) */}
        {state !== 'idle' && seed && (
          <div className="rounded-lg bg-white p-4">
            <h2 className="font-semibold text-gray-900">Step 2: Select Batch Photos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select multiple photos (up to {MAX_FILES}). System will filter by ±{TIME_WINDOW_DAYS} days and {DISTANCE_THRESHOLD_M}m.
            </p>

            <input
              ref={batchInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBatchSelect}
              className="hidden"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => batchInputRef.current?.click()}
                disabled={state === 'parsing' || state === 'filtering'}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                Select Photos
              </button>

              {(state === 'parsing' || state === 'filtering') && (
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Progress */}
            {(state === 'parsing' || state === 'filtering') && progress && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  {state === 'parsing' ? 'Parsing EXIF data...' : 'Filtering...'}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="font-mono text-xs text-gray-500">
                  {progress.current} / {progress.total} ({((progress.current / progress.total) * 100).toFixed(0)}%)
                  • {(progress.elapsedMs / 1000).toFixed(1)}s
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="rounded-lg bg-white p-4">
            <h2 className="font-semibold text-gray-900">Results</h2>

            <div className="mt-3 space-y-2 rounded-lg bg-green-50 p-3 font-mono text-sm">
              <div className="text-lg font-bold text-green-700">
                Selected: {results.totalSelected} → Matched: {results.matched}
              </div>
              <div>Time: {(results.elapsedMs / 1000).toFixed(2)} seconds</div>
            </div>

            <div className="mt-4 space-y-1 font-mono text-xs text-gray-600">
              <div>Total selected: {results.totalSelected}</div>
              <div>Successfully parsed: {results.parsed}</div>
              <div>With GPS: {results.withGps} ({((results.withGps / results.parsed) * 100).toFixed(1)}%)</div>
              <div>With timestamp: {results.withTimestamp} ({((results.withTimestamp / results.parsed) * 100).toFixed(1)}%)</div>
              <div>With both: {results.stats.withBoth}</div>
              <div>Parse errors: {results.stats.errors}</div>
              <div className="pt-2 text-gray-400">
                Filter: ±{TIME_WINDOW_DAYS} days, {DISTANCE_THRESHOLD_M}m radius
              </div>
            </div>

            {/* Performance assessment */}
            <div className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
              <strong>Performance Assessment:</strong>
              <div className="mt-1 text-gray-600">
                {results.parsed >= 300 && results.elapsedMs <= 10000 ? (
                  <span className="text-green-600">✅ PASS - Parsed {results.parsed} photos in {(results.elapsedMs / 1000).toFixed(1)}s (target: 300+ in ≤10s)</span>
                ) : results.parsed < 300 ? (
                  <span className="text-yellow-600">⚠️ Need more photos to validate (tested {results.parsed}, need 300+)</span>
                ) : (
                  <span className="text-red-600">❌ FAIL - {(results.elapsedMs / 1000).toFixed(1)}s exceeds 10s target</span>
                )}
              </div>
            </div>

            {/* Sample matched photos */}
            {matchedPhotos.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700">Sample Matched Photos (first 5):</div>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  {matchedPhotos.slice(0, 5).map((photo, i) => (
                    <div key={i} className="rounded bg-gray-50 p-2">
                      <div>{photo.file.name}</div>
                      <div className="text-gray-500">
                        GPS: {photo.lat?.toFixed(4)}, {photo.lng?.toFixed(4)}
                        {seed?.exif.lat && seed?.exif.lng && photo.lat && photo.lng && (
                          <span className="ml-2">
                            (Distance: {haversineDistance(seed.exif.lat, seed.exif.lng, photo.lat, photo.lng).toFixed(0)}m)
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        Time: {photo.timestamp ? formatTimestamp(photo.timestamp) : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Button */}
        {state !== 'idle' && (
          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset & Start Over
          </button>
        )}

        {/* Debug Info */}
        <div className="rounded-lg bg-gray-200 p-3 text-xs text-gray-600">
          <div>State: {state}</div>
          <div>Max files: {MAX_FILES}</div>
          <div>Batch size: {BATCH_SIZE}</div>
          <div>Distance threshold: {DISTANCE_THRESHOLD_M}m</div>
          <div>Time window: ±{TIME_WINDOW_DAYS} days</div>
        </div>
      </div>
    </div>
  )
}
