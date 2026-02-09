'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  savePhoto,
  getPhotosByJob,
  createThumbnail,
  saveThumbnail,
  uploadQueue,
  syncOrchestrator,
  type PhotoItem,
  type PhotoStatus,
  type TempCoords,
} from '@/lib/snap-evidence'
import { useRecentJobs } from '@/lib/hooks'
import { JobContextBar } from './JobContextBar'

interface Job {
  id: string
  name: string
  address: string | null
}

interface SnapCameraProps {
  job: Job
  recentJobs?: Job[]
  location?: string
}

interface ThumbnailItem {
  id: string
  url: string
  status: PhotoStatus
}

/**
 * Status badge component for thumbnail
 */
function StatusBadge({ status }: { status: PhotoStatus }) {
  switch (status) {
    case 'pending':
      return (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )
    case 'uploading':
      return (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )
    case 'uploaded':
      return (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case 'failed':
      return (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">!</span>
        </div>
      )
  }
}

/**
 * Thumbnail strip at bottom of camera
 */
function ThumbnailStrip({
  items,
  onRetry,
  onView,
}: {
  items: ThumbnailItem[]
  onRetry: (id: string) => void
  onView: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="flex gap-1 p-2 overflow-x-auto bg-black/60 backdrop-blur-sm">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => (item.status === 'failed' ? onRetry(item.id) : onView(item.id))}
          className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 border-white/30 hover:border-white/60"
        >
          <img
            src={item.url}
            alt=""
            className="w-full h-full object-cover"
          />
          <StatusBadge status={item.status} />
        </button>
      ))}
    </div>
  )
}

/**
 * SnapEvidence Camera Component
 * Optimized for fast capture, offline-first, with visible upload status
 *
 * Spec: 260207_JSS_Camera页面改进与实时照片显示完整方案.md
 *
 * Key behaviors:
 * - Camera NOT full screen - shows Job Context Bar
 * - Can switch between recent jobs without leaving camera
 * - Switching job does not reset camera or interrupt flow
 * - Non-blocking capture (no confirmation, no modal)
 */
