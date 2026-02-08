'use client'

/**
 * Self-Rescue Mode Wizard
 *
 * 5-step flow:
 * 1. Landing - "Rescue your photo library"
 * 2. Source - "Where are your photos coming from?"
 * 3. Scanning - Real-time stats
 * 4. Groups - "Suggested groups (nothing applied yet)"
 * 5. Naming - "What do you want to do with this group?"
 * 6. Confirm - "You're about to organize your photos"
 */

import { useCallback, useRef, useState } from 'react'
import { useRescueStore, suggestGroups } from '@/lib/rescue'
import type { RescueSource, RescuePhoto } from '@/lib/rescue/types'

import { RescueLanding } from './RescueLanding'
import { SourceSelector } from './SourceSelector'
import { ScanProgress } from './ScanProgress'
import { GroupPreview } from './GroupPreview'
import { GroupNaming } from './GroupNaming'
import { ConfirmApply } from './ConfirmApply'

interface RescueWizardProps {
  onComplete?: () => void
  onCancel?: () => void
  lang?: 'en' | 'zh'
}

export function RescueWizard({
  onComplete,
  onCancel,
  lang = 'en',
}: RescueWizardProps) {
  const {
    step,
    goToStep,
    reset,
    addPhotos,
    clearPhotos,
    setScanProgress,
    setIsScanning,
    setGroups,
    setUnlocatedPhotoIds,
    setNoisePhotoIds,
    setIsGrouping,
    photos,
  } = useRescueStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSource, setSelectedSource] = useState<RescueSource | null>(null)

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList) => {
      setIsScanning(true)
      clearPhotos()
      setScanProgress({ total: files.length, processed: 0, withGps: 0, withoutGps: 0 })

      const rescuePhotos: RescuePhoto[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Only process images
        if (!file.type.startsWith('image/')) continue

        try {
          // Extract EXIF data using browser APIs
          const photo = await extractPhotoMetadata(file)
          rescuePhotos.push(photo)

          setScanProgress({
            processed: i + 1,
            withGps: rescuePhotos.filter((p) => p.lat != null).length,
            withoutGps: rescuePhotos.filter((p) => p.lat == null).length,
          })
        } catch (error) {
          console.error('[rescue] Failed to process file:', file.name, error)
        }
      }

      addPhotos(rescuePhotos)
      setIsScanning(false)

      // Auto-advance to grouping
      if (rescuePhotos.length > 0) {
        goToStep('groups')
        runGrouping(rescuePhotos)
      }
    },
    [addPhotos, clearPhotos, goToStep, setIsScanning, setScanProgress]
  )

  // Extract photo metadata from file
  const extractPhotoMetadata = async (file: File): Promise<RescuePhoto> => {
    return new Promise((resolve) => {
      const photo: RescuePhoto = {
        photoId: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        takenAtUtc: new Date(file.lastModified).toISOString(),
        fileName: file.name,
        fileSize: file.size,
      }

      // Try to extract EXIF data
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const view = new DataView(e.target?.result as ArrayBuffer)
          const exif = parseBasicExif(view)
          if (exif) {
            if (exif.lat != null && exif.lng != null) {
              photo.lat = exif.lat
              photo.lng = exif.lng
            }
            if (exif.dateTime) {
              photo.takenAtUtc = exif.dateTime
            }
          }
        } catch {
          // EXIF parsing failed, use defaults
        }
        resolve(photo)
      }
      reader.onerror = () => resolve(photo)
      reader.readAsArrayBuffer(file.slice(0, 65536)) // Read first 64KB for EXIF
    })
  }

  // Basic EXIF parser (simplified)
  const parseBasicExif = (view: DataView): { lat?: number; lng?: number; dateTime?: string } | null => {
    try {
      // Check for JPEG
      if (view.getUint16(0) !== 0xffd8) return null

      let offset = 2
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset)
        if (marker === 0xffe1) {
          // APP1 marker (EXIF)
          const length = view.getUint16(offset + 2)
          // Very simplified - in production, use a proper EXIF library
          // For now, just return null to use file metadata
          return null
        }
        if ((marker & 0xff00) !== 0xff00) break
        offset += 2 + view.getUint16(offset + 2)
      }
    } catch {
      // Parsing failed
    }
    return null
  }

  // Run clustering algorithm
  const runGrouping = useCallback(
    async (photosToGroup: RescuePhoto[]) => {
      setIsGrouping(true)

      try {
        // Use local clustering (no API call needed)
        const result = suggestGroups(photosToGroup)

        // Fetch addresses for each group
        const groupsWithAddresses = await Promise.all(
          result.groups.map(async (group) => {
            try {
              const response = await fetch('/api/rescue/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lat: group.centroid.lat,
                  lng: group.centroid.lng,
                }),
              })

              if (response.ok) {
                const data = await response.json()
                if (data.address) {
                  return { ...group, suggestedAddress: data.address }
                }
              }
            } catch {
              // Geocoding failed, continue without address
            }
            return group
          })
        )

        setGroups(groupsWithAddresses)
        setUnlocatedPhotoIds(result.unlocatedPhotoIds)
        setNoisePhotoIds(result.noiseGpsPhotoIds)
      } catch (error) {
        console.error('[rescue] Grouping error:', error)
      } finally {
        setIsGrouping(false)
      }
    },
    [setGroups, setIsGrouping, setNoisePhotoIds, setUnlocatedPhotoIds]
  )

  // Handle source selection
  const handleSourceSelect = (source: RescueSource) => {
    setSelectedSource(source)
    goToStep('scanning')

    // For phone/local folder, open file picker
    if (source === 'phone_camera_roll' || source === 'local_folder') {
      fileInputRef.current?.click()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  // Handle complete
  const handleComplete = () => {
    onComplete?.()
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />

      {/* Wizard Steps */}
      {step === 'landing' && (
        <RescueLanding
          onStart={() => goToStep('source')}
          onSkip={handleCancel}
          lang={lang}
        />
      )}

      {step === 'source' && (
        <SourceSelector
          onSelect={handleSourceSelect}
          onBack={() => goToStep('landing')}
          lang={lang}
        />
      )}

      {step === 'scanning' && (
        <ScanProgress
          onComplete={() => {
            if (photos.length > 0) {
              goToStep('groups')
              runGrouping(photos)
            }
          }}
          onCancel={handleCancel}
          lang={lang}
        />
      )}

      {step === 'groups' && (
        <GroupPreview
          onSelectGroup={(group) => {
            // TODO: Show group detail modal
            console.log('Preview group:', group)
          }}
          onContinue={() => goToStep('naming')}
          onBack={() => goToStep('scanning')}
          lang={lang}
        />
      )}

      {step === 'naming' && (
        <GroupNaming
          onComplete={() => goToStep('confirm')}
          onBack={() => goToStep('groups')}
          lang={lang}
        />
      )}

      {step === 'confirm' && (
        <ConfirmApply
          onConfirm={handleComplete}
          onBack={() => goToStep('naming')}
          lang={lang}
        />
      )}

      {step === 'applied' && (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {lang === 'zh' ? '拯救完成！' : 'Rescue Complete!'}
            </h1>
            <p className="text-slate-400 mb-8">
              {lang === 'zh'
                ? '你的照片已按项目整理好了。'
                : 'Your photos are now organized by project.'}
            </p>
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition-colors"
            >
              {lang === 'zh' ? '开始使用 JSS' : 'Start using JSS'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
