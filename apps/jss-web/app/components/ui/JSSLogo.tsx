'use client'

import Image from 'next/image'

interface JSSLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

const sizeMap = {
  sm: { icon: 24, text: 'text-xs' },
  md: { icon: 32, text: 'text-sm' },
  lg: { icon: 40, text: 'text-base' },
  xl: { icon: 48, text: 'text-lg' },
}

/**
 * JSS Logo Component
 * Uses the official JobSite Snap logo from /icons/jss-logo.svg
 */
export function JSSLogo({ size = 'md', showText = true, className = '' }: JSSLogoProps) {
  const { icon, text } = sizeMap[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/icons/jss-logo.svg"
        alt="JobSite Snap"
        width={icon}
        height={icon}
        className="rounded-lg"
        priority
      />
      {showText && (
        <div className="leading-tight">
          <div className={`font-semibold text-gray-900 ${text}`}>JobSite Snap</div>
          <div className={`text-gray-500 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            Job Photos
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * JSS Icon Only (for small spaces like nav items)
 */
export function JSSIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icons/jss-logo.svg"
      alt="JobSite Snap"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      priority
    />
  )
}