export function SnapCamera({ job: initialJob, recentJobs: initialRecentJobs, location = 'Vancouver, BC' }: SnapCameraProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gpsWatchIdRef = useRef<number | null>(null)

  // Current job state (can be switched without leaving camera)
  const [currentJob, setCurrentJob] = useState<Job>(initialJob)

  // Fetch recent jobs for switching (if not provided)
  const { recentJobs: fetchedRecentJobs, isLoading: isLoadingJobs } = useRecentJobs()
  const recentJobs = initialRecentJobs ?? fetchedRecentJobs

  const [isReady, setIsReady] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  // GPS coordinates for Smart Trace (captured in background)
  const [currentGps, setCurrentGps] = useState<TempCoords | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'unknown' | 'acquiring' | 'ready' | 'unavailable'>('unknown')

  // Handle job switch (does NOT reset camera)
  const handleJobSwitch = useCallback((newJob: Job) => {
    setCurrentJob(newJob)
    // Save to localStorage for /camera redirect
    localStorage.setItem('last_job_id', newJob.id)
    // Load photos for new job
    loadPhotosForJob(newJob.id)
  }, [])

  // Load photos for a specific job
  const loadPhotosForJob = useCallback(async (jobId: string) => {
    try {
      const photos = await getPhotosByJob(jobId)
      const items: ThumbnailItem[] = []

      for (const photo of photos.slice(0, 20)) {
        // Get thumbnail URL from IndexedDB
        const { getPhotoBlob } = await import('@/lib/snap-evidence')
        const blobRecord = await getPhotoBlob(photo.id)
        if (blobRecord) {
          const url = URL.createObjectURL(blobRecord.thumbnail || blobRecord.blob)
          items.push({
            id: photo.id,
            url,
            status: photo.status,
          })
        }
      }

      setThumbnails(items)
    } catch (e) {
      console.error('Failed to load existing photos:', e)
    }
  }, [])

  // Load existing photos for current job
  const loadExistingPhotos = useCallback(async () => {
    await loadPhotosForJob(currentJob.id)
  }, [currentJob.id, loadPhotosForJob])

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Apply 1x zoom fix for Android
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number } }

      if (capabilities.zoom) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: 1.0 } as MediaTrackConstraintSet],
          })
        } catch {
          // Zoom not supported
        }
      }

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve()
          }
        })
        setIsReady(true)
      }
    } catch (e) {
      setHasPermission(false)
      setError('Camera permission denied or unavailable')
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  // Start GPS tracking (non-blocking, for Smart Trace)
  const startGpsTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable')
      console.log('[SnapEvidence] Geolocation not available')
      return
    }

    setGpsStatus('acquiring')

    // Start watching position
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: TempCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
          altitude: position.coords.altitude ?? undefined,
        }
        setCurrentGps(coords)
        setGpsStatus('ready')
      },
      (error) => {
        console.warn('[SnapEvidence] GPS error:', error.message)
        // Don't set unavailable on timeout, keep trying
        if (error.code !== error.TIMEOUT) {
          setGpsStatus('unavailable')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Allow cached position up to 5 seconds old
      }
    )
  }, [])

  // Stop GPS tracking
  const stopGpsTracking = useCallback(() => {
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current)
      gpsWatchIdRef.current = null
    }
  }, [])

  // Fast shutter - captures and saves immediately
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !isReady || isCapturing) return

    setIsCapturing(true)
    const startTime = performance.now()

    try {
      // Use hidden canvas for capture
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not get canvas context')

      // 1. Capture frame
      ctx.drawImage(videoRef.current, 0, 0)

      // 2. Convert to blob (fast path)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.92
        )
      })

      // 3. Save to local store (fast, <50ms target)
      // GPS coordinates are passed even if stale - Smart Trace handles accuracy
      const photoItem = await savePhoto(currentJob.id, blob, {
        stage: 'during',
        jobName: currentJob.name,
        location,
        // Smart Trace: Include GPS coordinates if available
        tempCoords: currentGps || undefined,
      })

      // 4. Create thumbnail in background
      createThumbnail(blob).then((thumbBlob) => {
        saveThumbnail(photoItem.id, thumbBlob)

        // Update thumbnail in UI
        const thumbUrl = URL.createObjectURL(thumbBlob)
        setThumbnails((prev) => [
          { id: photoItem.id, url: thumbUrl, status: 'pending' },
          ...prev.slice(0, 19),
        ])
      })

      // 5. Trigger sync (debounced)
      syncOrchestrator.onPhotoTaken()

      // Log capture time
      const elapsed = performance.now() - startTime
      console.log(`Photo captured in ${elapsed.toFixed(0)}ms`)

    } catch (e) {
      console.error('Capture error:', e)
      setError('Failed to capture photo')
    } finally {
      setIsCapturing(false)
    }
  }, [isReady, isCapturing, currentJob.id, currentJob.name, location, currentGps])

  // Handle retry failed upload
  const handleRetry = async (id: string) => {
    await uploadQueue.retryUpload(id)
    // Update status in thumbnails
    setThumbnails((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'pending' } : t))
    )
  }

  // Handle view photo
  const handleViewPhoto = (id: string) => {
    setViewingPhoto(id)
  }

  // Close camera and go back
  const handleClose = () => {
    stopCamera()
    router.push(`/jobs/${currentJob.id}`)
  }

  // Initialize on mount
  useEffect(() => {
    // Save current job to localStorage for /camera redirect
    localStorage.setItem('last_job_id', currentJob.id)

    loadExistingPhotos()
    startCamera()
    // Smart Trace: Start GPS tracking immediately (non-blocking)
    startGpsTracking()

    // Set up upload status listener
    uploadQueue.setCallbacks(
      undefined,
      (item, success) => {
        setThumbnails((prev) =>
          prev.map((t) =>
            t.id === item.id
              ? { ...t, status: success ? 'uploaded' : 'failed' }
              : t
          )
        )
      }
    )

    return () => {
      stopCamera()
      stopGpsTracking()
      // Cleanup thumbnail URLs
      thumbnails.forEach((t) => URL.revokeObjectURL(t.url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Permission denied screen
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 text-white hover:bg-white/10 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-24 h-24 mb-6 text-red-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Camera Unavailable</h2>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="px-6 py-3 bg-amber-500 text-white rounded-full"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading overlay - shown while camera initializing */}
      {!isReady && (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white">Starting camera...</p>
        </div>
      )}

      {/* Camera view - video always rendered so ref works */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Top overlay - Job Context Bar */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between gap-2">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 text-white hover:bg-white/10 rounded-full flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Job Context Bar - switchable jobs without leaving camera */}
            <JobContextBar
              currentJob={currentJob}
              recentJobs={recentJobs}
              onJobSelect={handleJobSwitch}
              isLoading={isLoadingJobs}
            />

            {/* GPS Status Indicator (Smart Trace) */}
            <div className="w-10 flex items-center justify-center flex-shrink-0">
              {gpsStatus === 'acquiring' && (
                <div className="w-5 h-5 text-yellow-400" title="Acquiring GPS...">
                  <svg className="animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              )}
              {gpsStatus === 'ready' && (
                <div className="w-5 h-5 text-green-400" title={`GPS ready (${currentGps?.accuracy_m?.toFixed(0) || '?'}m)`}>
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              )}
              {gpsStatus === 'unavailable' && (
                <div className="w-5 h-5 text-gray-500" title="GPS unavailable">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Capture feedback flash */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/30 pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Thumbnail strip */}
      <ThumbnailStrip
        items={thumbnails}
        onRetry={handleRetry}
        onView={handleViewPhoto}
      />

      {/* Bottom controls */}
      <div className="bg-black/80 p-4 pb-8 safe-area-inset-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Left: Job switch button */}
          <button
            onClick={() => router.push('/jobs')}
            className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* Center: Shutter button - 64px minimum for single-hand operation */}
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Capture photo"
          >
            <div className={`w-12 h-12 rounded-full bg-white ${isCapturing ? 'scale-90' : ''} transition-transform`} />
          </button>

          {/* Right: View photos */}
          <button
            onClick={() => router.push(`/jobs/${currentJob.id}`)}
            className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Hint */}
        <p className="text-white/60 text-xs text-center mt-3">
          Point at work area and tap to capture
        </p>
      </div>

      {/* Photo viewer modal */}
      {viewingPhoto && (
        <PhotoViewer
          photoId={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
        />
      )}
    </div>
  )
}

/**
 * Photo viewer modal
 */
function PhotoViewer({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadPhoto() {
      const { getPhotoBlob } = await import('@/lib/snap-evidence')
      const blobRecord = await getPhotoBlob(photoId)
      if (blobRecord) {
        setImageUrl(URL.createObjectURL(blobRecord.blob))
      }
    }
    loadPhoto()

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [photoId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}
