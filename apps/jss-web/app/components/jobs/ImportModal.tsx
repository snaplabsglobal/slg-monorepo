'use client'

import { useState, useCallback } from 'react'
import { X, Loader2, Upload, Check, AlertCircle } from 'lucide-react'

/**
 * Magic Import Modal
 *
 * Steps:
 * 1. TimeRangeStep - Select Last 30 days or Last 12 months
 * 2. PreviewStep - Show candidate photos with checkboxes
 * 3. ImportingStep - Loading during confirm
 * 4. Success - Toast and close
 */

type TimeRange = '30d' | '12m'

type PhotoCandidate = {
  id: string
  thumbnail_url: string
  taken_at: string
}

type Step = 'range' | 'loading' | 'preview' | 'importing' | 'success' | 'empty'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  job: {
    id: string
    name: string
    address?: string | null
    geofence_lat?: number | null
    geofence_lng?: number | null
  }
  onImported: () => void
}

export function ImportModal({ isOpen, onClose, job, onImported }: ImportModalProps) {
  const [step, setStep] = useState<Step>('range')
  const [range, setRange] = useState<TimeRange | null>(null)
  const [photos, setPhotos] = useState<PhotoCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    setStep('range')
    setRange(null)
    setPhotos([])
    setSelectedIds(new Set())
    setImportedCount(0)
    setError(null)
    onClose()
  }, [onClose])

  // Fetch preview
  const handleContinue = useCallback(async () => {
    if (!range) return

    setStep('loading')
    setError(null)

    try {
      const res = await fetch(`/api/jobs/${job.id}/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to find photos')
        setStep('range')
        return
      }

      if (data.count === 0) {
        setStep('empty')
        return
      }

      setPhotos(data.photos)
      setSelectedIds(new Set(data.photos.map((p: PhotoCandidate) => p.id)))
      setStep('preview')
    } catch (err) {
      console.error('Preview error:', err)
      setError('Failed to find photos. Please try again.')
      setStep('range')
    }
  }, [range, job.id])

  // Toggle photo selection
  const togglePhoto = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select/deselect all
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(photos.map((p) => p.id)))
  }, [photos])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Confirm import
  const handleImport = useCallback(async () => {
    if (selectedIds.size === 0) return

    setStep('importing')
    setError(null)

    try {
      const res = await fetch(`/api/jobs/${job.id}/import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: Array.from(selectedIds) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to import photos')
        setStep('preview')
        return
      }

      setImportedCount(data.imported_count)
      setStep('success')

      // Auto close after 2 seconds
      setTimeout(() => {
        onImported()
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import photos. Please try again.')
      setStep('preview')
    }
  }, [selectedIds, job.id, onImported, handleClose])

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'success' ? 'Import complete' : `Import photos to ${job.name}`}
            </h2>
            {step === 'range' && (
              <p className="text-sm text-gray-500 mt-0.5">
                Bring existing photos into this job.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg -mr-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step: Time Range Selection */}
          {step === 'range' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Choose a time range
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="range"
                      checked={range === '30d'}
                      onChange={() => setRange('30d')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-900">Last 30 days</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="range"
                      checked={range === '12m'}
                      onChange={() => setRange('12m')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-900">Last 12 months</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                We'll only look at photos taken within this time range.
              </p>
            </div>
          )}

          {/* Step: Loading */}
          {step === 'loading' && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Finding photos near this job...</p>
            </div>
          )}

          {/* Step: Empty */}
          {step === 'empty' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No photos found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                We couldn't find any photos near this job within the selected time range.
              </p>
              <button
                onClick={() => setStep('range')}
                className="mt-6 px-4 py-2 text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                Change time range
              </button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  We found <span className="font-semibold">{photos.length}</span> photos taken near {job.name}.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-amber-600 hover:text-amber-700"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-500 hover:text-gray-600"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => togglePhoto(photo.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedIds.has(photo.id)
                        ? 'border-amber-500'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={photo.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Checkbox overlay */}
                    <div
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedIds.has(photo.id)
                          ? 'bg-amber-500'
                          : 'bg-white/80 border border-gray-300'
                      }`}
                    >
                      {selectedIds.has(photo.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    {/* Date label */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <p className="text-[10px] text-white">
                        {formatDate(photo.taken_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500">
                All photos are selected by default. Uncheck any you don't want to import.
              </p>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">
                Adding {selectedIds.size} photos to {job.name}...
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-green-800">
                {importedCount} photos imported to {job.name}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                You can find them in the job timeline.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'range' || step === 'preview') && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            {step === 'range' && (
              <button
                onClick={handleContinue}
                disabled={!range}
                className="w-full py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0}
                className="w-full py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
