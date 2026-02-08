'use client'

/**
 * Page 1: Source Picker
 * Route: /rescue/new
 *
 * User chooses where their photos are stored
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'

type SourceType = 'camera_roll' | 'folder' | 'external_drive' | 'exported'

const sourceOptions: Array<{
  id: SourceType
  title: string
  description: string
  icon: string
}> = [
  {
    id: 'camera_roll',
    title: 'Phone / Camera Roll',
    description: 'Import from your device photos',
    icon: '📱',
  },
  {
    id: 'folder',
    title: 'Folder upload',
    description: 'Select a folder from your computer',
    icon: '📁',
  },
  {
    id: 'external_drive',
    title: 'External drive / disk folder',
    description: 'USB drive or external storage',
    icon: '💾',
  },
  {
    id: 'exported',
    title: 'Exported folders',
    description: 'Previously exported project folders',
    icon: '📦',
  },
]

export default function SourcePickerPage() {
  const router = useRouter()
  const [selectedSource, setSelectedSource] = useState<SourceType | null>(null)
  const startSession = useRescueStore((s) => s.startSession)

  const handleContinue = () => {
    if (!selectedSource) return

    // Start a new rescue session
    const sessionId = `rescue_${Date.now().toString(36)}`
    startSession(sessionId, 'user') // userId will be replaced with actual user

    router.push('/rescue/scan')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Where are your photos?</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select where you want to import photos from
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sourceOptions.map((source) => (
          <button
            key={source.id}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
              selectedSource === source.id
                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                : 'hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedSource(source.id)}
          >
            <span className="text-2xl">{source.icon}</span>
            <div>
              <div className="font-medium">{source.title}</div>
              <div className="mt-0.5 text-sm text-gray-500">
                {source.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        We don't connect to other apps. You choose what to bring in.
      </p>

      <div className="flex justify-end gap-3 pt-4">
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push('/')}
        >
          Exit
        </button>
        <button
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black disabled:bg-gray-300"
          disabled={!selectedSource}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
