'use client'

import { useState, useEffect } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const DISMISS_KEY = 'jss-install-banner-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * PWA Install Banner
 *
 * Shows at top of screen when:
 * - Chrome's beforeinstallprompt fires
 * - User hasn't dismissed recently
 * - App not already installed
 *
 * For iOS: Shows manual instructions (Add to Home Screen)
 */
export function InstallBanner() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true) // Start hidden to prevent flash
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_DURATION) {
        setDismissed(true)
        return
      }
    }
    setDismissed(false)
  }, [])

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (!accepted) {
      // User dismissed, remember for a while
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const handleIOSInstall = () => {
    setShowIOSGuide(true)
  }

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null
  }

  // iOS: Show guide for manual install
  if (isIOS) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Add to Home Screen</div>
                <div className="text-xs text-white/80">Install for quick access</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleIOSInstall}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
              >
                How?
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-full p-2 text-white/80 hover:bg-white/10"
                aria-label="Dismiss"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* iOS Instructions Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="w-full max-w-md rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 text-center">
                <div className="text-lg font-semibold">Add to Home Screen</div>
                <div className="mt-1 text-sm text-gray-500">Follow these steps:</div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">1</div>
                  <div>
                    <div className="font-medium">Tap the Share button</div>
                    <div className="text-sm text-gray-500">
                      <svg className="inline h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      {' '}at the bottom of Safari
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">2</div>
                  <div>
                    <div className="font-medium">Scroll and tap &quot;Add to Home Screen&quot;</div>
                    <div className="text-sm text-gray-500">
                      <svg className="inline h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {' '}icon with a plus sign
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">3</div>
                  <div>
                    <div className="font-medium">Tap &quot;Add&quot;</div>
                    <div className="text-sm text-gray-500">JobSite Snap will appear on your home screen</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Chrome/Android: Show install prompt
  if (!canInstall) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Install JobSite Snap</div>
            <div className="text-xs text-white/80">Quick access from home screen</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
