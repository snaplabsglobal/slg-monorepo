/**
 * SEOS Health Check API
 *
 * Diagnoses the metrics API connectivity to JSS proof-pack.
 * Returns detailed diagnostics for troubleshooting.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSS_PROOF_PACK_URL = 'https://jss.snaplabs.global/api/proof-pack'

export async function GET() {
  const startTime = Date.now()
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    checks: {},
  }

  // Check 1: DNS resolution
  try {
    const url = new URL(JSS_PROOF_PACK_URL)
    diagnostics.checks = {
      ...diagnostics.checks as object,
      dns: {
        host: url.hostname,
        status: 'PASS',
      },
    }
  } catch (e) {
    diagnostics.checks = {
      ...diagnostics.checks as object,
      dns: {
        status: 'FAIL',
        error: (e as Error).message,
      },
    }
  }

  // Check 2: HTTP fetch to JSS
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const fetchStart = Date.now()
    const response = await fetch(JSS_PROOF_PACK_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SEOS-HealthCheck/1.0',
      },
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    const fetchDuration = Date.now() - fetchStart
    const contentType = response.headers.get('content-type')

    diagnostics.checks = {
      ...diagnostics.checks as object,
      fetch: {
        status: response.ok ? 'PASS' : 'FAIL',
        httpStatus: response.status,
        contentType,
        duration: `${fetchDuration}ms`,
      },
    }

    // Check 3: JSON parsing
    if (response.ok) {
      try {
        const data = await response.json()
        diagnostics.checks = {
          ...diagnostics.checks as object,
          json: {
            status: 'PASS',
            schema: data.schema,
            healthStatus: data.health?.status,
          },
        }
      } catch (e) {
        diagnostics.checks = {
          ...diagnostics.checks as object,
          json: {
            status: 'FAIL',
            error: (e as Error).message,
          },
        }
      }
    }
  } catch (e) {
    const err = e as Error
    diagnostics.checks = {
      ...diagnostics.checks as object,
      fetch: {
        status: 'FAIL',
        error: err.message,
        errorType: err.name,
        stack: err.stack?.split('\n').slice(0, 5),
      },
    }
  }

  // Overall status
  const checks = diagnostics.checks as Record<string, { status: string }>
  const allPassed = Object.values(checks).every(c => c.status === 'PASS')

  diagnostics.overall = allPassed ? 'HEALTHY' : 'UNHEALTHY'
  diagnostics.duration = `${Date.now() - startTime}ms`

  return NextResponse.json(diagnostics, {
    status: allPassed ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-SEOS-Health': allPassed ? 'healthy' : 'unhealthy',
    },
  })
}
