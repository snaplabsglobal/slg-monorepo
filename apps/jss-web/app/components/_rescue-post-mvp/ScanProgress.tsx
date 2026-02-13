'use client'

/**
 * Scan Progress (Step 2)
 *
 * "Scanning your photos..."
 *
 * Shows real-time stats - "我到底有多少东西？"
 * This is the first layer of "秩序感"
 */

import { useEffect, useState } from 'react'
import { useRescueStore } from '@/lib/rescue'

interface ScanProgressProps {
  onComplete: () => void
  onCancel: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    title: 'Scanning your photos...',
    stats: {
      found: 'photos found',
      withGps: 'with GPS',
      withoutGps: 'without location',
      dateRange: 'Date range',
    },
    buttons: {
      cancel: 'Cancel',
    },
  },
  zh: {
    title: '正在扫描你的照片...',
    stats: {
      found: '张照片',
      withGps: '有GPS定位',
      withoutGps: '没有位置信息',
      dateRange: '时间范围',
    },
    buttons: {
      cancel: '取消',
    },
  },
}

export function ScanProgress({ onComplete, onCancel, lang = 'en' }: ScanProgressProps) {
  const t = copy[lang]
  const { scanProgress, isScanning, photos, setIsScanning, setScanProgress } = useRescueStore()
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({})

  // Calculate date range from photos
  useEffect(() => {
    if (photos.length === 0) return

    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const photo of photos) {
      try {
        const date = new Date(photo.takenAtUtc)
        if (!minDate || date < minDate) minDate = date
        if (!maxDate || date > maxDate) maxDate = date
      } catch {
        // Skip invalid dates
      }
    }

    if (minDate && maxDate) {
      setDateRange({
        start: minDate.getFullYear().toString(),
        end: maxDate.getFullYear().toString(),
      })
    }
  }, [photos])

  // Auto-complete when scanning is done
  useEffect(() => {
    if (!isScanning && scanProgress.processed > 0 && scanProgress.processed === scanProgress.total) {
      const timer = setTimeout(onComplete, 1000)
      return () => clearTimeout(timer)
    }
  }, [isScanning, scanProgress.processed, scanProgress.total, onComplete])

  const progress = scanProgress.total > 0
    ? Math.round((scanProgress.processed / scanProgress.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">{t.title}</h1>

          {/* Progress Bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-amber-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-500 text-sm">{progress}%</p>
        </div>

        {/* Stats Cards */}
        <div className="space-y-4 mb-8">
          {/* Photos Found */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.stats.found}</span>
              <span className="text-3xl font-bold text-white">
                {scanProgress.processed.toLocaleString()}
              </span>
            </div>
          </div>

          {/* GPS Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400 text-sm">{t.stats.withGps}</span>
              </div>
              <span className="text-xl font-bold text-white">
                {scanProgress.withGps.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-slate-400 text-sm">{t.stats.withoutGps}</span>
              </div>
              <span className="text-xl font-bold text-white">
                {scanProgress.withoutGps.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Date Range */}
          {dateRange.start && dateRange.end && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{t.stats.dateRange}</span>
                <span className="text-white font-medium">
                  {dateRange.start === dateRange.end
                    ? dateRange.start
                    : `${dateRange.start} – ${dateRange.end}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scanning Animation */}
        {isScanning && (
          <div className="flex justify-center mb-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-400 hover:text-slate-300 border border-slate-700 rounded-xl transition-colors"
        >
          {t.buttons.cancel}
        </button>

        {/* Note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Nothing is changed or uploaded yet.
        </p>
      </div>
    </div>
  )
}
