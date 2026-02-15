/**
 * Import Mode - Geo Utilities
 *
 * Haversine distance calculation and reverse geocoding helpers.
 */

// Earth radius in meters
const EARTH_RADIUS_M = 6371000

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_M * c
}

/**
 * Check if photo is within distance threshold of seed location
 */
export function isWithinDistance(
  photoLat: number,
  photoLng: number,
  seedLat: number,
  seedLng: number,
  thresholdMeters: number = 100
): boolean {
  const distance = haversineDistance(photoLat, photoLng, seedLat, seedLng)
  return distance <= thresholdMeters
}

/**
 * Check if photo is within time window of seed timestamp
 */
export function isWithinTimeWindow(
  photoTimestamp: number,
  seedTimestamp: number,
  windowDays: number = 30
): boolean {
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  return Math.abs(photoTimestamp - seedTimestamp) <= windowMs
}

/**
 * Filter photos by distance and time criteria
 */
export function filterPhotos(
  photos: Array<{
    lat: number | null
    lng: number | null
    timestamp: number | null
  }>,
  seedLat: number,
  seedLng: number,
  seedTimestamp: number,
  distanceThresholdM: number = 100,
  timeWindowDays: number = 30
): { matchedIndices: number[]; stats: { total: number; withGps: number; withTime: number; matched: number } } {
  const matchedIndices: number[] = []
  let withGps = 0
  let withTime = 0

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]

    const hasGps = photo.lat !== null && photo.lng !== null
    const hasTime = photo.timestamp !== null

    if (hasGps) withGps++
    if (hasTime) withTime++

    if (!hasGps || !hasTime) continue

    const withinDist = isWithinDistance(photo.lat!, photo.lng!, seedLat, seedLng, distanceThresholdM)
    const withinTime = isWithinTimeWindow(photo.timestamp!, seedTimestamp, timeWindowDays)

    if (withinDist && withinTime) {
      matchedIndices.push(i)
    }
  }

  return {
    matchedIndices,
    stats: {
      total: photos.length,
      withGps,
      withTime,
      matched: matchedIndices.length,
    },
  }
}

// Address cache to avoid redundant API calls
const addressCache = new Map<string, string>()

/**
 * Generate cache key for coordinates (rounded to 5 decimal places)
 */
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

/**
 * Reverse geocode coordinates to address
 * Uses internal API endpoint which calls OpenStreetMap Nominatim
 * Falls back to coordinate string if API fails
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  _apiKey?: string // Unused, kept for compatibility
): Promise<{ address: string; street?: string; city?: string; formatted: string }> {
  const cacheKey = getCacheKey(lat, lng)

  // Check cache first
  if (addressCache.has(cacheKey)) {
    const cached = addressCache.get(cacheKey)!
    return { address: cached, formatted: cached }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    // Use internal API endpoint
    const response = await fetch('/api/import/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.address) {
      throw new Error(data.message || 'No address returned')
    }

    const formatted = data.address.formatted

    // Cache the result
    addressCache.set(cacheKey, formatted)

    return {
      address: formatted,
      formatted,
    }
  } catch (error) {
    // Fallback on error
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    const err = error as Error

    if (err.name === 'AbortError') {
      console.warn('[reverseGeocode] Timeout after 3s')
    } else {
      console.warn('[reverseGeocode] Error:', err.message)
    }

    return { address: fallback, formatted: `Job @ ${fallback}` }
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
