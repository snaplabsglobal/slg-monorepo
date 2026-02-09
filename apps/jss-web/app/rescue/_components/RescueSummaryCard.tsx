/**
 * Rescue Summary Card
 *
 * Shows coverage stats to prevent "瞎编" scenarios:
 * - Photos scanned
 * - Likely jobsite
 * - With date / With GPS / Address resolved ratios
 * - Date range with missing count
 * - Analysis state (not "100% complete")
 */

import type { RescueSummary } from '../_mock/rescue.types'

function formatMonthRange(minISO?: string, maxISO?: string): string {
  if (!minISO || !maxISO) return '—'
  const min = new Date(minISO)
  const max = new Date(maxISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    })
  return `${fmt(min)} – ${fmt(max)}`
}

function RatioLine({
  label,
  a,
  b,
}: {
  label: string
  a: number
  b: number
}) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900">
        <span className="font-semibold">{a.toLocaleString()}</span> / {b.toLocaleString()}
      </div>
    </div>
  )
}

export function RescueSummaryCard({ data }: { data: RescueSummary }) {
  const dateRangeText = formatMonthRange(
    data.takenAtRange?.min,
    data.takenAtRange?.max
  )

  const analysisText =
    data.analysisState === 'none'
      ? 'Scan complete'
      : data.analysisState === 'complete'
        ? 'Analysis complete'
        : `Scan complete · Analysis: ${data.analysisCoverage?.done ?? 0}/${data.analysisCoverage?.total ?? data.totalPhotos} (continues in background)`

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 font-semibold text-gray-900">
        <span className="text-green-600">✓</span>
        {analysisText}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <div className="text-gray-500">Photos scanned</div>
          <div className="font-semibold text-gray-900">
            {data.totalPhotos.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <div className="text-gray-500">Likely jobsite</div>
          <div className="font-semibold text-gray-900">
            {data.likelyJobsite.toLocaleString()}
          </div>
        </div>

        <RatioLine label="With date" a={data.withTakenAt} b={data.totalPhotos} />
        <RatioLine label="With GPS" a={data.withGps} b={data.totalPhotos} />
        <RatioLine
          label="Address resolved"
          a={data.addressResolved}
          b={data.withGps}
        />
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
        <div className="text-gray-500">
          Date range (photo time):{' '}
          <span className="font-semibold text-gray-900">{dateRangeText}</span>
        </div>

        {data.missingTakenAt > 0 && (
          <div className="mt-1 text-gray-400">
            {data.missingTakenAt.toLocaleString()} photos missing photo time
            (using upload time)
          </div>
        )}

        {!!data.addressLookupFailed && data.addressLookupFailed > 0 && (
          <div className="mt-1 text-gray-400">
            {data.addressLookupFailed.toLocaleString()} photos have GPS but
            address lookup failed
          </div>
        )}
      </div>
    </section>
  )
}
