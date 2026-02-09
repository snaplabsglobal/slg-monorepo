'use client'

/**
 * Rescue Setup Page
 * Route: /rescue/setup
 *
 * Step 1: User selects scan scope
 * - Default: Unassigned photos (recommended)
 * - Advanced: All photos, Photos without location, Date range
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ChevronDown, ChevronRight } from 'lucide-react'

type ScanScope = 'unassigned' | 'all' | 'no_location' | 'date_range'

export default function RescueSetupPage() {
  const router = useRouter()
  const [scope, setScope] = useState<ScanScope>('unassigned')
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleContinue() {
    router.push(`/rescue/preview?scope=${scope}`)
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Rescue your photo library
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Fix photos that need attention. Nothing will change unless you
          confirm.
        </p>
      </div>

      {/* Scan Scope */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">
          What would you like to scan?
        </h2>

        {/* Default option (recommended) */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
            scope === 'unassigned'
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="scope"
            value="unassigned"
            checked={scope === 'unassigned'}
            onChange={(e) => setScope(e.target.value as ScanScope)}
            className="mt-1 accent-amber-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              Unassigned photos{' '}
              <span className="text-sm font-normal text-amber-600">
                (recommended)
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Photos that are not linked to any job yet
            </div>
          </div>
        </label>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced options
        </button>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="space-y-3 pl-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                scope === 'all'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === 'all'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1 accent-amber-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">All photos</div>
                <div className="mt-1 text-sm text-gray-600">
                  Scan all photos, including ones already in jobs
                </div>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                scope === 'no_location'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="no_location"
                checked={scope === 'no_location'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1 accent-amber-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  Photos without location
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Useful for fixing missing addresses
                </div>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                scope === 'date_range'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="date_range"
                checked={scope === 'date_range'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1 accent-amber-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Date range</div>
                <div className="mt-1 text-sm text-gray-600">
                  Pick a specific time period
                </div>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => router.push('/organizer')}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </main>
  )
}
