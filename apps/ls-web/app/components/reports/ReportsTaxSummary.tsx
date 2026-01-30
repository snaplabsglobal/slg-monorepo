'use client'

import { useEffect, useState } from 'react'
import { TaxSummary } from '@/app/components/dashboard/TaxSummary'

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function ReportsTaxSummary() {
  const [stats, setStats] = useState<{
    totalGST: number
    totalPST: number
    avgConfidence?: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const month = currentMonthKey()
    fetch(`/api/accountant/stats?month=${month}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) {
          setStats(data)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <TaxSummary
      gst={stats ? stats.totalGST / 100 : 0}
      pst={stats ? stats.totalPST / 100 : 0}
      confidence={stats?.avgConfidence}
      loading={loading}
    />
  )
}
