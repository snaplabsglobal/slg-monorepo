/**
 * POST /api/rescue/scan
 *
 * Rescue Mode v1 - Suggestion Engine (Endpoint A)
 *
 * 🚨 核心设计原则:
 * - Rescue = Suggestion Engine（不是后台任务）
 * - Stateless-first（无 scan session）
 * - Compute-only（scan 不做任何写入）
 * - 唯一写操作是 /confirm 和 /skip
 *
 * Request:
 *   { "scope": { "mode": "unassigned" }, "limit": 2000 }
 *
 * Response Contract (稳定):
 *   {
 *     "stateless": true,
 *     "scope": { "mode": "unassigned" },
 *     "stats": { total_candidates, cluster_count, unknown_count, ... },
 *     "date_range": { min, max, basis },
 *     "clusters": [{ cluster_id, suggested_job, photo_ids, photo_count, reasons }],
 *     "unknown": { photo_ids, photo_count, reasons }
 *   }
 *
 * Candidates Query (唯一合法):
 *   WHERE org_id = :org
 *     AND job_id IS NULL
 *     AND rescue_status = 'unreviewed'
 *
 * DEBUG MODE (dev only):
 * ?debug_stage=1 → 只查候选 photo count
 * ?debug_stage=2 → 加上 stats + date_range
 * ?debug_stage=3 → 加上 cluster 统计
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized } from '@/lib/server/rescue-guards'

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

// NOTE: Rescue v1 must not depend on ai_classification column.
// AI-based filtering is optional and should be feature-flagged.
type PhotoRow = {
  id: string
  temp_lat: number | null
  temp_lng: number | null
  temp_accuracy_m: number | null
  taken_at: string | null
  created_at: string
}

type ClusterData = {
  cluster_id: string
  photo_ids: string[]
  photo_count: number
  centroid_lat: number
  centroid_lng: number
  centroid_accuracy_m: number
  geohash: string
  time_min: string
  time_max: string
}

export async function POST(req: Request) {
  try {
    // ============================================================
    // DEBUG MODE (dev only): ?debug_stage=1|2|3
    // ============================================================
    const url = new URL(req.url)
    const debugStageParam = url.searchParams.get('debug_stage')
    const debugStage = debugStageParam ? parseInt(debugStageParam, 10) : 0
    const isDev = process.env.NODE_ENV !== 'production'

    // A. requireSessionOrg
    const auth = await getSessionOrUnauthorized()
    if (!auth.ok) return auth.response

    const { supabase, organization_id } = auth.ctx

    // Parse request
    let body: { scope?: { mode?: string }; limit?: number } = {}
    try {
      body = await req.json()
    } catch {
      // Empty body defaults to unassigned
    }

    const scopeMode = body.scope?.mode || 'unassigned'
    const limit = Math.min(body.limit || 2000, 2000)

    // v1: Only allow 'unassigned' mode
    if (scopeMode !== 'unassigned') {
      return NextResponse.json(
        { error: 'invalid_scope', message: "v1 only supports scope.mode: 'unassigned'" },
        { status: 400 }
      )
    }

    // ============================================================
    // Query candidate photos: job_id IS NULL AND rescue_status = 'unreviewed'
    // ============================================================
    // v1 Candidates (唯一合法):
    //   WHERE org_id = :org
    //     AND job_id IS NULL
    //     AND rescue_status = 'unreviewed'
    //
    // Exclusions: confirmed / skipped 永不再返回

    const { data: photos, error: queryError } = await supabase
      .from('job_photos')
      .select('id, temp_lat, temp_lng, temp_accuracy_m, taken_at, created_at')
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .is('job_id', null)
      .eq('rescue_status', 'unreviewed')
      .order('taken_at', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (queryError) {
      return NextResponse.json({
        error: 'scan_failed',
        message: queryError.message,
        debug_stage: isDev ? debugStage : undefined,
        debug_checkpoint: isDev ? 'db_query_failed' : undefined,
      }, { status: 500 })
    }

    const finalPhotos: PhotoRow[] = (photos || []) as PhotoRow[]

    // ============================================================
    // DEBUG STAGE 1: 只返回候选照片数量
    // 用于验证：DB 连接 + job_photos 查询是否正常
    // ============================================================
    if (isDev && debugStage === 1) {
      return NextResponse.json({
        debug_stage: 1,
        debug_checkpoint: 'db_query_ok',
        total_candidates: finalPhotos.length,
        query: "job_id IS NULL AND deleted_at IS NULL AND rescue_status = 'unreviewed'",
      })
    }

    // Process photos and compute clusters (stateless, no DB writes)
    return computeSuggestions(finalPhotos, scopeMode, isDev ? debugStage : 0)
  } catch (error) {
    console.error('[rescue/scan] Unhandled error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Compute suggestions from candidate photos (stateless, no DB writes)
 */
