'use client'

/**
 * StatusLight - PASS/FAIL indicator
 * PR-2: Read-Only Display
 */

import { cn } from '@/utils/cn'

interface StatusLightProps {
  status: 'pass' | 'fail' | 'unknown'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function StatusLight({
  status,
  size = 'md',
  pulse = false,
}: StatusLightProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  const colorClasses = {
    pass: 'bg-green-500',
    fail: 'bg-red-500',
    unknown: 'bg-gray-400',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizeClasses[size],
        colorClasses[status],
        pulse && status === 'pass' && 'animate-pulse'
      )}
      title={status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'Unknown'}
    />
  )
}
