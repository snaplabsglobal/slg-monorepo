'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Hook to handle PWA install prompt
 *
 * Chrome shows install prompt when:
 * 1. PWA criteria met (manifest, service worker, https)
 * 2. User has interacted with the domain
 * 3. User hasn't dismissed/installed recently
 */
export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS (needs manual instructions)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    // Listen for install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome's default mini-infobar
      e.preventDefault()
      // Save the event for triggering later
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      // Track install event
      console.log('[PWA] App installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false

    // Show the install prompt
    await installPrompt.prompt()

    // Wait for user choice
    const { outcome } = await installPrompt.userChoice

    // Clear the saved prompt
    setInstallPrompt(null)

    return outcome === 'accepted'
  }, [installPrompt])

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isIOS,
    promptInstall,
  }
}