function computeSuggestions(
  photos: PhotoRow[],
  scopeMode: string,
  debugStage: number = 0
) {
  // ============================================================
  // Compute stats (MUST be returned for transparency)
  // 所有数字在应用侧算（基于真实 DB 数据）
  // ============================================================

  const totalCandidates = photos.length
  const withTakenAt = photos.filter(p => p.taken_at != null).length
  const missingTakenAt = totalCandidates - withTakenAt
  const withGps = photos.filter(p => p.temp_lat != null && p.temp_lng != null).length
  const missingGps = totalCandidates - withGps
  // NOTE: Rescue v1 does not use AI classification for filtering.
  // All candidates are treated as potentially jobsite photos.
  // AI-based filtering can be added as a feature flag in v2.
  const likelyJobsite = totalCandidates

  // Date range - 优先使用 taken_at，fallback 到 created_at
  const takenAtDates = photos
    .filter(p => p.taken_at != null)
    .map(p => p.taken_at!)
    .sort()

  const allDates = photos
    .map(p => p.taken_at || p.created_at)
    .filter(Boolean)
    .sort()

  // basis 标记
  let dateRangeBasis = 'taken_at'
  let dateRangeMin = takenAtDates[0] || null
  let dateRangeMax = takenAtDates[takenAtDates.length - 1] || null

  if (!dateRangeMin && allDates.length > 0) {
    dateRangeBasis = 'created_at_fallback'
    dateRangeMin = allDates[0]
    dateRangeMax = allDates[allDates.length - 1]
  }

  // ============================================================
  // DEBUG STAGE 2: 返回 stats + date_range（不做聚类）
  // 用于验证：stats 计算是否正常
  // ============================================================
  if (debugStage === 2) {
    return NextResponse.json({
      debug_stage: 2,
      debug_checkpoint: 'stats_computed',
      total_candidates: totalCandidates,
      stats: {
        total_candidates: totalCandidates,
        likely_jobsite: likelyJobsite,
        with_taken_at: withTakenAt,
        missing_taken_at: missingTakenAt,
        with_gps: withGps,
        missing_gps: missingGps,
      },
      date_range: {
        min: dateRangeMin,
        max: dateRangeMax,
        basis: dateRangeBasis,
      },
    })
  }

  // ============================================================
  // v1 Bucket 分类 (只有2个bucket)
  // ============================================================
  // clusters = 有 GPS → geohash + time 聚类
  // unknown  = 缺 GPS (包括有/无 taken_at)

  const withGpsPhotos = photos.filter(p => p.temp_lat != null && p.temp_lng != null)
  const unknownPhotos = photos.filter(p => p.temp_lat == null || p.temp_lng == null)

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

  const clusters: ClusterData[] = []
  let clusterIndex = 0

  for (const [geohash, groupPhotos] of geohashGroups) {
    // Sort by date
    const sorted = [...groupPhotos].sort((a, b) => {
      const dateA = a.taken_at || a.created_at
      const dateB = b.taken_at || b.created_at
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    // Split into time-based clusters (60 days max span)
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
          clusters.push(createClusterData(currentCluster, geohash, clusterIndex++))
        }
        currentCluster = [photo]
        clusterStartTime = photoTime
      }
    }

    if (currentCluster.length > 0) {
      clusters.push(createClusterData(currentCluster, geohash, clusterIndex++))
    }
  }

  // ============================================================
  // Build stats object
  // ============================================================

  // v1 Stats (match contract)
  const stats = {
    total_candidates: totalCandidates,
    cluster_count: clusters.length,
    unknown_count: unknownPhotos.length,
    with_taken_at: withTakenAt,
    missing_taken_at: missingTakenAt,
    with_gps: withGps,
    missing_gps: missingGps,
  }

  const unknownPhotoIds = unknownPhotos.map(p => p.id)

  // ============================================================
  // DEBUG STAGE 3: 返回 stats + clusters（验证聚类逻辑）
  // ============================================================
  if (debugStage === 3) {
    return NextResponse.json({
      debug_stage: 3,
      debug_checkpoint: 'clustering_done',
      stats,
      date_range: { min: dateRangeMin, max: dateRangeMax, basis: dateRangeBasis },
      cluster_count: clusters.length,
      unknown_count: unknownPhotoIds.length,
    })
  }

  // ============================================================
  // v1 Response Contract (stateless-first, compute only)
  // - No DB writes in scan
  // - stateless: true always
  // - photo_ids included for confirm/skip
  // ============================================================

  return NextResponse.json({
    stateless: true,
    scope: { mode: scopeMode },
    stats,
    date_range: {
      min: dateRangeMin,
      max: dateRangeMax,
      basis: dateRangeBasis,
    },
    clusters: clusters.map(c => ({
      cluster_id: c.cluster_id,
      suggested_job: {
        name: `Job (${c.photo_count} photos)`,
        address: null,
        lat: c.centroid_lat,
        lng: c.centroid_lng,
      },
      photo_ids: c.photo_ids,
      photo_count: c.photo_count,
      reasons: ['gps_cluster', 'time_cohesion'],
    })),
    unknown: {
      photo_ids: unknownPhotoIds,
      photo_count: unknownPhotoIds.length,
      reasons: ['missing_gps'],
    },
  })
}

function createClusterData(photos: PhotoRow[], geohash: string, index: number): ClusterData {
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
  const avgAcc = accCount > 0 ? sumAcc / accCount : 100

  // Get date range
  const dates = photos
    .map(p => p.taken_at || p.created_at)
    .filter(Boolean)
    .sort()

  return {
    cluster_id: `cl_${geohash}_${index}`,
    photo_ids: photos.map(p => p.id),
    photo_count: photos.length,
    centroid_lat: avgLat,
    centroid_lng: avgLng,
    centroid_accuracy_m: avgAcc,
    geohash,
    time_min: dates[0],
    time_max: dates[dates.length - 1],
  }
}
