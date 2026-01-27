'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Register page - Closed for public registration
 * SLG Corporate is invitation-only. Redirects to login page.
 */
export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to login page
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
