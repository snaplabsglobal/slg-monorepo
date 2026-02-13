/**
 * CEO Control Tower - Proof Pack Fetcher
 * PR-2: Schema Validation + Version Gate
 */

import type { ProofIndex, FetchReason, AppCard } from './types'
import type { AppConfig } from './config'
import {
  FETCH_TIMEOUT_MS,
  SUPPORTED_VERSION_MAJOR,
  SUPPORTED_VERSION_MINOR_MIN,
  SUPPORTED_VERSION_MINOR_MAX,
} from './config'
import { getStaleStatus } from './stale'

/**
 * Validate ProofIndex schema
 */
function validateProofIndex(data: unknown): data is ProofIndex {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  return (
    typeof obj.version === 'string' &&
    typeof obj.latest_run_id === 'string' &&
    typeof obj.latest_business_pass === 'boolean' &&
    (obj.generated_at === undefined || typeof obj.generated_at === 'string') &&
    Array.isArray(obj.runs)
  )
}

/**
 * Check if version is acceptable (major=1, minor 0-99)
 */
function isVersionAccepted(version: string): boolean {
  const match = version.match(/^(\d+)\.(\d+)/)
  if (!match) {
    return false
  }

  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10)

  return (
    major === SUPPORTED_VERSION_MAJOR &&
    minor >= SUPPORTED_VERSION_MINOR_MIN &&
    minor <= SUPPORTED_VERSION_MINOR_MAX
  )
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch and validate proof-pack index from an app
 */
export async function fetchAppIndex(
  app: AppConfig
): Promise<{ ok: boolean; reason: FetchReason; index: ProofIndex | null }> {
  try {
    const response = await fetchWithTimeout(app.proofPackUrl, FETCH_TIMEOUT_MS)

    if (!response.ok) {
      return { ok: false, reason: 'index_unreachable', index: null }
    }

    const data = await response.json()

    // Schema validation
    if (!validateProofIndex(data)) {
      return { ok: false, reason: 'schema_invalid', index: null }
    }

    // Version gate
    if (!isVersionAccepted(data.version)) {
      return { ok: false, reason: 'version_mismatch', index: null }
    }

    return { ok: true, reason: 'ok', index: data }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'index_timeout', index: null }
    }
    return { ok: false, reason: 'index_unreachable', index: null }
  }
}

/**
 * Build AppCard from fetch result
 */
export function buildAppCard(
  app: AppConfig,
  result: { ok: boolean; reason: FetchReason; index: ProofIndex | null }
): AppCard {
  const { ok, reason, index } = result

  if (!ok || !index) {
    return {
      app: app.id,
      label: app.label,
      url: app.productionUrl,
      ok: false,
      reason,
      business_pass: false,
      latest_run_id: null,
      commit: null,
      p0_summary: null,
      p0_missing: [],
      p0_failed: [],
      generated_at: null,
      stale_status: 'critical_stale',
      contracts: [],
    }
  }

  // Find latest run
  const latestRun = index.runs.find((r) => r.run_id === index.latest_run_id)

  return {
    app: app.id,
    label: app.label,
    url: app.productionUrl,
    ok: true,
    reason: 'ok',
    business_pass: index.latest_business_pass,
    latest_run_id: index.latest_run_id || null,
    commit: latestRun?.commit || null,
    p0_summary: latestRun
      ? {
          total: latestRun.p0_summary.total,
          passed: latestRun.p0_summary.passed,
          failed: latestRun.p0_summary.failed,
        }
      : null,
    p0_missing: latestRun?.p0_required_missing || [],
    p0_failed: latestRun?.p0_required_failed || [],
    generated_at: index.generated_at || null,
    stale_status: getStaleStatus(index.generated_at),
    contracts: latestRun?.contracts || [],
  }
}
