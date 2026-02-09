/**
 * Photo Tile Component
 *
 * Single photo card showing:
 * - Thumbnail image
 * - Taken at date
 * - Reason tags (why it was classified this way)
 * - Optional jobsite score
 * - Selection state
 */

/* eslint-disable @next/next/no-img-element */

export function PhotoTile({
  id,
  thumbUrl,
  selected,
  takenAtLabel,
  reasonTags,
  scoreLabel,
  onToggle,
}: {
  id: string
  thumbUrl: string
  selected: boolean
  takenAtLabel: string
  reasonTags: string[]
  scoreLabel?: string
  onToggle: () => void
}) {
  const tags = reasonTags.slice(0, 2)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-xl border p-2 text-left transition-colors ${
        selected ? 'border-gray-900' : 'border-gray-200'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        <img
          src={thumbUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      {/* Date + Score */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">{takenAtLabel}</div>
        {scoreLabel && (
          <div className="text-[11px] text-gray-500">{scoreLabel}</div>
        )}
      </div>

      {/* Reason Tags - Key: tells user why photo was classified */}
      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
