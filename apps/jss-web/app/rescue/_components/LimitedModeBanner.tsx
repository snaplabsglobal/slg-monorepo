/**
 * Limited Mode Banner
 *
 * Shown when rescue is in stateless mode (DB write failed).
 * Explains that suggestions are available but changes apply immediately.
 */

export function LimitedModeBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-amber-500">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-amber-800">Limited mode</h3>
          <p className="mt-1 text-sm text-amber-700">
            Suggestions are available, but changes will be applied immediately
            when you confirm each job.
          </p>
        </div>
      </div>
    </div>
  )
}
