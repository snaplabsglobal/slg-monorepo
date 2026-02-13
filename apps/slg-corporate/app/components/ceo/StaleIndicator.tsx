'use client'

/**
 * StaleIndicator - Data freshness badge
 * PR-2: Read-Only Display
 *
 * fresh: < 12h (no indicator)
 * stale: 12-48h (yellow warning)
 * critical_stale: > 48h (red critical)
 */

import { cn } from '@/utils/cn'
import type { StaleStatus } from '@/lib/ceo/types'
import { formatTimeSince } from '@/lib/ceo/stale'

interface StaleIndicatorProps {
  status: StaleStatus
  generatedAt: string | null
  showTime?: boolean
}

export function StaleIndicator({
  status,
  generatedAt,
  showTime = true,
}: StaleIndicatorProps) {
  if (status === 'fresh') {
    return showTime ? (
      <span className="text-xs text-gray-500">
        {formatTimeSince(generatedAt)}
      </span>
    ) : null
  }

  const badgeClasses = {
    stale: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical_stale: 'bg-red-100 text-red-800 border-red-200',
  }

  const labels = {
    stale: 'STALE',
    critical_stale: 'CRITICAL',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border',
        badgeClasses[status]
      )}
    >
      {labels[status]}
      {showTime && (
        <span className="opacity-75">({formatTimeSince(generatedAt)})</span>
      )}
    </span>
  )
}
