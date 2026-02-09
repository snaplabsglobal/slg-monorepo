/**
 * POST /api/rescue/scan
 *
 * Creates a new Rescue scan session with full transparency stats.
 *
 * Response includes:
 * - scan_id: Session ID for all subsequent operations
 * - stats: Full breakdown of candidate photos
 * - date_range: Actual date range being processed
 * - clusters: Grouped by geohash + time
 * - unknown: Photos without GPS
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// Generate a short unique ID
function generateScanId(): string {
  return `rs_${randomBytes(8).toString('hex')}`
}

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
  temp_accuracy_m: number | null
  taken_at: string | null
  created_at: string
  ai_classification: string | null
}

type Cluster = {
  cluster_id: string
  photo_ids: string[]
  photo_count: number
  centroid: { lat: number; lng: number; accuracy_m: number }
  address: { display: string | null; source: string; confidence: number } | null
  time_range: { min: string; max: string }
  geohash: string
}

export async function POST(req: Request) {
  let supabase, organization_id, user_id

  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id

    // Get user_id
    const { data: { user } } = await supabase.auth.getUser()
    user_id = user?.id
    if (!user_id) throw new Error('Unauthorized')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Parse request
  let body: { scope?: { mode?: string } } = {}
  try {
    body = await req.json()
  } catch {
    // Empty body defaults to unassigned
  }

  const scopeMode = body.scope?.mode || 'unassigned'

  // v1: Only allow 'unassigned' mode
  if (scopeMode !== 'unassigned') {
    return NextResponse.json(
      { error: 'invalid_scope', message: "v1 only supports scope.mode: 'unassigned'" },
      { status: 400 }
    )
  }

  // Generate scan_id
  const scan_id = generateScanId()

  // ============================================================
  // Query candidate photos
  // ONLY: job_id IS NULL AND rescue_status = 'unreviewed'
  // ============================================================

  const { data: photos, error: queryError } = await supabase
    .from('job_photos')
    .select('id, temp_lat, temp_lng, temp_accuracy_m, taken_at, created_at, ai_classification')
    .eq('organization_id', organization_id)
    .is('deleted_at', null)
    .is('job_id', null)
    .eq('rescue_status', 'unreviewed')
    .order('taken_at', { ascending: true, nullsFirst: false })
    .limit(10000)

  if (queryError) {
    // Try without rescue_status filter (migration may not be applied)
    const { data: fallbackPhotos, error: fallbackError } = await supabase
      .from('job_photos')
      .select('id, temp_lat, temp_lng, temp_accuracy_m, taken_at, created_at, ai_classification')
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .is('job_id', null)
      .order('taken_at', { ascending: true, nullsFirst: false })
      .limit(10000)

    if (fallbackError) {
      return NextResponse.json({ error: 'scan_failed', message: fallbackError.message }, { status: 500 })
    }

    return processAndSave(fallbackPhotos as PhotoRow[], scan_id, scopeMode, organization_id, user_id, supabase)
  }

  return processAndSave(photos as PhotoRow[], scan_id, scopeMode, organization_id, user_id, supabase)
}

async function processAndSave(
  photos: PhotoRow[],
  scan_id: string,
  scopeMode: string,
  organization_id: string,
  user_id: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
) {
  // ============================================================
  // Compute stats (MUST be returned for transparency)
  // ============================================================

  const totalCandidates = photos.length
  const withTakenAt = photos.filter(p => p.taken_at != null).length
  const missingTakenAt = totalCandidates - withTakenAt
  const withGps = photos.filter(p => p.temp_lat != null && p.temp_lng != null).length
  const missingGps = totalCandidates - withGps
  const likelyJobsite = photos.filter(p => p.ai_classification === 'jobsite').length

  // Date range
  const allDates = photos
    .map(p => p.taken_at || p.created_at)
    .filter(Boolean)
    .sort()

  const dateRange = {
    min: allDates[0] || null,
    max: allDates[allDates.length - 1] || null,
    basis: 'taken_at_or_fallback',
  }

  // ============================================================
  // Separate photos with/without GPS
  // ============================================================

  const withGpsPhotos = photos.filter(p => p.temp_lat != null && p.temp_lng != null)
  const withoutGpsPhotos = photos.filter(p => p.temp_lat == null || p.temp_lng == null)

  // ============================================================
  // Cluster by geohash + time
  // ============================================================

  const geohashGroups = new Map<string, PhotoRow[]>()

  for (const photo of withGpsPhotos) {
    const hash = encodeGeohash(photo.temp_lat!, photo.temp_lng!)
    const existing = geohashGroups.get(hash) || []
    existing.push(photo)
    geohashGroups.set(hash, existing)
  }

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
        currentCluster.push(photo)
        clusterStartTime = photoTime
      } else if (photoTime - clusterStartTime <= MAX_TIME_SPAN_MS) {
        currentCluster.push(photo)
      } else {
        if (currentCluster.length > 0) {
          clusters.push(createCluster(currentCluster, geohash, clusterIndex++))
        }
        currentCluster = [photo]
        clusterStartTime = photoTime
      }
    }

    if (currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster, geohash, clusterIndex++))
    }
  }

  // ============================================================
  // Build response
  // ============================================================

  const stats = {
    total_candidates: totalCandidates,
    likely_jobsite: likelyJobsite,
    with_taken_at: withTakenAt,
    missing_taken_at: missingTakenAt,
    with_gps: withGps,
    missing_gps: missingGps,
    geocode_success: 0, // v1: no geocoding yet
    geocode_failed: 0,
  }

  const unknown = {
    photo_count: withoutGpsPhotos.length,
    photo_ids: withoutGpsPhotos.map(p => p.id),
    reasons: ['missing_gps'],
  }

  // ============================================================
  // Save session to database
  // ============================================================

  try {
    const { error: insertError } = await supabase
      .from('rescue_scan_sessions')
      .insert({
        id: scan_id,
        organization_id,
        user_id,
        scope_mode: scopeMode,
        stats,
        date_range: dateRange,
        clusters,
        unknown_photo_ids: unknown.photo_ids,
        status: 'active',
      })

    if (insertError) {
      console.error('Failed to save scan session:', insertError)
      // Continue anyway - session storage is optional for v1
    }
  } catch (e) {
    console.error('Failed to save scan session:', e)
    // Continue anyway
  }

  return NextResponse.json({
    scan_id,
    scope: { mode: scopeMode },
    stats,
    date_range: dateRange,
    clusters: clusters.map(c => ({
      cluster_id: c.cluster_id,
      photo_count: c.photo_count,
      centroid: c.centroid,
      address: c.address,
      time_range: c.time_range,
    })),
    unknown: {
      photo_count: unknown.photo_count,
      reasons: unknown.reasons,
    },
  })
}

function createCluster(photos: PhotoRow[], geohash: string, index: number): Cluster {
  // Calculate centroid and average accuracy
  let sumLat = 0, sumLng = 0, sumAcc = 0, accCount = 0
  for (const p of photos) {
    sumLat += p.temp_lat!
    sumLng += p.temp_lng!
    if (p.temp_accuracy_m != null) {
      sumAcc += p.temp_accuracy_m
      accCount++
    }
  }
  const avgLat = sumLat / photos.length
  const avgLng = sumLng / photos.length
  const avgAcc = accCount > 0 ? sumAcc / accCount : 100 // default 100m

  // Get date range
  const dates = photos
    .map(p => p.taken_at || p.created_at)
    .filter(Boolean)
    .sort()

  return {
    cluster_id: `cl_${geohash}_${index}`,
    photo_ids: photos.map(p => p.id),
    photo_count: photos.length,
    centroid: { lat: avgLat, lng: avgLng, accuracy_m: avgAcc },
    address: null, // v1: no reverse geocoding
    time_range: {
      min: dates[0],
      max: dates[dates.length - 1],
    },
    geohash,
  }
}
