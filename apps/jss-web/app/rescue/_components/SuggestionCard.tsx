/**
 * Job Suggestion Card
 *
 * Shows a single job suggestion with:
 * - Display name (editable via rename)
 * - Photo count (exact, no ≈ symbol)
 * - Date range
 * - Based on / Confidence badges
 * - Sampled badge if applicable
 * - Actions: Confirm, Rename, Skip
 */

import type { JobSuggestion } from '../_mock/rescue.types'

function formatDateRange(minISO?: string, maxISO?: string): string {
  if (!minISO || !maxISO) return '—'
  const min = new Date(minISO)
  const max = new Date(maxISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  return `${fmt(min)} – ${fmt(max)}`
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
      {text}
    </span>
  )
}

export function SuggestionCard({
  suggestion,
  selected,
  onToggleSelect,
  onRename,
  onSkip,
}: {
  suggestion: JobSuggestion
  selected: boolean
  onToggleSelect: () => void
  onRename: () => void
  onSkip?: () => void
}) {
  const s = suggestion
  const rangeText = formatDateRange(s.dateRange?.min, s.dateRange?.max)

  // Key: if sampled, must show it clearly
  const countLine = s.isSampled
    ? `${(s.sampleSize ?? s.photoCount).toLocaleString()} sample photos (out of ${s.trueTotal?.toLocaleString() ?? '—'})`
    : `${s.photoCount.toLocaleString()} photos`

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        selected ? 'border-gray-900' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-bold text-gray-900">{s.displayName}</div>
        {selected && <Badge text="Selected" />}
      </div>

      <div className="mt-2 text-sm text-gray-500">
        <span className="font-semibold text-gray-900">{countLine}</span> ·{' '}
        {rangeText}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge text={`Based on: ${s.basedOn}`} />
        <Badge text={`Confidence: ${s.confidence}`} />
        {s.isSampled && <Badge text="Sampled" />}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            selected
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
          }`}
        >
          {selected ? 'Confirmed' : 'Confirm as one job'}
        </button>

        <button
          type="button"
          onClick={onRename}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
        >
          Rename
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
