'use client'

/**
 * Self-Rescue Mode Landing / Entry Point
 *
 * "Rescue your photo library - Get your past under control before starting fresh."
 *
 * This is NOT a hidden feature - it's prominently placed in onboarding/home
 */

import { useRescueStore } from '@/lib/rescue'

interface RescueLandingProps {
  onStart: () => void
  onSkip?: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    screen1: {
      title: 'Rescue your photo library',
      subtitle: 'Get your past under control — before you start fresh.',
    },
    screen2: {
      title: 'Nothing changes unless you confirm',
      subtitle: 'We only suggest groups based on location & time.',
      detail: 'You name it. You decide.',
    },
    screen3: {
      title: 'Stop anytime',
      subtitle: 'Close the page and come back later.',
      detail: 'Your progress is saved.',
    },
    buttons: {
      start: 'Start Rescue',
      skip: 'Not now',
      next: 'Next',
    },
  },
  zh: {
    screen1: {
      title: '先把相册救回来',
      subtitle: '整理清楚过去，再开始新的项目。',
    },
    screen2: {
      title: '你不点确认，什么都不会改',
      subtitle: '我们只按地点和时间建议分组。',
      detail: '命名和决定都由你来。',
    },
    screen3: {
      title: '随时停，随时回来',
      subtitle: '关掉页面也没关系。',
      detail: '进度会保存。',
    },
    buttons: {
      start: '开始拯救',
      skip: '以后再说',
      next: '下一步',
    },
  },
}

export function RescueLanding({
  onStart,
  onSkip,
  lang = 'en',
}: RescueLandingProps) {
  const t = copy[lang]
  const { startSession } = useRescueStore()

  const handleStart = async () => {
    try {
      // Create session on server
      const response = await fetch('/api/rescue/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      startSession(data.session.sessionId, data.session.userId)
      onStart()
    } catch (error) {
      console.error('[rescue] Failed to start:', error)
      // Start anyway with local session
      const localSessionId = `local_${Date.now().toString(36)}`
      startSession(localSessionId, 'local')
      onStart()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {t.screen1.title}
          </h1>
          <p className="text-slate-400 text-lg">{t.screen1.subtitle}</p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-4 mb-12">
          {/* Card 1 */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  {t.screen2.title}
                </h3>
                <p className="text-slate-400 text-sm">{t.screen2.subtitle}</p>
                <p className="text-slate-500 text-sm mt-1">{t.screen2.detail}</p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  {t.screen3.title}
                </h3>
                <p className="text-slate-400 text-sm">{t.screen3.subtitle}</p>
                <p className="text-slate-500 text-sm mt-1">{t.screen3.detail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition-colors"
          >
            {t.buttons.start}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-3 text-slate-400 hover:text-slate-300 transition-colors"
            >
              {t.buttons.skip}
            </button>
          )}
        </div>

        {/* Trust Badge */}
        <p className="text-center text-slate-500 text-xs mt-8">
          JSS never logs into other apps or systems.
          <br />
          You choose what to bring in.
        </p>
      </div>
    </div>
  )
}
