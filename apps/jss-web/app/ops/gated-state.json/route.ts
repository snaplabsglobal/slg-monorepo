/**
 * SEOS GateD State API
 * Route: /ops/gated-state.json
 *
 * Tracks consecutive failures and lock state for DEV environment.
 * Used by CEO Dashboard to determine environment status.
 *
 * Lock Protocol:
 * - consecutive_failures >= 3 → locked = true
 * - GateD PASS → consecutive_failures = 0, locked = false
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory state (in production, this should be persisted to a database or KV store)
// For now, we'll read from smoke-status and compute the state
async function computeGatedState(): Promise<{
  env: string
  consecutive_failures: number
  locked: boolean
  last_failure_class: string | null
  last_check: string
  unlock_condition: string | null
}> {
  const env = process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev'

  // Fetch current smoke status
  const baseUrl = env === 'prod'
    ? 'https://jobsitesnap.com'
    : 'https://dev.jobsitesnap.com'

  try {
    const response = await fetch(`${baseUrl}/ops/smoke-status.json`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'SEOS-GateD-State/1.0' }
    })

    if (!response.ok) {
      // smoke-status.json not accessible - this is a failure
      return {
        env,
        consecutive_failures: 1,
        locked: false,
        last_failure_class: 'SMOKE_STATUS_UNAVAILABLE',
        last_check: new Date().toISOString(),
        unlock_condition: 'GateD must PASS'
      }
    }

    const smokeStatus = await response.json()
    const envStatus = smokeStatus.environments?.find((e: { env: string }) => e.env === env)

    if (!envStatus) {
      return {
        env,
        consecutive_failures: 1,
        locked: false,
        last_failure_class: 'ENV_NOT_FOUND',
        last_check: new Date().toISOString(),
        unlock_condition: 'GateD must PASS'
      }
    }

    const isPass = envStatus.overall === 'pass'

    // For now, we don't persist consecutive_failures across requests
    // In a real implementation, this would be stored in a database
    // Here we return the current state based on the latest check
    if (isPass) {
      return {
        env,
        consecutive_failures: 0,
        locked: false,
        last_failure_class: null,
        last_check: smokeStatus.generated_at,
        unlock_condition: null
      }
    } else {
      const failedCheck = envStatus.checks?.find((c: { result: { status: string } }) => c.result.status === 'fail')
      return {
        env,
        consecutive_failures: 1, // Would increment in persistent storage
        locked: false, // Would be true if consecutive_failures >= 3
        last_failure_class: failedCheck?.result?.fail_class || 'UNKNOWN',
        last_check: smokeStatus.generated_at,
        unlock_condition: 'GateD must PASS'
      }
    }
  } catch (error) {
    return {
      env,
      consecutive_failures: 1,
      locked: false,
      last_failure_class: 'FETCH_ERROR',
      last_check: new Date().toISOString(),
      unlock_condition: 'GateD must PASS'
    }
  }
}

export async function GET() {
  const state = await computeGatedState()

  return NextResponse.json({
    schema: 'seos.gated-state.v0.1',
    ...state,
    rules: {
      lock_threshold: 3,
      lock_scope: 'DEV only (MVP phase)',
      allowed_when_locked: ['fix:*', 'repair:*', 'fix:gated'],
      blocked_when_locked: ['feat:*', 'refactor (non-fix)']
    }
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-SEOS-Locked': state.locked ? 'true' : 'false'
    }
  })
}
