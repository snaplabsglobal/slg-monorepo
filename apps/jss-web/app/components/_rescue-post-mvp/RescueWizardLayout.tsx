'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'

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

  // Custom header for rescue mode
  const header = (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="text-xs text-gray-500">Self-Rescue Mode</div>
        <div className="text-sm font-semibold text-gray-900">
          Rescue your photos
        </div>
      </div>
      <button
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        onClick={() => {
          const ok = confirm(
            'Exit Self-Rescue Mode? Your progress will be kept on this device.'
          )
          if (ok) router.push('/dashboard')
        }}
      >
        Exit
      </button>
    </div>
  )

  return (
    <DashboardLayout header={header}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress indicator */}
        {step > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="text-sm text-gray-500">{step} / 5</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main content card */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-4">
            Suggestions only. Nothing changes unless you confirm.
          </div>
          {children}
        </div>
      </div>
    </DashboardLayout>
  )
}
