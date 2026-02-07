'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Job, JobPhoto, PhotoListResponse } from '@/lib/types'

interface PhotoTimelineProps {
  jobId: string
  onPhotoUploaded: () => void
}

function PhotoTimeline({ jobId, onPhotoUploaded }: PhotoTimelineProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchPhotos = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    setLoading(true)

    try {
      const res = await fetch(`/api/jobs/${jobId}/photos?limit=20&offset=${currentOffset}`)
      if (!res.ok) throw new Error('Failed to fetch photos')

      const data: PhotoListResponse = await res.json()

      if (reset) {
        setPhotos(data.photos)
        setOffset(data.photos.length)
      } else {
        setPhotos(prev => [...prev, ...data.photos])
        setOffset(prev => prev + data.photos.length)
      }
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Error fetching photos:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId, offset])

  useEffect(() => {
    fetchPhotos(true)
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleRefresh = () => {
    fetchPhotos(true)
    onPhotoUploaded()
  }

  return (
    <div>
      {/* Empty State */}
      {!loading && photos.length === 0 && (
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
            {datePhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
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
                    ${photo.stage === 'during' ? 'bg-amber-500 text-white' : ''}
                    ${photo.stage === 'after' ? 'bg-green-500 text-white' : ''}
                  `}>
                    {photo.stage.charAt(0).toUpperCase() + photo.stage.slice(1)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div ref={loadMoreRef} className="text-center py-4">
          <button
            onClick={() => fetchPhotos()}
            className="px-4 py-2 text-amber-600 hover:text-amber-700"
          >
            Load More
          </button>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <img
            src={selectedPhoto.file_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">
                  {new Date(selectedPhoto.taken_at).toLocaleString()}
                </p>
                <div className="flex gap-2 mt-1">
                  {selectedPhoto.stage && (
                    <span className={`
                      px-2 py-0.5 text-xs rounded
                      ${selectedPhoto.stage === 'before' ? 'bg-blue-500' : ''}
                      ${selectedPhoto.stage === 'during' ? 'bg-amber-500' : ''}
                      ${selectedPhoto.stage === 'after' ? 'bg-green-500' : ''}
                    `}>
                      {selectedPhoto.stage}
                    </span>
                  )}
                  {selectedPhoto.area && (
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-600">
                      {selectedPhoto.area}
                    </span>
                  )}
                  {selectedPhoto.trade && (
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-600">
                      {selectedPhoto.trade}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm disabled:opacity-50"
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
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePhotoUploaded = () => {
    setRefreshKey(k => k + 1)
  }

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
            <PhotoUploadButton jobId={job.id} onUploaded={handlePhotoUploaded} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-4">
        <PhotoTimeline
          key={refreshKey}
          jobId={job.id}
          onPhotoUploaded={handlePhotoUploaded}
        />
      </main>

      {/* Camera FAB for mobile */}
      <Link
        href={`/jobs/${job.id}/camera`}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 md:hidden"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>
    </div>
  )
}
