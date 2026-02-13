'use client'

/**
 * Group Naming (Step 4) - 灵魂步骤
 *
 * "What do you want to do with this group?"
 *
 * This is where ownership is born:
 * - User types the name
 * - System pre-fills suggestion (optional)
 * - Nothing happens without explicit confirmation
 */

import { useState, useEffect } from 'react'
import { useRescueStore, NamingState } from '@/lib/rescue'
import type { PhotoGroupSuggestion } from '@/lib/rescue/types'

interface GroupNamingProps {
  onComplete: () => void
  onBack: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    title: 'Name your projects',
    subtitle: 'You decide what each group becomes',
    group: {
      nameThis: 'Name this group (suggestion below)',
      suggestionNote: 'This is just a suggestion based on location. You can change it.',
      placeholder: 'Enter project name...',
    },
    buttons: {
      name: 'Name this project',
      skip: 'Keep unassigned for now',
      skipGroup: 'Skip this group',
      confirm: 'Confirm',
      next: 'Next group',
      finish: 'Review & Confirm',
      back: 'Back',
    },
    progress: 'of',
  },
  zh: {
    title: '命名你的项目',
    subtitle: '由你决定每个分组变成什么',
    group: {
      nameThis: '给这组命名（下方是建议）',
      suggestionNote: '这只是基于位置的建议。你可以修改。',
      placeholder: '输入项目名称...',
    },
    buttons: {
      name: '命名这个项目',
      skip: '暂时不分配',
      skipGroup: '跳过这组',
      confirm: '确认',
      next: '下一组',
      finish: '检查并确认',
      back: '返回',
    },
    progress: '/',
  },
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startYear}`
  }
  return `${startMonth} ${startYear} – ${endMonth} ${endYear}`
}

export function GroupNaming({ onComplete, onBack, lang = 'en' }: GroupNamingProps) {
  const t = copy[lang]
  const {
    groups,
    groupNamingState,
    groupNames,
    setGroupNamingState,
    setGroupName,
  } = useRescueStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)

  const currentGroup = groups[currentIndex]
  const isLastGroup = currentIndex === groups.length - 1
  const processedCount = Object.values(groupNamingState).filter(
    (s) => s === NamingState.USER_CONFIRMED || s === NamingState.SKIPPED
  ).length

  // Load suggestion for current group
  useEffect(() => {
    if (!currentGroup) return

    const existingName = groupNames[currentGroup.groupId]
    if (existingName) {
      setInputValue(existingName)
      return
    }

    // If we have a suggested address, use it
    if (currentGroup.suggestedAddress?.formatted) {
      setInputValue(currentGroup.suggestedAddress.formatted)
      setGroupNamingState(currentGroup.groupId, NamingState.SUGGESTED_SHOWN)
      return
    }

    // Otherwise, fetch suggestion from geocoding API
    const fetchSuggestion = async () => {
      setIsLoadingSuggestion(true)
      try {
        const response = await fetch('/api/rescue/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: currentGroup.centroid.lat,
            lng: currentGroup.centroid.lng,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.address?.formatted) {
            setInputValue(data.address.formatted)
            setGroupNamingState(currentGroup.groupId, NamingState.SUGGESTED_SHOWN)
          }
        }
      } catch (error) {
        console.error('[rescue] Geocode error:', error)
      } finally {
        setIsLoadingSuggestion(false)
      }
    }

    fetchSuggestion()
  }, [currentGroup, groupNames, setGroupNamingState])

  const handleConfirm = () => {
    if (!currentGroup || !inputValue.trim()) return

    setGroupName(currentGroup.groupId, inputValue.trim())
    setGroupNamingState(currentGroup.groupId, NamingState.USER_CONFIRMED)

    if (isLastGroup) {
      onComplete()
    } else {
      setCurrentIndex((i) => i + 1)
      setInputValue('')
    }
  }

  const handleSkip = () => {
    if (!currentGroup) return

    setGroupNamingState(currentGroup.groupId, NamingState.SKIPPED)

    if (isLastGroup) {
      onComplete()
    } else {
      setCurrentIndex((i) => i + 1)
      setInputValue('')
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (currentGroup) {
      setGroupNamingState(currentGroup.groupId, NamingState.USER_EDITING)
    }
  }

  if (!currentGroup) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{t.title}</h1>
          <p className="text-slate-400 text-sm">{t.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / groups.length) * 100}%` }}
            />
          </div>
          <span className="text-slate-400 text-sm ml-4">
            {currentIndex + 1} {t.progress} {groups.length}
          </span>
        </div>

        {/* Current Group Card */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 mb-6">
          {/* Group Info */}
          <div className="mb-4 pb-4 border-b border-slate-700">
            <div className="text-slate-400 text-sm mb-2">
              Group {String.fromCharCode(65 + currentIndex)}
            </div>

            <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>
                {currentGroup.suggestedAddress?.formatted ||
                  `${currentGroup.centroid.lat.toFixed(4)}, ${currentGroup.centroid.lng.toFixed(4)}`}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>{formatDateRange(currentGroup.dateRange.start, currentGroup.dateRange.end)}</span>
              <span>{currentGroup.photoIds.length} photos</span>
            </div>
          </div>

          {/* Naming Section */}
          <div>
            <label className="block text-white font-medium mb-1">
              {t.group.nameThis}
            </label>
            <p className="text-slate-500 text-xs mb-3">{t.group.suggestionNote}</p>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t.group.placeholder}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={isLoadingSuggestion}
            />

            {isLoadingSuggestion && (
              <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-slate-500 border-t-amber-500 rounded-full animate-spin" />
                <span>Loading suggestion...</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className={`w-full py-4 font-semibold rounded-xl transition-colors ${
              inputValue.trim()
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLastGroup ? t.buttons.finish : t.buttons.confirm}
          </button>

          <button
            onClick={handleSkip}
            className="w-full py-3 text-slate-400 hover:text-slate-300 border border-slate-700 rounded-xl transition-colors"
          >
            {t.buttons.skip}
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={currentIndex > 0 ? () => setCurrentIndex((i) => i - 1) : onBack}
          className="w-full py-3 text-slate-500 hover:text-slate-400 mt-4 transition-colors"
        >
          {t.buttons.back}
        </button>

        {/* Nothing changes note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Nothing changes until you click final confirm.
        </p>
      </div>
    </div>
  )
}
