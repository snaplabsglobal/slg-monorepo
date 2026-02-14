'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2, Download, Info } from 'lucide-react'
import type { JobPhoto } from '@/lib/types'

interface PhotoViewerProps {
  photos: JobPhoto[]
  initialIndex: number
  onClose: () => void
  onDelete?: (photoId: string) => Promise<void>
}

/**
 * Photo Viewer with Navigation
 *
 * Spec: 260207_JSS_Camera页面改进与实时照片显示完整方案.md
 *
 * Desktop:
 * - Left/Right arrow buttons
 * - Keyboard: ← → ESC
 *
 * Mobile:
 * - Left/Right swipe
 * - Single click: show/hide UI
 */
export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showUI, setShowUI] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  // Touch handling for swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentPhoto = photos[currentIndex]
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < photos.length - 1

  // Navigation functions
  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [canGoPrev, currentIndex])

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [canGoNext, currentIndex])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext, onClose])

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    }

    const deltaX = touchEnd.x - touchStartRef.current.x
    const deltaY = touchEnd.y - touchStartRef.current.y

    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goToPrev()
      } else {
        goToNext()
      }
    }

    touchStartRef.current = null
  }, [goToPrev, goToNext])

  // Toggle UI on tap (mobile)
  const handleTap = useCallback((e: React.MouseEvent) => {
    // Only toggle if clicking the image area, not controls
    if ((e.target as HTMLElement).closest('[data-controls]')) return
    setShowUI(prev => !prev)
  }, [])

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete || isDeleting) return

    setIsDeleting(true)
    try {
      await onDelete(currentPhoto.id)
      // If this was the last photo, close viewer
      if (photos.length === 1) {
        onClose()
      } else if (currentIndex === photos.length - 1) {
        // If deleting last photo, go to previous
        setCurrentIndex(currentIndex - 1)
      }
      // Otherwise stay at current index (next photo slides in)
    } catch (err) {
      console.error('Failed to delete photo:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(currentPhoto.file_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `photo-${currentPhoto.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download photo:', err)
    }
  }

  if (!currentPhoto) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar with controls */}
      <div
        data-controls
        className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-200 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Photo index */}
          <div className="text-white text-sm" data-testid="photo-index">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-full ${showInfo ? 'bg-white/20' : 'hover:bg-white/10'} text-white`}
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white/10 rounded-full"
            >
              <Download className="w-5 h-5" />
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-white hover:bg-red-500/50 rounded-full disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {/* Previous button (desktop) */}
        <button
          data-controls
          onClick={goToPrev}
          disabled={!canGoPrev}
          className={`hidden md:flex absolute left-4 z-10 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-opacity duration-200 ${
            showUI && canGoPrev ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Image */}
        <img
          src={currentPhoto.file_url}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {/* Next button (desktop) */}
        <button
          data-controls
          onClick={goToNext}
          disabled={!canGoNext}
          className={`hidden md:flex absolute right-4 z-10 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-opacity duration-200 ${
            showUI && canGoNext ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom info panel */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4">
          {/* Basic info */}
          <p className="text-white/80 text-sm">
            {new Date(currentPhoto.taken_at).toLocaleString()}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-2">
            {currentPhoto.stage && (
              <span className={`px-2 py-0.5 text-xs text-white rounded ${
                currentPhoto.stage === 'before' ? 'bg-blue-500' :
                currentPhoto.stage === 'during' ? 'bg-[rgb(245,158,11)]' :
                'bg-green-500'
              }`}>
                {currentPhoto.stage.charAt(0).toUpperCase() + currentPhoto.stage.slice(1)}
              </span>
            )}
            {currentPhoto.area && (
              <span className="px-2 py-0.5 text-xs text-white rounded bg-gray-600">
                {currentPhoto.area}
              </span>
            )}
            {currentPhoto.trade && (
              <span className="px-2 py-0.5 text-xs text-white rounded bg-gray-600">
                {currentPhoto.trade}
              </span>
            )}
          </div>

          {/* Extended info panel */}
          {showInfo && (
            <div className="mt-4 p-3 bg-black/40 rounded-lg text-sm text-white/80 space-y-1">
              {currentPhoto.lat && currentPhoto.lng && (
                <p>Location: {currentPhoto.lat.toFixed(6)}, {currentPhoto.lng.toFixed(6)}</p>
              )}
              {currentPhoto.file_size && (
                <p>Size: {(currentPhoto.file_size / 1024 / 1024).toFixed(2)} MB</p>
              )}
              <p>Type: {currentPhoto.mime_type}</p>
              <p>ID: {currentPhoto.id.slice(0, 8)}...</p>
            </div>
          )}
        </div>
      </div>

      {/* Swipe indicator for mobile */}
      <div
        className={`md:hidden absolute bottom-20 left-0 right-0 flex justify-center gap-6 transition-opacity duration-200 ${
          showUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {canGoPrev && (
          <span className="text-white/40 text-sm">← Swipe for previous</span>
        )}
        {canGoNext && (
          <span className="text-white/40 text-sm">Swipe for next →</span>
        )}
      </div>
    </div>
  )
}
