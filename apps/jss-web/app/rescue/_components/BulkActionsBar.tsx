/**
 * Bulk Actions Bar
 *
 * Sticky bottom bar for bulk photo operations:
 * - Assign to suggested job
 * - Create new job
 * - Mark as jobsite
 * - Mark as personal
 */

export function BulkActionsBar({
  selectedCount,
  onAssignToSuggestedJob,
  onCreateNewJob,
  onMarkPersonal,
  onMarkJobsite,
}: {
  selectedCount: number
  onAssignToSuggestedJob: () => void
  onCreateNewJob: () => void
  onMarkPersonal: () => void
  onMarkJobsite: () => void
}) {
  const disabled = selectedCount === 0

  return (
    <footer className="sticky bottom-0 mt-5 bg-white pt-4">
      <div className="border-t border-gray-100 pt-4">
        <div className="mb-3 text-xs text-gray-500">
          Selected:{' '}
          <span className="font-semibold text-gray-900">{selectedCount}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={onAssignToSuggestedJob}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              disabled
                ? 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400'
                : 'border-gray-900 bg-gray-900 text-white hover:bg-black'
            }`}
          >
            Assign to suggested job
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onCreateNewJob}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              disabled
                ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            Create new job
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onMarkJobsite}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              disabled
                ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            Mark as jobsite
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onMarkPersonal}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              disabled
                ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            Mark as personal
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">
          Suggestions only. Nothing moves until you confirm.
        </p>
      </div>
    </footer>
  )
}
