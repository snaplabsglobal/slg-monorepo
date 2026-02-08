/**
 * Self-Rescue Mode Mock Data Generator
 *
 * For UI development and performance testing
 *
 * Design principle from spec:
 * - Use real Vancouver-area addresses (GPS→Address format)
 * - Format: "Burnaby – 8290 Kingsway" not "Example St"
 * - Span realistic date ranges (multiple years)
 */

import type { BuildingBucket, RescuePhoto, UnitId } from './types'

type PhotoMeta = {
  photoId: string
  localUri: string
  takenAtUtc?: string
  lat?: number
  lng?: number
  hasGps: boolean
}

type MockOptions = {
  seed?: number
  buckets?: number
  sessionsPerBucket?: number
  photosPerSession?: number
  noGpsPhotos?: number
  noiseGpsPhotos?: number
  majorityUnit?: 'A' | 'B' | 'C'
  minorityChance?: number
  minorityRatio?: number
  sessionGapMinutes?: number
  photoIntervalSeconds?: number
}

// Realistic Vancouver-area jobsite addresses
const VANCOUVER_ADDRESSES = [
  { city: 'Burnaby', address: '8290 Kingsway', lat: 49.2276, lng: -122.9931 },
  { city: 'Vancouver', address: '5862 Cambie St', lat: 49.2270, lng: -123.1162 },
  { city: 'Richmond', address: '4500 No. 3 Rd', lat: 49.1666, lng: -123.1369 },
  { city: 'Surrey', address: '10355 King George Blvd', lat: 49.1839, lng: -122.8478 },
  { city: 'North Vancouver', address: '935 Marine Dr', lat: 49.3130, lng: -123.0784 },
  { city: 'Coquitlam', address: '2929 Barnet Hwy', lat: 49.2781, lng: -122.7914 },
  { city: 'New Westminster', address: '800 Columbia St', lat: 49.2057, lng: -122.9110 },
  { city: 'Vancouver', address: '1055 W Hastings St', lat: 49.2878, lng: -123.1208 },
  { city: 'Burnaby', address: '4700 Kingsway', lat: 49.2292, lng: -123.0044 },
  { city: 'Vancouver', address: '2220 Cambie St', lat: 49.2623, lng: -123.1150 },
]

