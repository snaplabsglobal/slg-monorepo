'use client'

import { useEffect, useState, useCallback } from 'react'

interface SEOSMetrics {
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

interface MetricsResponse {
  metrics: SEOSMetrics | null
  error?: string
  timestamp: string
}

const TrendArrow = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <span className="text-green-500 ml-1">↑</span>
  if (trend === 'down') return <span className="text-red-500 ml-1">↓</span>
  return <span className="text-gray-400 ml-1">→</span>
}

const StatusDot = ({ color }: { color: 'red' | 'yellow' | 'green' }) => {
  const colorClass = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  }[color]

  return <span className={`inline-block w-2 h-2 rounded-full ${colorClass} mr-2`} />
}

export function SEOSRadar() {
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/seos/metrics', { cache: 'no-store' })
      const json = await response.json()
      setData(json)
    } catch {
      setData({ metrics: null, error: 'Failed to fetch', timestamp: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEOS Evolution Radar</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data?.metrics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEOS Evolution Radar</h3>
        <p className="text-sm text-red-500">{data?.error || 'Unable to load metrics'}</p>
      </div>
    )
  }

  const m = data.metrics

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SEOS Evolution Radar</h3>
        <span className="text-xs text-gray-400">Read-only</span>
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {/* Level */}
          <tr>
            <td className="py-3 text-gray-600">Level</td>
            <td className="py-3 text-right font-medium">
              <span className={m.level.floorLockActive ? 'text-yellow-600' : 'text-gray-900'}>
                {m.level.current}/{m.level.max}
              </span>
              <TrendArrow trend={m.level.trend} />
              {m.level.floorLockActive && (
                <span className="ml-2 text-xs text-yellow-600" title={m.level.floorLockReason || ''}>
                  🔒
                </span>
              )}
            </td>
          </tr>

          {/* Coverage */}
          <tr>
            <td className="py-3 text-gray-600">Coverage</td>
            <td className="py-3 text-right font-medium">
              <span className={m.coverage.percentage >= 80 ? 'text-green-600' : m.coverage.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                {m.coverage.percentage}%
              </span>
              <span className="text-gray-400 text-xs ml-1">
                ({m.coverage.guarded}/{m.coverage.total})
              </span>
              <TrendArrow trend={m.coverage.trend} />
            </td>
          </tr>

          {/* Intervention Budget */}
          <tr>
            <td className="py-3 text-gray-600">Intervention Budget</td>
            <td className="py-3 text-right font-medium">
              <span className={m.interventionBudget.compliant ? 'text-green-600' : 'text-red-600'}>
                {m.interventionBudget.remaining}/{m.interventionBudget.total}
              </span>
              <span className="text-gray-400 text-xs ml-1">remaining</span>
              <TrendArrow trend={m.interventionBudget.trend} />
            </td>
          </tr>

          {/* ESI */}
          <tr>
            <td className="py-3 text-gray-600">ESI</td>
            <td className="py-3 text-right font-medium">
              <StatusDot color={m.esi.color} />
              <span className={
                m.esi.color === 'green' ? 'text-green-600' :
                m.esi.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }>
                {m.esi.value}%
              </span>
              <span className="text-gray-400 text-xs ml-1">{m.esi.status}</span>
              <TrendArrow trend={m.esi.trend} />
            </td>
          </tr>

          {/* Domain Health */}
          <tr>
            <td className="py-3 text-gray-600">Domain Health</td>
            <td className="py-3 text-right font-medium">
              <span className={m.domainHealth.healthy === m.domainHealth.total ? 'text-green-600' : 'text-yellow-600'}>
                {m.domainHealth.healthy}/{m.domainHealth.total}
              </span>
              <span className="text-gray-400 text-xs ml-1">healthy</span>
              <TrendArrow trend={m.domainHealth.trend} />
            </td>
          </tr>

          {/* Guard Aging */}
          <tr>
            <td className="py-3 text-gray-600">Guard Aging</td>
            <td className="py-3 text-right font-medium">
              <span className={m.guardAging.stale === 0 ? 'text-green-600' : 'text-yellow-600'}>
                {m.guardAging.active} active
              </span>
              {m.guardAging.stale > 0 && (
                <span className="text-yellow-600 text-xs ml-1">
                  ({m.guardAging.stale} stale)
                </span>
              )}
              <TrendArrow trend={m.guardAging.trend} />
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-right">
          Source: JSS proof-pack
        </p>
      </div>
    </div>
  )
}
