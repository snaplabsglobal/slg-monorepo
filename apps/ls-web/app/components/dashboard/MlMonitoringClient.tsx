'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  correctionsCount: number
  recentCorrections: Array<{
    id: string
    transactionId: string | null
    correctionFields: string[]
    createdAt: string
  }>
  datePatterns: Array<{
    vendorName: string
    correctionCount: number
    isDefaultRule: boolean
    lastUpdated: string | null
  }>
  fieldPatterns: Array<{
    vendorName: string
    fieldName: string
    correctionCount: number
    isActive: boolean
    lastUpdated: string | null
  }>
}

export function MlMonitoringClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ml/stats')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading ML stats…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const s = stats!

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Learning</h1>
        <p className="text-sm text-gray-600 mt-1">
          User-driven learning: corrections and learned patterns (no hardcoded rules).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500">Total corrections</h2>
          <p className="text-3xl font-bold text-gray-900 mt-1">{s.correctionsCount}</p>
          <p className="text-xs text-gray-400 mt-1">All field edits recorded</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500">Date patterns</h2>
          <p className="text-3xl font-bold text-gray-900 mt-1">{s.datePatterns.length}</p>
          <p className="text-xs text-gray-400 mt-1">Vendors with learned date rules</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500">Field patterns</h2>
          <p className="text-3xl font-bold text-gray-900 mt-1">{s.fieldPatterns.length}</p>
          <p className="text-xs text-gray-400 mt-1">Vendor × field (10+ = active)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent corrections</h2>
          {s.recentCorrections.length === 0 ? (
            <p className="text-sm text-gray-500">No corrections yet.</p>
          ) : (
            <ul className="space-y-2">
              {s.recentCorrections.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {r.correctionFields.join(', ')}
                    {r.transactionId && (
                      <>
                        {' · '}
                        <Link
                          href={`/transactions?detail=${r.transactionId}`}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      </>
                    )}
                  </span>
                  <span className="text-gray-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date patterns (by vendor)</h2>
          {s.datePatterns.length === 0 ? (
            <p className="text-sm text-gray-500">No date patterns yet. Correct dates to learn.</p>
          ) : (
            <ul className="space-y-2">
              {s.datePatterns.slice(0, 10).map((p) => (
                <li key={p.vendorName} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{p.vendorName}</span>
                  <span className="text-gray-500">
                    {p.correctionCount}×
                    {p.isDefaultRule && (
                      <span className="ml-2 rounded bg-green-100 text-green-800 px-1.5 text-xs">
                        active
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {s.fieldPatterns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Field patterns (vendor × field)</h2>
          <ul className="space-y-2">
            {s.fieldPatterns.slice(0, 15).map((p) => (
              <li
                key={`${p.vendorName}-${p.fieldName}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {p.vendorName} · <span className="text-gray-500">{p.fieldName}</span>
                </span>
                <span className="text-gray-500">
                  {p.correctionCount}×
                  {p.isActive && (
                    <span className="ml-2 rounded bg-green-100 text-green-800 px-1.5 text-xs">
                      active
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Rules auto-activate at 10 corrections. Learned rules are applied during receipt analysis
        (e.g. date format). See{' '}
        <Link href="/settings" className="text-blue-600 hover:underline">
          Settings
        </Link>{' '}
        for more.
      </p>
    </div>
  )
}
