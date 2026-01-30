'use client'

import { STATUS_CONFIG, deriveAsyncStatus } from './status'

export function StatusBadge({
  transaction,
  showDescription = false,
}: {
  transaction: {
    status?: string | null
    needs_review?: boolean | null
    vendor_name?: string | null
    ai_confidence?: number | null
    raw_data?: any
  }
  showDescription?: boolean
}) {
  const s = deriveAsyncStatus(transaction)
  const cfg = STATUS_CONFIG[s]

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        <span aria-hidden>{cfg.icon}</span>
        {cfg.label}
      </span>
      {s === 'pending' && (
        <span
          className="inline-block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"
          aria-label="processing"
        />
      )}
      {showDescription && <span className="text-xs text-gray-500">{cfg.description}</span>}
    </div>
  )
}

