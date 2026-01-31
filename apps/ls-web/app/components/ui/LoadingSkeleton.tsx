'use client';

export function ReceiptCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

/** Gray pulsing placeholder for status badge while receipt data is loading */
export function StatusBadgeSkeleton() {
  return (
    <div className="inline-flex items-center gap-2" aria-hidden>
      <span className="inline-flex h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
    </div>
  )
}

/** Receipt detail skeleton: stable screen while data loads, prevents unmount flicker */
export function ReceiptDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-6 bg-gray-200 rounded w-2/3" />
      <div className="grid gap-3">
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
