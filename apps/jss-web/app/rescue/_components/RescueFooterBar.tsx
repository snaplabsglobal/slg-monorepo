/**
 * Rescue Footer Bar
 *
 * Bottom action bar for rescue mode:
 * - Shows selected count
 * - Apply selected jobs
 * - Apply nothing option
 */

export function RescueFooterBar({
  selectedCount,
  onApplySelected,
  onApplyNothing,
}: {
  selectedCount: number
  onApplySelected: () => void
  onApplyNothing: () => void
}) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onApplyNothing}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Skip all
        </button>

        <button
          type="button"
          onClick={onApplySelected}
          disabled={selectedCount === 0}
          className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-colors ${
            selectedCount > 0
              ? 'bg-gray-900 text-white hover:bg-black'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {selectedCount > 0
            ? `Apply ${selectedCount} job${selectedCount > 1 ? 's' : ''}`
            : 'Select jobs to apply'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Nothing has been changed yet. You&apos;re in full control.
      </p>
    </div>
  )
}
