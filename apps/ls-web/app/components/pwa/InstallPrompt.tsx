'use client'

import { useEffect, useMemo, useState } from 'react'
import { useHasMounted } from '@/app/hooks/useHasMounted'

function isStandalone() {
  const mql = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return Boolean(mql || iosStandalone)
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

const DISMISS_KEY = 'ls_install_dismissed_until'

export function InstallPrompt() {
  const hasMounted = useHasMounted()
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null)
  const [show, setShow] = useState(false)

  const standalone = useMemo(() => {
    if (typeof window === 'undefined') return false
    return isStandalone()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (standalone) return

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || '0')
    if (dismissedUntil && Date.now() < dismissedUntil) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> })
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    if (isIOS()) setShow(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [standalone])

  if (!hasMounted || !show || standalone) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    setShow(false)
  }

  const onInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      dismiss()
      return
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-white shadow-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Install LedgerSnap</div>
          <div className="text-sm text-gray-600 mt-1">
            Install LedgerSnap to your home screen for a better offline experience at job sites.
          </div>

          {isIOS() && !deferredPrompt && (
            <div className="text-xs text-gray-500 mt-2">
              iPhone/iPad: open in Safari → tap <b>Share</b> → <b>Add to Home Screen</b>.
            </div>
          )}
        </div>

        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 text-sm"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm"
          onClick={onInstall}
        >
          Install App
        </button>
        <button type="button" className="px-3 py-2 rounded-lg bg-gray-100 text-sm" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  )
}
