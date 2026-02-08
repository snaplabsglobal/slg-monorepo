'use client'

/**
 * Group Preview (Step 3)
 *
 * "Suggested groups (nothing applied yet)"
 *
 * System only states facts:
 * - Location proximity
 * - Time continuity
 * - No naming, no conclusions
 */

import { useRescueStore } from '@/lib/rescue'
import type { PhotoGroupSuggestion } from '@/lib/rescue/types'

interface GroupPreviewProps {
  onSelectGroup: (group: PhotoGroupSuggestion) => void
  onContinue: () => void
  onBack: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    title: 'Suggested groups',
    subtitle: 'nothing applied yet',
    description: 'These are suggestions based on location & time. Review them before doing anything.',
    stats: {
      groups: 'groups',
      photos: 'photos',
      unlocated: 'without location',
    },
    group: {
      photos: 'photos',
      preview: 'Preview',
    },
    unlocated: {
      title: 'Unlocated / Needs review',
      description: 'Photos without GPS data',
    },
    buttons: {
      continue: 'Continue to naming',
      back: 'Back',
    },
  },
  zh: {
    title: '建议分组',
    subtitle: '尚未应用任何更改',
    description: '这些是根据地点和时间生成的建议。请在操作前先检查。',
    stats: {
      groups: '个分组',
      photos: '张照片',
      unlocated: '无位置信息',
    },
    group: {
      photos: '张照片',
      preview: '预览',
    },
    unlocated: {
      title: '未定位 / 需要检查',
      description: '没有GPS数据的照片',
    },
    buttons: {
      continue: '继续命名',
      back: '返回',
    },
  },
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startYear}`
    }
    return `${startMonth}–${endMonth} ${startYear}`
  }
  return `${startMonth} ${startYear} – ${endMonth} ${endYear}`
}

export function GroupPreview({
  onSelectGroup,
  onContinue,
  onBack,
  lang = 'en',
}: GroupPreviewProps) {
  const t = copy[lang]
  const { groups, unlocatedPhotoIds, noisePhotoIds } = useRescueStore()

  const totalPhotos = groups.reduce((sum, g) => sum + g.photoIds.length, 0)
  const totalUnlocated = unlocatedPhotoIds.length + noisePhotoIds.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            {t.title}
            <span className="text-slate-400 font-normal text-lg ml-2">
              ({t.subtitle})
            </span>
          </h1>
          <p className="text-slate-400 text-sm">{t.description}</p>
        </div>

        {/* Stats Summary */}
        <div className="flex justify-center gap-6 mb-8 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500">{groups.length}</div>
            <div className="text-slate-400">{t.stats.groups}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalPhotos}</div>
            <div className="text-slate-400">{t.stats.photos}</div>
          </div>
          {totalUnlocated > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">{totalUnlocated}</div>
              <div className="text-slate-400">{t.stats.unlocated}</div>
            </div>
          )}
        </div>

        {/* Group List */}
        <div className="space-y-3 mb-8">
          {groups.map((group, index) => (
            <div
              key={group.groupId}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-400 text-sm">
                      Group {String.fromCharCode(65 + index)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                    {/* Location */}
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>
                        {group.suggestedAddress?.formatted ||
                          `${group.centroid.lat.toFixed(4)}, ${group.centroid.lng.toFixed(4)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {/* Date Range */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDateRange(group.dateRange.start, group.dateRange.end)}</span>
                    </div>

                    {/* Photo Count */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{group.photoIds.length} {t.group.photos}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectGroup(group)}
                  className="px-4 py-2 text-sm text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                  {t.group.preview}
                </button>
              </div>
            </div>
          ))}

          {/* Unlocated Photos */}
          {totalUnlocated > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-slate-300 font-medium">{t.unlocated.title}</div>
                  <div className="text-slate-500 text-sm">
                    {t.unlocated.description} ({totalUnlocated} {t.group.photos})
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 text-slate-400 hover:text-slate-300 border border-slate-700 rounded-xl transition-colors"
          >
            {t.buttons.back}
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition-colors"
          >
            {t.buttons.continue}
          </button>
        </div>
      </div>
    </div>
  )
}
