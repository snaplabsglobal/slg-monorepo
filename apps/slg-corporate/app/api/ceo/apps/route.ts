/**
 * CEO Control Tower API - App Aggregation
 * PR-2: Read-Only Display
 *
 * GET /api/ceo/apps
 * Returns aggregated proof-pack status from all registered apps
 */

import { NextResponse } from 'next/server'
import {
  CEO_APPS,
  fetchAppIndex,
  buildAppCard,
  type AppCard,
  type CEOAppsResponse,
} from '@/lib/ceo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const timestamp = new Date().toISOString()

  // Fetch all apps in parallel with Promise.allSettled (no single failure blocks others)
  const fetchPromises = CEO_APPS.map(async (app) => {
    const result = await fetchAppIndex(app)
    return buildAppCard(app, result)
  })

  const results = await Promise.allSettled(fetchPromises)

  // Extract successful results
  const apps: AppCard[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    // If promise itself rejected (shouldn't happen with our error handling)
    return buildAppCard(CEO_APPS[index], {
      ok: false,
      reason: 'index_unreachable',
      index: null,
    })
  })

  // Calculate summary
  const summary = {
    total: apps.length,
    healthy: apps.filter((a) => a.ok && a.business_pass).length,
    failing: apps.filter((a) => a.ok && !a.business_pass).length,
    unreachable: apps.filter((a) => !a.ok).length,
  }

  const response: CEOAppsResponse = {
    timestamp,
    apps,
    summary,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}
