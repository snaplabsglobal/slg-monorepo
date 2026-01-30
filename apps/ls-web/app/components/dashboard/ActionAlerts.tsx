'use client'

import Link from 'next/link'

export type AlertType = 'error' | 'warning' | 'info'

export interface ActionAlert {
  id: string
  type: AlertType
  icon: string
  message: string
  description: string
  actionLabel: string
  href: string
}

interface ActionAlertsProps {
  alerts: ActionAlert[]
}

const typeStyles: Record<AlertType, string> = {
  error: 'bg-red-50 border-red-500 text-red-900',
  warning: 'bg-amber-50 border-amber-500 text-amber-900',
  info: 'bg-blue-50 border-blue-500 text-blue-900',
}

export function ActionAlerts({ alerts }: ActionAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-xl border-l-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${typeStyles[alert.type]}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{alert.icon}</span>
            <div>
              <p className="font-semibold">{alert.message}</p>
              <p className="text-sm opacity-90 mt-0.5">{alert.description}</p>
            </div>
          </div>
          <Link
            href={alert.href}
            prefetch={false}
            className="shrink-0 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-800 transition-colors"
          >
            {alert.actionLabel}
          </Link>
        </div>
      ))}
    </div>
  )
}
