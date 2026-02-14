import { NextRequest, NextResponse } from 'next/server'
import { generateGateFJson, getGateFQuickStatus } from '@/lib/gatef'

const GIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA || 'local'
const GIT_BRANCH = process.env.VERCEL_GIT_COMMIT_REF || 'local'
const VERCEL_ENV = process.env.VERCEL_ENV || 'local'

/**
 * GET /api/gatef - GateF Regression Memory Layer Status
 *
 * Query params:
 *   - full=true: Run soak tests and return full gatef.json
 *   - full=false (default): Return quick status without soak tests
 *
 * Dashboard 显示（CEO 视角 4 行）:
 *   GateF Status:        PASS/FAIL
 *   Incidents Covered:   1/1
 *   Soak:                10/10
 *   Missing CTA Coverage: 0
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const runFull = searchParams.get('full') === 'true'

  if (runFull) {
    // Get base URL for soak tests
    const host = request.headers.get('host') || 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Generate full GateF JSON with soak tests
    const gatef = await generateGateFJson(
      baseUrl,
      VERCEL_ENV,
      GIT_SHA.slice(0, 8),
      GIT_BRANCH
    )

    return NextResponse.json(gatef)
  }

  // Quick status (no soak tests)
  const quickStatus = getGateFQuickStatus()

  return NextResponse.json({
    schema: 'seos.gatef.v1.quick',
    app: 'jss-web',
    env: VERCEL_ENV,
    git: {
      sha: GIT_SHA.slice(0, 8),
      branch: GIT_BRANCH,
    },
    timestamp: new Date().toISOString(),
    quick_status: {
      incidents_total: quickStatus.incidents_total,
      incidents_covered: quickStatus.incidents_covered,
      guards_added: quickStatus.guards_added,
      tests_added: quickStatus.tests_added,
    },
    note: 'Use ?full=true to run soak tests and get complete gatef.json',
  })
}
