/**
 * POST /api/rescue/scan
 *
 * Executes Rescue Mode scan with REAL clustering logic.
 *
 * Input (v1 only allows one mode):
 *   { mode: 'unassigned' }
 *
 * Data source:
 *   SELECT * FROM photos
 *   WHERE job_id IS NULL AND rescue_status = 'unreviewed'
 *
 * Clustering logic:
 *   1. If lat/lng is null → goes to "unknown" bucket
 *   2. Otherwise: group by geohash precision 7 (~150m)
 *   3. Within same geohash: split if time span > 60 days
 *
 * Output:
 *   {
 *     total_photos_scanned: number
 *     clusters: Cluster[]
 *     unknown_count: number
 *   }
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'

// Geohash encoding (precision 7 = ~150m)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

function encodeGeohash(lat: number, lng: number, precision = 7): string {
  let minLat = -90, maxLat = 90
  let minLng = -180, maxLng = 180
  let hash = ''
  let bit = 0
  let ch = 0
  let isLng = true

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2
      if (lng >= mid) {
        ch = (ch << 1) | 1
        minLng = mid
      } else {
        ch = ch << 1
        maxLng = mid
      }
    } else {
      const mid = (minLat + maxLat) / 2
      if (lat >= mid) {
        ch = (ch << 1) | 1
        minLat = mid
      } else {
        ch = ch << 1
        maxLat = mid
      }
    }
    isLng = !isLng
    bit++
    if (bit === 5) {
      hash += BASE32[ch]
      bit = 0
      ch = 0
    }
  }
  return hash
}

// 60 days in milliseconds
const MAX_TIME_SPAN_MS = 60 * 24 * 60 * 60 * 1000

type PhotoRow = {
  id: string
  temp_lat: number | null
  temp_lng: number | null
  taken_at: string | null
  created_at: string
}

type Cluster = {
  cluster_id: string
  photo_ids: string[]
  photo_count: number
  lat: number
  lng: number
  start_date: string
  end_date: string
  geohash: string
}

export async function POST(req: Request) {
  let supabase, organization_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const code = msg === 'Unauthorized' ? 401 : 403
    return NextResponse.json({ error: msg }, { status: code })
  }

  // Parse request body
  let body: { mode?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is ok, defaults to unassigned
  }

  // v1: Only allow 'unassigned' mode
  const mode = body.mode || 'unassigned'
  if (mode !== 'unassigned') {
    return NextResponse.json(
      { error: "v1 only supports mode: 'unassigned'" },
      { status: 400 }
    )
  }

  // ============================================================
  // Step 1: Query candidate photos
  // ONLY: job_id IS NULL AND rescue_status = 'unreviewed'
  // ============================================================

  const { data: photos, error: queryError } = await supabase
    .from('job_photos')
    .select('id, temp_lat, temp_lng, taken_at, created_at')
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')
    .order('taken_at', { ascending: true, nullsFirst: false })
    .limit(5000) // Reasonable limit for clustering

  if (queryError) {
    // Fallback if rescue_status doesn't exist yet
    const { data: fallbackPhotos, error: fallbackError } = await supabase
      .from('job_photos')
      .select('id, temp_lat, temp_lng, taken_at, created_at')
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .is('job_id', null)
      .order('taken_at', { ascending: true, nullsFirst: false })
      .limit(5000)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }

    return processPhotos(fallbackPhotos as PhotoRow[])
  }

  return processPhotos(photos as PhotoRow[])
}

function processPhotos(photos: PhotoRow[]) {
  if (!photos || photos.length === 0) {
    return NextResponse.json({
      total_photos_scanned: 0,
      clusters: [],
      unknown_count: 0,
      unknown_photo_ids: [],
    })
  }

  // ============================================================
  // Step 2: Separate photos with/without GPS
  // ============================================================

  const withGps: PhotoRow[] = []
  const withoutGps: PhotoRow[] = []

  for (const photo of photos) {
    if (photo.temp_lat != null && photo.temp_lng != null) {
      withGps.push(photo)
    } else {
      withoutGps.push(photo)
    }
  }

  // ============================================================
  // Step 3: Group by geohash
  // ============================================================

  const geohashGroups = new Map<string, PhotoRow[]>()

  for (const photo of withGps) {
    const hash = encodeGeohash(photo.temp_lat!, photo.temp_lng!)
    const existing = geohashGroups.get(hash) || []
    existing.push(photo)
    geohashGroups.set(hash, existing)
  }

  // ============================================================
  // Step 4: Split by time (>60 days = new cluster)
  // ============================================================

  const clusters: Cluster[] = []
  let clusterIndex = 0

  for (const [geohash, groupPhotos] of geohashGroups) {
    // Sort by date
    const sorted = [...groupPhotos].sort((a, b) => {
      const dateA = a.taken_at || a.created_at
      const dateB = b.taken_at || b.created_at
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    // Split into time-based clusters
    let currentCluster: PhotoRow[] = []
    let clusterStartTime: number | null = null

    for (const photo of sorted) {
      const photoTime = new Date(photo.taken_at || photo.created_at).getTime()

      if (clusterStartTime === null) {
        // First photo in cluster
        currentCluster.push(photo)
        clusterStartTime = photoTime
      } else if (photoTime - clusterStartTime <= MAX_TIME_SPAN_MS) {
        // Within 60 days of cluster start
        currentCluster.push(photo)
      } else {
        // Exceeds 60 days, save current cluster and start new one
        if (currentCluster.length > 0) {
          clusters.push(createCluster(currentCluster, geohash, clusterIndex++))
        }
        currentCluster = [photo]
        clusterStartTime = photoTime
      }
    }

    // Don't forget the last cluster
    if (currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster, geohash, clusterIndex++))
    }
  }

  return NextResponse.json({
    total_photos_scanned: photos.length,
    clusters,
    unknown_count: withoutGps.length,
    unknown_photo_ids: withoutGps.map((p) => p.id),
  })
}

function createCluster(
  photos: PhotoRow[],
  geohash: string,
  index: number
): Cluster {
  // Calculate centroid
  let sumLat = 0,
    sumLng = 0
  for (const p of photos) {
    sumLat += p.temp_lat!
    sumLng += p.temp_lng!
  }
  const avgLat = sumLat / photos.length
  const avgLng = sumLng / photos.length

  // Get date range
  const dates = photos
    .map((p) => p.taken_at || p.created_at)
    .filter(Boolean)
    .sort()

  return {
    cluster_id: `cluster_${index}_${geohash}`,
    photo_ids: photos.map((p) => p.id),
    photo_count: photos.length,
    lat: avgLat,
    lng: avgLng,
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    geohash,
  }
}
