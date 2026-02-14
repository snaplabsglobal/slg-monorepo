'use client'

/**
 * AppCard - App status card for CEO dashboard
 * PR-2: Read-Only Display
 */

import { cn } from '@/utils/cn'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { StatusLight } from './StatusLight'
import { StaleIndicator } from './StaleIndicator'
import type { AppCard as AppCardType } from '@/lib/ceo/types'

interface AppCardProps {
  app: AppCardType
}

export function AppCard({ app }: AppCardProps) {
  const statusText = !app.ok
    ? 'Unreachable'
    : app.business_pass
      ? 'PASS'
      : 'FAIL'

  const statusColor = !app.ok
    ? 'text-gray-500'
    : app.business_pass
      ? 'text-green-600'
      : 'text-red-600'

  const reasonLabels: Record<string, string> = {
    ok: '',
    index_unreachable: 'Cannot reach proof-pack',
    index_timeout: 'Request timed out',
    schema_invalid: 'Invalid schema',
    version_mismatch: 'Unsupported version',
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        !app.ok && 'border-gray-300 bg-gray-50',
        app.ok && !app.business_pass && 'border-red-200 bg-red-50/30',
        app.ok && app.business_pass && 'border-green-200'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusLight
              status={!app.ok ? 'unknown' : app.business_pass ? 'pass' : 'fail'}
              size="lg"
            />
            <h3 className="text-lg font-semibold">{app.label}</h3>
          </div>
          <StaleIndicator
            status={app.stale_status}
            generatedAt={app.generated_at}
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Status */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-sm font-medium', statusColor)}>
            {statusText}
          </span>
          {app.reason !== 'ok' && (
            <span className="text-xs text-gray-500">
              {reasonLabels[app.reason]}
            </span>
          )}
        </div>

        {/* P0 Summary - only show if app is reachable */}
        {app.ok && app.p0_summary && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">P0 Contracts</span>
              <span className="font-mono">
                <span className="text-green-600">{app.p0_summary.passed}</span>
                <span className="text-gray-400">/</span>
                <span>{app.p0_summary.total}</span>
              </span>
            </div>

            {/* Failed P0 contracts */}
            {app.p0_failed.length > 0 && (
              <div className="text-xs">
                <span className="text-red-600 font-medium">Failed: </span>
                <span className="text-red-500">
                  {app.p0_failed.join(', ')}
                </span>
              </div>
            )}

            {/* Missing P0 contracts */}
            {app.p0_missing.length > 0 && (
              <div className="text-xs">
                <span className="text-orange-600 font-medium">Missing: </span>
                <span className="text-orange-500">
                  {app.p0_missing.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Commit info */}
        {app.commit && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Commit:{' '}
              <code className="font-mono text-gray-600">
                {app.commit.slice(0, 7)}
              </code>
            </span>
          </div>
        )}

        {/* Link to app */}
        <div className="mt-3">
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open {app.label} &rarr;
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
