'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePhotos } from '@/lib/hooks'
import { PhotoViewer } from '@/components/photos/PhotoViewer'
import { ImportModal } from './ImportModal'
import { Upload } from 'lucide-react'
import type { Job, JobPhoto } from '@/lib/types'

interface PhotoTimelineProps {
  jobId: string
}

function PhotoTimeline({ jobId }: PhotoTimelineProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const {
    photos,
    isLoading,
    isValidating,
    isEmpty,
    hasMore,
    loadMore,
    removePhoto,
  } = usePhotos(jobId)

  // Group photos by date
  const groupedPhotos = photos.reduce((groups, photo) => {
    const date = new Date(photo.taken_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(photo)
    return groups
  }, {} as Record<string, JobPhoto[]>)

  return (
    <div>
      {/* Empty State */}
      {!isLoading && isEmpty && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <svg className="w-20 h-20 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No photos yet</h3>
          <p className="mt-1 text-gray-500">Capture or upload photos for this job</p>
        </div>
      )}

      {/* Photo Timeline */}
      {Object.entries(groupedPhotos).map(([date, datePhotos]) => (
        <div key={date} className="mb-6">
          <div className="sticky top-[60px] z-10 bg-gray-50 py-2">
            <h3 className="text-sm font-semibold text-gray-600 bg-gray-100 inline-block px-3 py-1 rounded-full">
              {date}
            </h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 mt-2">
            {datePhotos.map((photo) => {
              // Find global index for this photo
              const globalIndex = photos.findIndex(p => p.id === photo.id)
              return (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(globalIndex)}
                  className="aspect-square relative group overflow-hidden rounded-md bg-gray-200"
                >
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {photo.stage && (
                    <span className={`
                      absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-medium rounded
                      ${photo.stage === 'before' ? 'bg-blue-500 text-white' : ''}
                      ${photo.stage === 'during' ? 'bg-[rgb(245,158,11)] text-white' : ''}
                      ${photo.stage === 'after' ? 'bg-green-500 text-white' : ''}
                    `}>
                      {photo.stage.charAt(0).toUpperCase() + photo.stage.slice(1)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Loading State */}
      {(isLoading || isValidating) && photos.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-[rgb(245,158,11)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={isValidating}
            className="px-4 py-2 text-[rgb(245,158,11)] hover:text-amber-700 disabled:opacity-50"
          >
            {isValidating ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Photo Viewer with swipe and arrow navigation */}
      {selectedPhotoIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onDelete={async (photoId) => {
            // Call API to delete photo
            const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, {
              method: 'DELETE',
            })
            if (!res.ok) {
              throw new Error('Failed to delete photo')
            }
            // Optimistic update
            removePhoto(photoId)
          }}
        />
      )}
    </div>
  )
}

interface PhotoUploadButtonProps {
  jobId: string
  onUploaded: () => void
}

function PhotoUploadButton({ jobId, onUploaded }: PhotoUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    for (const file of Array.from(files)) {
      try {
        // 1. Get presigned URL
        const presignRes = await fetch(`/api/jobs/${jobId}/photos/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        })

        if (!presignRes.ok) {
          throw new Error('Failed to get upload URL')
        }

        const { presignedUrl, fileUrl } = await presignRes.json()

        // 2. Upload to R2
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file')
        }

        // 3. Create photo record
        await fetch(`/api/jobs/${jobId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            taken_at: new Date().toISOString(),
          }),
        })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    setIsUploading(false)
    onUploaded()

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-4 py-2 bg-[rgb(245,158,11)] text-white rounded-lg hover:bg-[rgb(220,140,10)] shadow-sm disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Photos
          </>
        )}
      </button>
    </>
  )
}

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const { refresh } = usePhotos(job.id)
  const [showImportModal, setShowImportModal] = useState(false)

  const handlePhotoUploaded = () => {
    refresh()
  }

  const handleImported = () => {
    refresh()
  }

  // Check if job has location for Magic Import
  const hasLocation = !!(job.geofence_lat && job.geofence_lng)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/jobs"
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{job.name}</h1>
              {job.address && (
                <p className="text-xs text-gray-500 truncate">{job.address}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-4">
        {/* Primary Action: Take Photos - Full width, prominent */}
        <Link
          href={`/jobs/${job.id}/camera`}
          className="block w-full py-3.5 text-center text-white font-medium rounded-lg shadow-sm mb-3 bg-[rgb(245,158,11)] hover:bg-[rgb(220,140,10)]"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photos
          </span>
        </Link>

        {/* Secondary Action: Import Photos */}
        <button
          onClick={() => setShowImportModal(true)}
          disabled={!hasLocation}
          className={`block w-full py-3 text-center font-medium rounded-lg mb-6 border transition-colors ${
            hasLocation
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import photos
          </span>
        </button>
        {!hasLocation && (
          <p className="text-xs text-gray-500 text-center -mt-4 mb-6">
            Add a job address to import photos.
          </p>
        )}

        {/* Recent Photos Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700">Recent Photos</h2>
          <PhotoUploadButton jobId={job.id} onUploaded={handlePhotoUploaded} />
        </div>

        <PhotoTimeline jobId={job.id} />
      </main>

      {/* Camera FAB for mobile - hidden on desktop since we have prominent button */}
      <Link
        href={`/jobs/${job.id}/camera`}
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center sm:hidden bg-[rgb(245,158,11)]"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        job={job}
        onImported={handleImported}
      />
    </div>
  )
}
