'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'

function stepFromPath(path: string) {
  if (path.endsWith('/rescue/new')) return 1
  if (path.endsWith('/rescue/scan')) return 2
  if (path.endsWith('/rescue/buckets')) return 3
  if (path.includes('/rescue/buckets/')) return 4
  if (path.endsWith('/rescue/confirm')) return 5
  return 0
}

export default function RescueWizardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const step = stepFromPath(pathname)

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Self-Rescue Mode</div>
            <div className="text-lg font-semibold">
              Rescue your photo library
            </div>
          </div>

          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              const ok = confirm(
                'Exit Self-Rescue Mode? Your progress will be kept on this device.'
              )
              if (ok) router.push('/')
            }}
          >
            Exit
          </button>
        </div>

        {step > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="text-sm text-gray-500">{step} / 5</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-gray-900 transition-all"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500">
            Suggestions only. Nothing changes unless you confirm.
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
