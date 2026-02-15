/**
 * SEOS Metrics API
 *
 * Aggregates SEOS metrics from JSS proof-pack endpoint
 * Returns: Level, Coverage, Budget, ESI, Domain Health, Guard Aging
 */

import { NextResponse } from 'next/server'

const JSS_PROOF_PACK_URL = 'https://jss.snaplabs.global/api/proof-pack'

export interface SEOSMetricsResponse {
  schema: 'seos.dashboard-metrics.v1'
  timestamp: string
  metrics: {
    level: {
      current: number
      max: number
      floorLockActive: boolean
      floorLockReason: string | null
      trend: 'up' | 'down' | 'stable'
    }
    coverage: {
      percentage: number
      guarded: number
      total: number
      trend: 'up' | 'down' | 'stable'
    }
    interventionBudget: {
      used: number
      remaining: number
      total: number
      compliant: boolean
      trend: 'up' | 'down' | 'stable'
    }
    esi: {
      value: number
      color: 'red' | 'yellow' | 'green'
      status: string
      trend: 'up' | 'down' | 'stable'
    }
    domainHealth: {
      healthy: number
      total: number
      percentage: number
      trend: 'up' | 'down' | 'stable'
    }
    guardAging: {
      active: number
      stale: number
      archived: number
      stalePercentage: number
      trend: 'up' | 'down' | 'stable'
    }
  }
  source: {
    app: string
    url: string
    fetchedAt: string
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    // Fetch proof-pack from JSS
    const response = await fetch(JSS_PROOF_PACK_URL, {
      next: { revalidate: 30 }, // Cache for 30 seconds
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`JSS proof-pack returned ${response.status}`)
    }

    const proofPack = await response.json()

    // Extract metrics from proof-pack
    // Handle both v1 and v1.1 schemas
    const hasV11Data = proofPack.radar && proofPack.level && proofPack.guards

    const metrics: SEOSMetricsResponse = {
      schema: 'seos.dashboard-metrics.v1',
      timestamp: new Date().toISOString(),
      metrics: {
        level: {
          current: hasV11Data ? proofPack.level.final : 4,
          max: 5,
          floorLockActive: hasV11Data ? proofPack.level.floorLockActive : false,
          floorLockReason: hasV11Data ? proofPack.level.floorLockReason : null,
          trend: 'stable',
        },
        coverage: {
          percentage: hasV11Data
            ? proofPack.guards.coverage.percentage
            : Math.round((proofPack.gatef?.incidents_covered / proofPack.gatef?.incidents_total) * 100) || 100,
          guarded: hasV11Data
            ? proofPack.guards.coverage.guarded
            : proofPack.gatef?.incidents_covered || 1,
          total: hasV11Data
            ? proofPack.guards.coverage.total
            : proofPack.gatef?.incidents_total || 1,
          trend: 'stable',
        },
        interventionBudget: {
          used: proofPack.seos?.unresolved_interventions || 0,
          remaining: 3 - (proofPack.seos?.unresolved_interventions || 0),
          total: 3,
          compliant: proofPack.seos?.compliant ?? true,
          trend: 'stable',
        },
        esi: {
          value: Math.round((proofPack.esi?.value || 0.85) * 100),
          color: proofPack.esi?.color || 'green',
          status: proofPack.esi?.status || 'Stable',
          trend: 'stable',
        },
        domainHealth: {
          healthy: hasV11Data
            ? (proofPack.health?.status === 'HEALTHY' ? 3 : proofPack.health?.status === 'DEGRADED' ? 2 : 1)
            : (proofPack.health?.status === 'HEALTHY' ? 3 : 2),
          total: 3,
          percentage: hasV11Data
            ? (proofPack.radar?.domainIntegrity || 100)
            : 100,
          trend: 'stable',
        },
        guardAging: {
          active: hasV11Data ? proofPack.guards.aging.active : 19,
          stale: hasV11Data ? proofPack.guards.aging.stale : 0,
          archived: hasV11Data ? proofPack.guards.aging.archived : 0,
          stalePercentage: hasV11Data
            ? Math.round((proofPack.guards.aging.stale / (proofPack.guards.aging.active + proofPack.guards.aging.stale)) * 100)
            : 0,
          trend: 'stable',
        },
      },
      source: {
        app: 'jss-web',
        url: JSS_PROOF_PACK_URL,
        fetchedAt: new Date().toISOString(),
      },
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, max-age=30',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    })

  } catch (error) {
    console.error('[seos/metrics] Error:', error)

    // Return fallback metrics on error
    return NextResponse.json({
      schema: 'seos.dashboard-metrics.v1',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      metrics: null,
      source: {
        app: 'jss-web',
        url: JSS_PROOF_PACK_URL,
        fetchedAt: new Date().toISOString(),
      },
    }, {
      status: 502,
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    })
  }
}
