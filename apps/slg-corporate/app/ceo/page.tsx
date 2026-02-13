/**
 * CEO Control Tower - Overview Page
 * PR-2: Read-Only Display
 *
 * Displays aggregated proof-pack status from all registered apps.
 * Auto-refreshes every 30 seconds.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { AppCard } from '@/components/ceo'
import type { CEOAppsResponse, AppCard as AppCardType } from '@/lib/ceo/types'

const REFRESH_INTERVAL_MS = 30000 // 30 seconds

export default function CEOOverviewPage() {
  const [data, setData] = useState<CEOAppsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/ceo/apps', {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json: CEOAppsResponse = await response.json()
      setData(json)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  // Summary color
  const getSummaryColor = () => {
    if (!data) return 'bg-gray-100'
    if (data.summary.unreachable > 0) return 'bg-yellow-100'
    if (data.summary.failing > 0) return 'bg-red-100'
    return 'bg-green-100'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                CEO Control Tower
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Engineering Health Dashboard
              </p>
            </div>
            <div className="text-right">
              {lastRefresh && (
                <p className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )}

        {/* Summary Bar */}
        {data && (
          <div
            className={`mb-8 p-4 rounded-lg border ${getSummaryColor()}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {data.summary.healthy}
                  </p>
                  <p className="text-xs text-gray-600">Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {data.summary.failing}
                  </p>
                  <p className="text-xs text-gray-600">Failing</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-500">
                    {data.summary.unreachable}
                  </p>
                  <p className="text-xs text-gray-600">Unreachable</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Total Apps: {data.summary.total}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* App Cards Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.apps.map((app: AppCardType) => (
              <AppCard key={app.app} app={app} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.apps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No apps registered.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-500 text-center">
            CEO Control Tower v1.0 | PR-2: Read-Only Display | Powered by SEOS
          </p>
        </div>
      </footer>
    </div>
  )
}
