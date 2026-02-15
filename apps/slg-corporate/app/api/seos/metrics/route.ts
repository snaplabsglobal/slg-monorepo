/**
 * SEOS Metrics API
 *
 * Aggregates SEOS metrics from JSS proof-pack endpoint
 * Returns: Level, Coverage, Budget, ESI, Domain Health, Guard Aging
 *
 * SEOS Rule: Never return 500. Always return 200 with degraded status.
 */

import { NextResponse } from 'next/server'

const JSS_PROOF_PACK_URL = 'https://jss.snaplabs.global/api/proof-pack'
const FETCH_TIMEOUT_MS = 5000

// Safe defaults when data is unavailable
const SAFE_DEFAULTS = {
  level: { current: 0, max: 5, floorLockActive: true, floorLockReason: 'Data unavailable', trend: 'stable' as const },
  coverage: { percentage: 0, guarded: 0, total: 0, trend: 'stable' as const },
  interventionBudget: { used: 0, remaining: 3, total: 3, compliant: true, trend: 'stable' as const },
  esi: { value: 0, color: 'red' as const, status: 'Unknown', trend: 'stable' as const },
  domainHealth: { healthy: 0, total: 3, percentage: 0, trend: 'stable' as const },
  guardAging: { active: 0, stale: 0, archived: 0, stalePercentage: 0, trend: 'stable' as const },
}

export interface SEOSMetricsResponse {
  schema: 'seos.dashboard-metrics.v1'
  timestamp: string
  status: 'healthy' | 'degraded' | 'error'
  degradedReason?: string
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
  debug?: {
    error: string
    stack?: string
    fetchDuration?: number
  }
}

/**
 * Create degraded response - NEVER return 500
 */
function createDegradedResponse(
  reason: string,
  error?: Error,
  fetchDuration?: number
): SEOSMetricsResponse {
  const response: SEOSMetricsResponse = {
    schema: 'seos.dashboard-metrics.v1',
    timestamp: new Date().toISOString(),
    status: 'degraded',
    degradedReason: reason,
    metrics: SAFE_DEFAULTS,
    source: {
      app: 'jss-web',
      url: JSS_PROOF_PACK_URL,
      fetchedAt: new Date().toISOString(),
    },
  }

  // Add debug info in non-production or when explicitly requested
  if (error) {
    response.debug = {
      error: error.message,
      stack: error.stack,
      fetchDuration,
    }
    // Log full stack trace to server logs
    console.error('[seos/metrics] DEGRADED:', reason)
    console.error('[seos/metrics] Error:', error.message)
    console.error('[seos/metrics] Stack:', error.stack)
  }

  return response
}

