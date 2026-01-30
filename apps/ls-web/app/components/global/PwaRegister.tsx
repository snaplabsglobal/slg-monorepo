'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker in production (disabled in dev to avoid cache confusion).
 */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      process.env.NODE_ENV === 'development' ||
      !('serviceWorker' in navigator)
    )
      return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
  }, [])
  return null
}