/**
 * Mulberry32 PRNG for deterministic mock data
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function pickIndex(rnd: () => number, length: number): number {
  return Math.floor(rnd() * length)
}

function jitter(rnd: () => number, base: number, meters: number) {
  const deg = meters / 111_000
  return base + (rnd() * 2 - 1) * deg
}

function isoAddMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

function isoAddSeconds(iso: string, seconds: number) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString()
}

export function generateMockRescueData(opts: MockOptions = {}) {
  const {
    seed = 1337,
    buckets = 3,
    sessionsPerBucket = 12,
    photosPerSession = 80,
    noGpsPhotos = 200,
    noiseGpsPhotos = 0,
    majorityUnit = 'A',
    minorityChance = 0.65,
    minorityRatio = 0.08,
    sessionGapMinutes = 120,
    photoIntervalSeconds = 45,
  } = opts

  const rnd = mulberry32(seed)
  const photos: PhotoMeta[] = []
  const bucketsOut: BuildingBucket[] = []

  const unitLabels = [
    { unitId: 'A', label: 'Unit A' },
    { unitId: 'B', label: 'Unit B' },
    { unitId: 'C', label: 'Unit C' },
  ]

  // Start from 2021 for realistic multi-year date range
  let t0 = '2021-07-15T09:00:00Z'

  // Track used addresses to avoid duplicates
  const usedAddressIndices: number[] = []

  // Generate building buckets
  for (let b = 0; b < buckets; b++) {
    // Pick a unique address
    let addrIndex = pickIndex(rnd, VANCOUVER_ADDRESSES.length)
    while (usedAddressIndices.includes(addrIndex) && usedAddressIndices.length < VANCOUVER_ADDRESSES.length) {
      addrIndex = (addrIndex + 1) % VANCOUVER_ADDRESSES.length
    }
    usedAddressIndices.push(addrIndex)

    const addr = VANCOUVER_ADDRESSES[addrIndex]
    const baseLat = addr.lat
    const baseLng = addr.lng

    const bucketId = `bucket_building_${b + 1}`
    // Format: "Burnaby – 8290 Kingsway" (GPS→Address format from spec)
    const label = `${addr.city} – ${addr.address}`

    const bucketPhotoIds: string[] = []
    const sessions: Array<{
      sessionId: string
      photoIds: string[]
      dateRange: { start: string; end: string }
      count: number
      assignment: { status: 'unassigned' | 'assigned'; unitId?: UnitId }
    }> = []

    for (let s = 0; s < sessionsPerBucket; s++) {
      const sessionId = `sess_b${b + 1}_${s + 1}`
      const sessionPhotoIds: string[] = []

      // Add months between buckets, days between sessions for realistic multi-year span
      const monthsOffset = b * 8  // ~8 months between different job sites
      const daysOffset = s * 3    // ~3 days between sessions at same site
      const sessionStart = isoAddMinutes(
        t0,
        (monthsOffset * 30 * 24 * 60) + (daysOffset * 24 * 60) + (s * sessionGapMinutes)
      )

      const isMixed = rnd() < minorityChance
      const otherUnits = (['A', 'B', 'C'] as const).filter(
        (u) => u !== majorityUnit
      )
      const minorityUnit = pick(rnd, otherUnits)

      const n = photosPerSession
      const minorityCount = isMixed
        ? Math.max(1, Math.floor(n * minorityRatio))
        : 0

      const minorityStartIndex = isMixed
        ? Math.floor(rnd() * (n - minorityCount))
        : -1

      let sessionEnd = sessionStart

      for (let i = 0; i < n; i++) {
        const pid = `p_${bucketId}_${sessionId}_${i}`
        const takenAtUtc = isoAddSeconds(
          sessionStart,
          i * photoIntervalSeconds + Math.floor(rnd() * 8)
        )
        sessionEnd = takenAtUtc

        const lat = jitter(rnd, baseLat, 40)
        const lng = jitter(rnd, baseLng, 40)

        photos.push({
          photoId: pid,
          localUri: '/placeholder.png',
          takenAtUtc,
          lat,
          lng,
          hasGps: true,
        })

        sessionPhotoIds.push(pid)
        bucketPhotoIds.push(pid)
      }

      sessions.push({
        sessionId,
        photoIds: sessionPhotoIds,
        dateRange: { start: sessionStart, end: sessionEnd },
        count: sessionPhotoIds.length,
        assignment: { status: 'unassigned' },
      })
    }

    bucketsOut.push({
      bucketId,
      suggestedLabel: label,
      photoIds: bucketPhotoIds,
      sessions,
      units: unitLabels,
      centroid: { lat: baseLat, lng: baseLng },
    })
  }

  // NoGPS bucket
  if (noGpsPhotos > 0) {
    const noGpsIds: string[] = []
    const sessionId = 'sess_nogps'
    const sessionPhotoIds: string[] = []
    const start = isoAddMinutes(
      t0,
      buckets * sessionsPerBucket * sessionGapMinutes + 60
    )

    for (let i = 0; i < noGpsPhotos; i++) {
      const pid = `p_nogps_${i}`
      const takenAtUtc = isoAddSeconds(start, i * 30 + Math.floor(rnd() * 10))

      photos.push({
        photoId: pid,
        localUri: '/placeholder.png',
        takenAtUtc,
        hasGps: false,
      })

      sessionPhotoIds.push(pid)
      noGpsIds.push(pid)
    }

    bucketsOut.push({
      bucketId: 'bucket_unlocated',
      suggestedLabel: 'Unlocated (No GPS)',
      photoIds: noGpsIds,
      sessions: [
        {
          sessionId,
          photoIds: sessionPhotoIds,
          dateRange: {
            start,
            end: isoAddSeconds(start, noGpsPhotos * 30),
          },
          count: sessionPhotoIds.length,
          assignment: { status: 'unassigned' },
        },
      ],
    })
  }

  // Optional noise GPS bucket
  if (noiseGpsPhotos > 0) {
    const noiseIds: string[] = []
    const sessionId = 'sess_noise'
    const sessionPhotoIds: string[] = []
    const start = isoAddMinutes(
      t0,
      buckets * sessionsPerBucket * sessionGapMinutes + 180
    )

    for (let i = 0; i < noiseGpsPhotos; i++) {
      const pid = `p_noise_${i}`
      const takenAtUtc = isoAddSeconds(start, i * 35 + Math.floor(rnd() * 10))

      const lat = 49.1 + rnd() * 0.25
      const lng = -123.4 + rnd() * 0.6

      photos.push({
        photoId: pid,
        localUri: '/placeholder.png',
        takenAtUtc,
        lat,
        lng,
        hasGps: true,
      })

      sessionPhotoIds.push(pid)
      noiseIds.push(pid)
    }

    bucketsOut.push({
      bucketId: 'bucket_noise',
      suggestedLabel: 'Noise / Scattered GPS',
      photoIds: noiseIds,
      sessions: [
        {
          sessionId,
          photoIds: sessionPhotoIds,
          dateRange: {
            start,
            end: isoAddSeconds(start, noiseGpsPhotos * 35),
          },
          count: sessionPhotoIds.length,
          assignment: { status: 'unassigned' },
        },
      ],
    })
  }

  // Convert PhotoMeta to RescuePhoto
  const rescuePhotos: RescuePhoto[] = photos.map((p) => ({
    photoId: p.photoId,
    takenAtUtc: p.takenAtUtc || '',
    lat: p.lat,
    lng: p.lng,
    fileName: p.photoId,
  }))

  return { photos: rescuePhotos, buckets: bucketsOut }
}

/**
 * Convenience presets for UI performance testing
 */
export const MockPresets = {
  small: () =>
    generateMockRescueData({
      buckets: 2,
      sessionsPerBucket: 6,
      photosPerSession: 40,
      noGpsPhotos: 40,
    }),

  medium1k: () =>
    generateMockRescueData({
      buckets: 3,
      sessionsPerBucket: 8,
      photosPerSession: 45,
      noGpsPhotos: 80,
    }),

  large5k: () =>
    generateMockRescueData({
      buckets: 6,
      sessionsPerBucket: 14,
      photosPerSession: 55,
      noGpsPhotos: 200,
      noiseGpsPhotos: 200,
    }),

  huge20k: () =>
    generateMockRescueData({
      buckets: 10,
      sessionsPerBucket: 20,
      photosPerSession: 90,
      noGpsPhotos: 800,
      noiseGpsPhotos: 800,
    }),
}
