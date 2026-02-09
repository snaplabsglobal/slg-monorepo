/**
 * GET /api/rescue/scan/:scan_id/debug
 *
 * Debug endpoint (dev/admin only).
 *
 * 返回:
 * - stats 的详细拆分 (missing_gps、geocode_failed 原因)
 * - 聚类参数 (geohash precision、time window)
 * - cluster 的原始 geohash key (用于定位"为什么只剩3个地址")
 *
 * 这就是排查"2021–2022/三个地址/360张"必备的工具。
 */

import { NextResponse } from 'next/server'
import { getSessionOrUnauthorized, assertScanBelongsToOrg } from '@/lib/server/rescue-guards'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  // A. requireSessionOrg
  const auth = await getSessionOrUnauthorized()
  if (!auth.ok) return auth.response

  const { supabase, organization_id } = auth.ctx

  // ============================================================
  // B. 尝试新表
  // ============================================================

  const scanResult = await assertScanBelongsToOrg(auth.ctx, scanId)

  if (scanResult.valid) {
    const scan = scanResult.scan

    // 查询 clusters 详情
    const { data: clusters } = await supabase
      .from('rescue_clusters')
      .select('*')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)
      .order('photo_count', { ascending: false })

    // 查询 unknown
    const { data: unknown } = await supabase
      .from('rescue_unknown')
      .select('*')
      .eq('scan_id', scanId)
      .eq('organization_id', organization_id)
      .single()

    // 聚类参数
    const clusteringParams = {
      geohash_precision: 7,
      geohash_approx_meters: 150,
      time_window_days: 60,
      time_window_ms: 60 * 24 * 60 * 60 * 1000,
    }

    // Stats 详细拆分
    const stats = scan.stats_json as Record<string, unknown>

    // Cluster 分析
    const clusterAnalysis = (clusters || []).map(c => ({
      cluster_id: c.id,
      geohash: c.geohash,
      photo_count: c.photo_count,
      status: c.status,
      job_id: c.job_id,
      centroid: {
        lat: c.centroid_lat,
        lng: c.centroid_lng,
        accuracy_m: c.centroid_accuracy_m,
      },
      time_range: {
        min: c.time_min,
        max: c.time_max,
        span_days: c.time_min && c.time_max
          ? Math.round((new Date(c.time_max).getTime() - new Date(c.time_min).getTime()) / (24 * 60 * 60 * 1000))
          : null,
      },
      address: {
        display: c.address_display,
        source: c.address_source,
        confidence: c.address_confidence,
      },
    }))

    // Geohash 分布统计
    const geohashDistribution: Record<string, number> = {}
    for (const c of clusters || []) {
      if (c.geohash) {
        const prefix = c.geohash.substring(0, 5)
        geohashDistribution[prefix] = (geohashDistribution[prefix] || 0) + c.photo_count
      }
    }

    return NextResponse.json({
      scan_id: scanId,
      scan_status: scan.status,
      created_at: scan.created_at,
      expires_at: scan.expires_at,

      stats: {
        ...stats,
        date_range: {
          min: scan.date_range_min,
          max: scan.date_range_max,
          basis: scan.date_range_basis,
        },
      },

      clustering_params: clusteringParams,

      clusters: {
        total: clusters?.length || 0,
        by_status: {
          unreviewed: clusters?.filter(c => c.status === 'unreviewed').length || 0,
          confirmed: clusters?.filter(c => c.status === 'confirmed').length || 0,
          skipped: clusters?.filter(c => c.status === 'skipped').length || 0,
        },
        details: clusterAnalysis,
        geohash_distribution: geohashDistribution,
      },

      unknown: {
        total: unknown?.photo_count || 0,
        photo_ids: unknown?.photo_ids || [],
        reasons: ['missing_gps'],
      },

      debug_hints: {
        few_clusters_possible_causes: [
          'Photos have similar GPS coordinates (within 150m)',
          'Photos span long time ranges (>60 days may split clusters)',
          'Most photos have same geohash prefix',
        ],
        date_range_issues: [
          'Check if photos have taken_at vs only created_at',
          'Verify date_range_basis in stats',
        ],
      },
    })
  }

  // ============================================================
  // C. Fallback: 旧表
  // ============================================================

  const { data: session, error } = await supabase
    .from('rescue_scan_sessions')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', organization_id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  }

  const clusters = session.clusters || []
  const clusteringParams = {
    geohash_precision: 7,
    geohash_approx_meters: 150,
    time_window_days: 60,
    time_window_ms: 60 * 24 * 60 * 60 * 1000,
  }

  const clusterAnalysis = clusters.map((c: {
    cluster_id: string
    geohash?: string
    photo_count?: number
    photo_ids?: string[]
    centroid?: { lat: number; lng: number; accuracy_m?: number }
    time_range?: { min: string; max: string }
    address?: { display?: string; source?: string; confidence?: number }
  }) => ({
    cluster_id: c.cluster_id,
    geohash: c.geohash,
    photo_count: c.photo_count || c.photo_ids?.length || 0,
    status: (session.clusters_confirmed || []).includes(c.cluster_id) ? 'confirmed'
      : (session.clusters_skipped || []).includes(c.cluster_id) ? 'skipped'
      : 'unreviewed',
    centroid: c.centroid,
    time_range: c.time_range
      ? {
          ...c.time_range,
          span_days: c.time_range.min && c.time_range.max
            ? Math.round((new Date(c.time_range.max).getTime() - new Date(c.time_range.min).getTime()) / (24 * 60 * 60 * 1000))
            : null,
        }
      : null,
    address: c.address,
  }))

  const geohashDistribution: Record<string, number> = {}
  for (const c of clusters) {
    if (c.geohash) {
      const prefix = c.geohash.substring(0, 5)
      geohashDistribution[prefix] = (geohashDistribution[prefix] || 0) + (c.photo_count || c.photo_ids?.length || 0)
    }
  }

  return NextResponse.json({
    scan_id: scanId,
    scan_status: session.status,
    created_at: session.created_at,

    stats: {
      ...session.stats,
      date_range: session.date_range,
    },

    clustering_params: clusteringParams,

    clusters: {
      total: clusters.length,
      by_status: {
        unreviewed: clusters.length - (session.clusters_confirmed?.length || 0) - (session.clusters_skipped?.length || 0),
        confirmed: session.clusters_confirmed?.length || 0,
        skipped: session.clusters_skipped?.length || 0,
      },
      details: clusterAnalysis,
      geohash_distribution: geohashDistribution,
    },

    unknown: {
      total: session.unknown_photo_ids?.length || 0,
      processed: {
        assigned: session.unknown_assigned_ids?.length || 0,
        skipped: session.unknown_skipped_ids?.length || 0,
      },
      reasons: ['missing_gps'],
    },

    debug_hints: {
      few_clusters_possible_causes: [
        'Photos have similar GPS coordinates (within 150m)',
        'Photos span long time ranges (>60 days may split clusters)',
        'Most photos have same geohash prefix',
      ],
      date_range_issues: [
        'Check if photos have taken_at vs only created_at',
        'Verify date_range_basis in stats',
      ],
    },
  })
}
