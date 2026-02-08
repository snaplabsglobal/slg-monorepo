'use client'

/**
 * Self-Rescue Mode Page
 *
 * Entry point: /rescue
 *
 * Redirects to the new wizard entry point at /rescue/new
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RescuePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/rescue/new')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-500">Loading rescue mode...</div>
    </div>
  )
}
