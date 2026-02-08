'use client'

/**
 * Self-Rescue Mode Page
 *
 * Entry point: /rescue
 *
 * "Rescue your photo library - Get your past under control before starting fresh."
 */

import { useRouter } from 'next/navigation'
import { RescueWizard } from '@/components/rescue'

export default function RescuePage() {
  const router = useRouter()

  return (
    <RescueWizard
      onComplete={() => router.push('/dashboard')}
      onCancel={() => router.push('/')}
      lang="en"
    />
  )
}
