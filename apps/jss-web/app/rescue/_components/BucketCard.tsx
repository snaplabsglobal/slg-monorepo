/**
 * Bucket Card
 *
 * Shows a "missing data" bucket to explain where photos went:
 * - Unknown location (missing GPS)
 * - Address unresolved (GPS but geocode failed)
 * - Low accuracy location
 * - Likely personal (filtered)
 * - Unsure (needs review)
 *
 * These buckets are the "防胡扯护栏" - they explain
 * why only 3 job suggestions exist out of 1000+ photos.
 */

type BucketType =
  | 'unknownLocation'
  | 'geocodeFailed'
  | 'lowAccuracy'
  | 'likelyPersonal'
  | 'unsure'

const bucketCopy: Record<
  BucketType,
  {
    title: string
    subtitle: (count: number) => string
    cta: string
  }
> = {
  unknownLocation: {
    title: 'Unknown location',
    subtitle: (c) => `${c.toLocaleString()} photos · Missing GPS`,
    cta: 'Review',
  },
  geocodeFailed: {
    title: 'Address unresolved',
    subtitle: (c) =>
      `${c.toLocaleString()} photos · GPS available, address lookup failed`,
    cta: 'Review',
  },
  lowAccuracy: {
    title: 'Low accuracy location',
    subtitle: (c) => `${c.toLocaleString()} photos · Location accuracy is low`,
    cta: 'Review',
  },
  likelyPersonal: {
    title: 'Likely personal',
    subtitle: (c) => `${c.toLocaleString()} photos · Hidden by filter`,
    cta: 'View',
  },
  unsure: {
    title: 'Unsure',
    subtitle: (c) => `${c.toLocaleString()} photos · Needs quick review`,
    cta: 'Review',
  },
}

export function BucketCard({
  type,
  count,
  onOpen,
  secondaryAction,
}: {
  type: BucketType
  count: number
  onOpen: () => void
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}) {
  const copy = bucketCopy[type]
  if (count <= 0) return null

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4">
      <div className="text-base font-bold text-gray-900">{copy.title}</div>
      <div className="mt-1 text-sm text-gray-500">{copy.subtitle(count)}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
        >
          {copy.cta}
        </button>

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
