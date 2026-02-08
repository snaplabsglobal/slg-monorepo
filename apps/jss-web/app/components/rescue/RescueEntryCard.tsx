'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function RescueEntryCard() {
  const router = useRouter()

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Rescue your photo library</div>
          <div className="mt-1 text-sm text-gray-600">
            Organize past photos by location & time.
            <span className="ml-2 text-gray-500">
              Nothing changes unless you confirm.
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="rounded-full border px-2 py-1">
              Offline-friendly
            </span>
            <span className="rounded-full border px-2 py-1">
              No silent changes
            </span>
            <span className="rounded-full border px-2 py-1">Undo available</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
            onClick={() => router.push('/rescue/new')}
          >
            Start Rescue
          </button>

          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              alert(
                [
                  'How Self-Rescue works:',
                  '1) Scan metadata (time & location)',
                  '2) Suggest building-level groups + work sessions',
                  '3) You assign / fix mixed sessions',
                  '4) Confirm to apply (undo available)',
                ].join('\n')
              )
            }}
          >
            Learn how
          </button>
        </div>
      </div>
    </div>
  )
}
