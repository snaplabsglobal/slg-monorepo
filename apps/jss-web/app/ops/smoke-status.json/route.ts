/**
 * SEOS Smoke Status API
 * Route: /ops/smoke-status.json
 *
 * Returns the current GateD smoke test status for CEO Dashboard.
 * This is the single source of truth for deployment readiness.
 *
 * Schema: seos.smoke-status.v0.1
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Environment detection
function getEnvironment(): 'local' | 'dev' | 'prod' {
  const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || ''

  if (host.includes('dev.jobsitesnap.com')) return 'dev'
  if (host.includes('jobsitesnap.com') && !host.includes('dev.')) return 'prod'
  if (host.includes('localhost')) return 'local'

  // Vercel preview deployments are treated as dev
  if (process.env.VERCEL_ENV === 'preview') return 'dev'
  if (process.env.VERCEL_ENV === 'production') return 'prod'

  return 'dev' // Default to dev
}

function getBaseUrl(env: 'local' | 'dev' | 'prod'): string {
  switch (env) {
    case 'prod': return 'https://jobsitesnap.com'
    case 'dev': return 'https://dev.jobsitesnap.com'
    case 'local': return 'http://localhost:3001'
  }
}

// Routes to check
const SMOKE_CHECKS = [
  {
    route: '/import-lab',
    expect: { status: 200, contains: 'Import Mode Lab' }
  },
  {
    route: '/api/proof-pack',
    expect: { status: 200, contains: 'gatef' }
  }
]

export async function GET() {
  const env = getEnvironment()
  const baseUrl = getBaseUrl(env)
  const startTime = Date.now()

  const checks: Array<{
    route: string
    expect: { status: number; contains: string }
    result: {
      status: 'pass' | 'fail'
      http_status: number | null
      assertion: 'pass' | 'fail' | 'skipped'
      latency_ms: number
      fail_class?: string
    }
  }> = []

  let overallPass = true

  for (const check of SMOKE_CHECKS) {
    const checkStart = Date.now()
    let httpStatus: number | null = null
    let assertionPass: 'pass' | 'fail' | 'skipped' = 'skipped'
    let failClass: string | undefined

    try {
      const response = await fetch(`${baseUrl}${check.route}`, {
        headers: { 'User-Agent': 'SEOS-Smoke-Status/1.0' },
        cache: 'no-store',
      })

      httpStatus = response.status

      if (httpStatus !== check.expect.status) {
        failClass = 'HTTP_STATUS'
        overallPass = false
      } else {
        // Check assertion
        const body = await response.text()

        if (body.includes('DEPLOYMENT_NOT_FOUND')) {
          failClass = 'DEPLOYMENT_NOT_FOUND'
          assertionPass = 'fail'
          overallPass = false
        } else if (body.includes(check.expect.contains)) {
          assertionPass = 'pass'
        } else {
          failClass = 'ASSERT_FAIL'
          assertionPass = 'fail'
          overallPass = false
        }
      }
    } catch (error) {
      httpStatus = null
      failClass = 'NETWORK_ERROR'
      overallPass = false
    }

    checks.push({
      route: check.route,
      expect: check.expect,
      result: {
        status: failClass ? 'fail' : 'pass',
        http_status: httpStatus,
        assertion: assertionPass,
        latency_ms: Date.now() - checkStart,
        ...(failClass && { fail_class: failClass })
      }
    })
  }

  const smokeStatus = {
    schema: 'seos.smoke-status.v0.1',
    app: 'jss-web',
    generated_at: new Date().toISOString(),
    commit: {
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
      sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
    },
    environments: [
      {
        env,
        base_url: baseUrl,
        checks,
        overall: overallPass ? 'pass' : 'fail',
        evidence: {
          ci_run_url: process.env.VERCEL_URL
            ? `https://vercel.com/snap-labs-global/jss-web/deployments`
            : null,
          log_excerpt: overallPass
            ? 'PASS: Deploy Smoke Guard'
            : `FAIL: ${checks.find(c => c.result.status === 'fail')?.result.fail_class || 'Unknown'}`
        }
      }
    ],
    total_latency_ms: Date.now() - startTime
  }

  return NextResponse.json(smokeStatus, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-SEOS-Smoke': overallPass ? 'pass' : 'fail'
    }
  })
}