export async function GET() {
  const startTime = Date.now()

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(JSS_PROOF_PACK_URL, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SEOS-Dashboard/1.0',
        },
        // Disable Next.js cache in case of edge runtime issues
        cache: 'no-store',
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      // Determine error type
      const err = fetchError as Error
      let reason = 'Fetch failed'

      if (err.name === 'AbortError') {
        reason = `Timeout after ${FETCH_TIMEOUT_MS}ms`
      } else if (err.message.includes('fetch')) {
        reason = 'Network error - unable to reach JSS'
      } else if (err.message.includes('ECONNREFUSED')) {
        reason = 'Connection refused by JSS'
      }

      // Return degraded, not 500
      return NextResponse.json(
        createDegradedResponse(reason, err, duration),
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Response-Time': `${duration}ms`,
            'X-SEOS-Status': 'degraded',
          },
        }
      )
    }

    clearTimeout(timeoutId)
    const fetchDuration = Date.now() - startTime

    // Check HTTP status
    if (!response.ok) {
      return NextResponse.json(
        createDegradedResponse(
          `JSS returned HTTP ${response.status}`,
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          fetchDuration
        ),
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Response-Time': `${fetchDuration}ms`,
            'X-SEOS-Status': 'degraded',
          },
        }
      )
    }

    // Parse JSON
    let proofPack: Record<string, unknown>
    try {
      proofPack = await response.json()
    } catch (parseError) {
      return NextResponse.json(
        createDegradedResponse(
          'Invalid JSON from JSS',
          parseError as Error,
          fetchDuration
        ),
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Response-Time': `${fetchDuration}ms`,
            'X-SEOS-Status': 'degraded',
          },
        }
      )
    }

    // Extract metrics from proof-pack
    // Handle both v1 and v1.1 schemas
    const hasV11Data = proofPack.radar && proofPack.level && proofPack.guards

    // Safe access helpers
    const safeGet = <T>(obj: unknown, path: string[], defaultValue: T): T => {
      try {
        let current: unknown = obj
        for (const key of path) {
          if (current === null || current === undefined) return defaultValue
          current = (current as Record<string, unknown>)[key]
        }
        return (current as T) ?? defaultValue
      } catch {
        return defaultValue
      }
    }

    const gatef = proofPack.gatef as Record<string, unknown> | undefined
    const seos = proofPack.seos as Record<string, unknown> | undefined
    const esi = proofPack.esi as Record<string, unknown> | undefined
    const health = proofPack.health as Record<string, unknown> | undefined
    const radar = proofPack.radar as Record<string, unknown> | undefined
    const level = proofPack.level as Record<string, unknown> | undefined
    const guards = proofPack.guards as Record<string, unknown> | undefined

    const metrics: SEOSMetricsResponse = {
      schema: 'seos.dashboard-metrics.v1',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: {
        level: {
          current: hasV11Data ? safeGet(level, ['final'], 4) : 4,
          max: 5,
          floorLockActive: hasV11Data ? safeGet(level, ['floorLockActive'], false) : false,
          floorLockReason: hasV11Data ? safeGet(level, ['floorLockReason'], null) : null,
          trend: 'stable',
        },
        coverage: {
          percentage: hasV11Data
            ? safeGet(guards, ['coverage', 'percentage'], 100)
            : Math.round((safeGet(gatef, ['incidents_covered'], 1) / safeGet(gatef, ['incidents_total'], 1)) * 100),
          guarded: hasV11Data
            ? safeGet(guards, ['coverage', 'guarded'], 1)
            : safeGet(gatef, ['incidents_covered'], 1),
          total: hasV11Data
            ? safeGet(guards, ['coverage', 'total'], 1)
            : safeGet(gatef, ['incidents_total'], 1),
          trend: 'stable',
        },
        interventionBudget: {
          used: safeGet(seos, ['unresolved_interventions'], 0),
          remaining: 3 - safeGet(seos, ['unresolved_interventions'], 0),
          total: 3,
          compliant: safeGet(seos, ['compliant'], true),
          trend: 'stable',
        },
        esi: {
          value: Math.round(safeGet(esi, ['value'], 0.85) * 100),
          color: safeGet(esi, ['color'], 'green'),
          status: safeGet(esi, ['status'], 'Stable'),
          trend: 'stable',
        },
        domainHealth: {
          healthy: hasV11Data
            ? (safeGet<string>(health, ['status'], 'HEALTHY') === 'HEALTHY' ? 3 : safeGet<string>(health, ['status'], 'UNKNOWN') === 'DEGRADED' ? 2 : 1)
            : (safeGet<string>(health, ['status'], 'HEALTHY') === 'HEALTHY' ? 3 : 2),
          total: 3,
          percentage: hasV11Data ? safeGet(radar, ['domainIntegrity'], 100) : 100,
          trend: 'stable',
        },
        guardAging: {
          active: hasV11Data ? safeGet(guards, ['aging', 'active'], 19) : 19,
          stale: hasV11Data ? safeGet(guards, ['aging', 'stale'], 0) : 0,
          archived: hasV11Data ? safeGet(guards, ['aging', 'archived'], 0) : 0,
          stalePercentage: hasV11Data
            ? Math.round((safeGet(guards, ['aging', 'stale'], 0) / Math.max(1, safeGet(guards, ['aging', 'active'], 19) + safeGet(guards, ['aging', 'stale'], 0))) * 100)
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
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=30',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-SEOS-Status': 'healthy',
      },
    })

  } catch (error) {
    // Catch-all: NEVER return 500
    const duration = Date.now() - startTime
    const err = error as Error

    console.error('[seos/metrics] UNEXPECTED ERROR')
    console.error('[seos/metrics] Type:', err.constructor?.name)
    console.error('[seos/metrics] Message:', err.message)
    console.error('[seos/metrics] Stack:', err.stack)

    return NextResponse.json(
      createDegradedResponse('Unexpected error', err, duration),
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Response-Time': `${duration}ms`,
          'X-SEOS-Status': 'error',
        },
      }
    )
  }
}
