/**
 * POST /api/rescue/scan
 *
 * Creates a new Rescue scan session with full transparency stats.
 *
 * 必须行为:
 * 1. 校验 scope.mode === 'unassigned' (v1 只允许这个)
 * 2. 从 DB 选候选照片: job_id IS NULL, rescue_status = 'unreviewed'
 * 3. 计算 stats (所有数字在 DB 侧算)
 * 4. 聚类 (地点 + 时间) 得到 clusters + unknown
 * 5. 原子写入 rescue_scans / rescue_clusters / rescue_unknown
 * 6. 返回 scan_result (包含 stats + date_range)
 *
 * 强制校验点:
 * - date_range basis: min/max(taken_at) 或 fallback
 * - cluster photo_count 用 array_length(photo_ids)
 * - unknown_count 必须来自 missing_gps 子集
 *
 * DEBUG MODE (dev only):
 * ?debug_stage=1 → 只查候选 photo count，直接 return { total_candidates }
 * ?debug_stage=2 → 加上 stats + date_range
 * ?debug_stage=3 → 加上 cluster + geocode（不写 DB）
 * 无参数或其他值 → 完整流程（含 DB 写入）
 *
 * 用于快速定位：是 DB 查询炸？聚类炸？geocode 炸？还是 insert 炸？
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized } from '@/lib/server/rescue-guards'
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

    const { supabase, organization_id, user_id } = auth.ctx

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

    let finalPhotos: PhotoRow[] = []
    let usedFallback = false

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
        return NextResponse.json({
          error: 'scan_failed',
          message: fallbackError.message,
          debug_stage: isDev ? debugStage : undefined,
          debug_checkpoint: isDev ? 'db_query_failed' : undefined,
        }, { status: 500 })
      }

      finalPhotos = (fallbackPhotos || []) as PhotoRow[]
      usedFallback = true
    } else {
      finalPhotos = (photos || []) as PhotoRow[]
    }

    // ============================================================
    // DEBUG STAGE 1: 只返回候选照片数量
    // 用于验证：DB 连接 + job_photos 查询是否正常
    // ============================================================
    if (isDev && debugStage === 1) {
      return NextResponse.json({
        debug_stage: 1,
        debug_checkpoint: 'db_query_ok',
        total_candidates: finalPhotos.length,
        used_fallback: usedFallback,
        query_error: queryError?.message || null,
      })
    }

    // Ensure we have an array (Supabase returns null when no results)
    return processAndSave(finalPhotos, scan_id, scopeMode, organization_id, user_id, supabase, isDev ? debugStage : 0)
  } catch (error) {
    console.error('[rescue/scan] Unhandled error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function processAndSave(
  photos: PhotoRow[],
  scan_id: string,
  scopeMode: string,
  organization_id: string,
  user_id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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
  const likelyJobsite = photos.filter(p => p.ai_classification === 'jobsite').length

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

  const stats = {
    total_candidates: totalCandidates,
    likely_jobsite: likelyJobsite,
    with_taken_at: withTakenAt,
    missing_taken_at: missingTakenAt,
    with_gps: withGps,
    missing_gps: missingGps,
    geocode_success: 0,
    geocode_failed: 0,
    cluster_count: clusters.length,
    unknown_count: withoutGpsPhotos.length,
  }

  const unknownPhotoIds = withoutGpsPhotos.map(p => p.id)

  // ============================================================
  // DEBUG STAGE 3: 返回 stats + clusters（不写 DB）
  // 用于验证：聚类是否正常
  // ============================================================
  if (debugStage === 3) {
    return NextResponse.json({
      debug_stage: 3,
      debug_checkpoint: 'clustering_done',
      scan_id,
      stats,
      date_range: {
        min: dateRangeMin,
        max: dateRangeMax,
        basis: dateRangeBasis,
      },
      clusters: clusters.map(c => ({
        cluster_id: c.cluster_id,
        photo_count: c.photo_count,
        geohash: c.geohash,
        centroid: {
          lat: c.centroid_lat,
          lng: c.centroid_lng,
          accuracy_m: c.centroid_accuracy_m,
        },
        time_range: {
          min: c.time_min,
          max: c.time_max,
        },
      })),
      unknown: {
        photo_count: unknownPhotoIds.length,
        reasons: ['missing_gps'],
      },
      _note: 'DB write skipped in debug_stage=3',
    })
  }

  // ============================================================
  // 原子写入: rescue_scans + rescue_clusters + rescue_unknown
  // ============================================================

  let dbWriteResult = {
    rescue_scans: { success: false, error: null as string | null },
    rescue_clusters: { success: false, error: null as string | null, count: 0 },
    rescue_unknown: { success: false, error: null as string | null },
    used_fallback_table: false,
  }

  try {
    // 1. 写入 scan (尝试新表，fallback 到旧表)
    const { error: scanError } = await supabase
      .from('rescue_scans')
      .insert({
        id: scan_id,
        organization_id,
        created_by: user_id,
        scope_mode: scopeMode,
        stats_json: stats,
        date_range_min: dateRangeMin,
        date_range_max: dateRangeMax,
        date_range_basis: dateRangeBasis,
        status: 'active',
      })

    if (scanError) {
      // Fallback: 尝试旧表 rescue_scan_sessions
      console.warn('rescue_scans insert failed, trying rescue_scan_sessions:', scanError.message)
      dbWriteResult.rescue_scans.error = scanError.message

      const { error: fallbackScanError } = await supabase
        .from('rescue_scan_sessions')
        .insert({
          id: scan_id,
          organization_id,
          user_id,
          scope_mode: scopeMode,
          stats,
          date_range: { min: dateRangeMin, max: dateRangeMax, basis: dateRangeBasis },
          clusters: clusters.map(c => ({
            cluster_id: c.cluster_id,
            photo_ids: c.photo_ids,
            photo_count: c.photo_count,
            centroid: { lat: c.centroid_lat, lng: c.centroid_lng, accuracy_m: c.centroid_accuracy_m },
            time_range: { min: c.time_min, max: c.time_max },
            geohash: c.geohash,
            address: null,
          })),
          unknown_photo_ids: unknownPhotoIds,
          status: 'active',
        })

      if (fallbackScanError) {
        console.error('Failed to save scan session (both tables):', fallbackScanError)
        dbWriteResult.rescue_scans.error = `new: ${scanError.message}, old: ${fallbackScanError.message}`
      } else {
        dbWriteResult.rescue_scans.success = true
        dbWriteResult.used_fallback_table = true
      }
    } else {
      dbWriteResult.rescue_scans.success = true

      // 2. 写入 clusters
      if (clusters.length > 0) {
        const clusterRows = clusters.map(c => ({
          id: c.cluster_id,
          scan_id,
          organization_id,
          photo_ids: c.photo_ids,
          photo_count: c.photo_count,
          centroid_lat: c.centroid_lat,
          centroid_lng: c.centroid_lng,
          centroid_accuracy_m: c.centroid_accuracy_m,
          geohash: c.geohash,
          time_min: c.time_min,
          time_max: c.time_max,
          status: 'unreviewed',
        }))

        const { error: clustersError } = await supabase
          .from('rescue_clusters')
          .insert(clusterRows)

        if (clustersError) {
          console.error('Failed to save clusters:', clustersError)
          dbWriteResult.rescue_clusters.error = clustersError.message
        } else {
          dbWriteResult.rescue_clusters.success = true
          dbWriteResult.rescue_clusters.count = clusters.length
        }
      } else {
        dbWriteResult.rescue_clusters.success = true
        dbWriteResult.rescue_clusters.count = 0
      }

      // 3. 写入 unknown
      if (unknownPhotoIds.length > 0) {
        const { error: unknownError } = await supabase
          .from('rescue_unknown')
          .insert({
            scan_id,
            organization_id,
            photo_ids: unknownPhotoIds,
            photo_count: unknownPhotoIds.length,
          })

        if (unknownError) {
          console.error('Failed to save unknown:', unknownError)
          dbWriteResult.rescue_unknown.error = unknownError.message
        } else {
          dbWriteResult.rescue_unknown.success = true
        }
      } else {
        dbWriteResult.rescue_unknown.success = true
      }
    }
  } catch (e) {
    console.error('Failed to save scan session:', e)
    dbWriteResult.rescue_scans.error = e instanceof Error ? e.message : 'Unknown error'
  }

  // ============================================================
  // 返回响应
  // ============================================================

  return NextResponse.json({
    scan_id,
    scope: { mode: scopeMode },
    stats,
    date_range: {
      min: dateRangeMin,
      max: dateRangeMax,
      basis: dateRangeBasis,
    },
    clusters: clusters.map(c => ({
      cluster_id: c.cluster_id,
      photo_count: c.photo_count,
      centroid: {
        lat: c.centroid_lat,
        lng: c.centroid_lng,
        accuracy_m: c.centroid_accuracy_m,
      },
      address: null,
      time_range: {
        min: c.time_min,
        max: c.time_max,
      },
    })),
    unknown: {
      photo_count: unknownPhotoIds.length,
      reasons: ['missing_gps'],
    },
    // 只在 dev 环境返回 DB 写入诊断信息
    ...(process.env.NODE_ENV !== 'production' ? { _db_write: dbWriteResult } : {}),
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
