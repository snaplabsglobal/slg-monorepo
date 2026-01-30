'use client'

import { useEffect, useState } from 'react'

/**
 * CTO#1: Top amber bar when offline. Do not redirect to login when offline.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-sm text-center">
      <span className="font-medium">离线模式</span>
      <span className="ml-2">功能受限，数据将在恢复网络后同步</span>
    </div>
  )
}
