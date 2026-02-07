'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Job {
  id: string
  name: string
  address: string | null
}

interface JobPhotoCaptureProps {
  job: Job
}

export function JobPhotoCapture({ job }: JobPhotoCaptureProps) {
  const router = useRouter()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const requestCameraPermission = async () => {
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
      setIsCapturing(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setHasPermission(false)
      setError('Camera permission denied or unavailable')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.92)
      setCapturedImage(imageData)
      stopCamera()
    }
  }

  const uploadPhoto = async () => {
    if (!capturedImage) return

    setIsUploading(true)
    setError('')

    try {
      // Convert base64 to blob
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const filename = `photo-${Date.now()}.jpg`

      // 1. Get presigned URL
      const presignRes = await fetch(`/api/jobs/${job.id}/photos/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          contentType: 'image/jpeg',
        }),
      })

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { presignedUrl, fileUrl } = await presignRes.json()

      // 2. Upload to R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      // 3. Create photo record
      await fetch(`/api/jobs/${job.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: fileUrl,
          file_size: blob.size,
          mime_type: 'image/jpeg',
          taken_at: new Date().toISOString(),
        }),
      })

      // Go back to job detail
      router.push(`/jobs/${job.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    requestCameraPermission()
  }

  const goBack = () => {
    stopCamera()
    router.push(`/jobs/${job.id}`)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Review captured photo
  if (capturedImage) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white">
            <p className="text-sm opacity-80">Photo for</p>
            <p className="font-semibold truncate">{job.name}</p>
          </div>
        </div>

        {/* Image Preview */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="absolute top-20 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-6">
            <button
              onClick={retakePhoto}
              disabled={isUploading}
              className="px-6 py-3 border border-white text-white rounded-full disabled:opacity-50"
            >
              Retake
            </button>
            <button
              onClick={uploadPhoto}
              disabled={isUploading}
              className="px-6 py-3 bg-amber-500 text-white rounded-full disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Camera prompt or view
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {!isCapturing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {/* Back button */}
          <button
            onClick={goBack}
            className="absolute top-4 left-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-24 h-24 mb-6 text-amber-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Capture Photo</h2>
          <p className="text-gray-400 mb-2">{job.name}</p>
          {job.address && <p className="text-gray-500 text-sm mb-6">{job.address}</p>}

          <button
            onClick={requestCameraPermission}
            className="px-8 py-4 bg-amber-500 text-white text-lg font-semibold rounded-full hover:bg-amber-600 shadow-lg"
          >
            Start Camera
          </button>

          {hasPermission === false && (
            <div className="mt-4 p-4 bg-red-500/20 text-red-300 rounded-lg max-w-sm">
              {error || 'Camera access denied. Please enable camera permissions in your browser settings.'}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 relative">
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Header overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={goBack}
              className="p-2 text-white hover:bg-white/10 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Job info */}
          <div className="absolute top-16 left-4 right-4 text-white text-center">
            <p className="text-sm opacity-80 bg-black/40 rounded-lg py-1 px-3 inline-block">
              {job.name}
            </p>
          </div>

          {/* Capture button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>

          {/* Hint */}
          <div className="absolute bottom-32 left-0 right-0 text-center">
            <p className="text-white/80 text-sm">Point at the work area and tap to capture</p>
          </div>
        </div>
      )}
    </div>
  )
}
