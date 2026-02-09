/**
 * Filter Chips for Rescue Mode
 *
 * Allows switching between:
 * - Likely jobsite (default)
 * - All photos
 * - Unsure
 * - Likely personal
 */

import type { RescueFilter } from '../_mock/rescue.types'

const filterOptions: Array<{
  value: RescueFilter
  label: string
}> = [
  { value: 'likely_jobsite', label: 'Likely jobsite' },
  { value: 'all', label: 'All' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'likely_personal', label: 'Likely personal' },
]

export function RescueFilterChips({
  value,
  counts,
  onChange,
}: {
  value: RescueFilter
  counts: Record<RescueFilter, number>
  onChange: (v: RescueFilter) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {filterOptions.map((opt) => {
        const isActive = value === opt.value
        const count = counts[opt.value] ?? 0

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.label}
            {count > 0 && (
              <span className="ml-1.5 opacity-70">
                ({count.toLocaleString()})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
