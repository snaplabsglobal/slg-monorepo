/**
 * Rescue Footer Bar
 *
 * Bottom action bar for rescue mode:
 * - Shows selected count
 * - Apply selected jobs (hidden in stateless mode)
 * - Apply nothing option
 *
 * Stateless mode behavior:
 * - Hide "Apply X jobs" button (no batch apply)
 * - Show only "Skip all" or continue options
 * - Changes apply immediately per-job when confirmed
 */

export function RescueFooterBar({
  selectedCount,
  onApplySelected,
  onApplyNothing,
  stateless = false,
}: {
  selectedCount: number
  onApplySelected: () => void
  onApplyNothing: () => void
  stateless?: boolean
}) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onApplyNothing}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          {stateless ? 'Exit' : 'Skip all'}
        </button>

        {/* In stateless mode, don't show batch Apply button */}
        {!stateless && (
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
        )}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        {stateless
          ? 'Limited mode: Changes apply immediately when you confirm each job.'
          : "Nothing has been changed yet. You're in full control."}
      </p>
    </div>
  )
}
