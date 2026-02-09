/**
 * Review Header Component
 *
 * Shows title, subtitle, count, and selection state for review pages
 */

export function ReviewHeader({
  title,
  subtitle,
  count,
  selectedCount,
  onBack,
}: {
  title: string
  subtitle: string
  count: number
  selectedCount: number
  onBack: () => void
}) {
  return (
    <header className="mb-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50"
      >
        ← Back
      </button>

      <h1 className="mt-3 text-2xl font-black text-gray-900">
        {title}{' '}
        <span className="font-bold text-gray-500">({count.toLocaleString()})</span>
      </h1>

      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>

      <div className="mt-3 text-xs text-gray-500">
        Selected: <span className="font-semibold text-gray-900">{selectedCount}</span>
      </div>
    </header>
  )
}
