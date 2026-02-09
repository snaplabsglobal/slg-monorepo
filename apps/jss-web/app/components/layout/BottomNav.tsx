'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Camera, Menu } from 'lucide-react'

/**
 * Mobile Bottom Navigation
 *
 * Design principles:
 * - Fixed 76px height with safe area padding for notched devices
 * - Three tabs: Jobs (left), Camera (center floating), More (right)
 * - Camera button elevated with shadow, ring-4 ring-white
 * - Single thumb operation optimized
 *
 * Safe area handling:
 * - Uses pb-[env(safe-area-inset-bottom)] for iPhone notch
 * - Total height = 76px + safe area inset
 */

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/jobs') {
      return pathname === '/jobs' || pathname.startsWith('/jobs/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-[76px] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-full px-6">
        {/* Jobs Tab - Left */}
        <Link
          href="/jobs"
          className={`flex flex-col items-center gap-1 min-w-[64px] ${
            isActive('/jobs') ? 'text-amber-600' : 'text-gray-500'
          }`}
        >
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </Link>

        {/* Camera Button - Center Floating */}
        <Link
          href="/camera"
          className="-mt-8 flex items-center justify-center w-16 h-16 rounded-full bg-amber-500 shadow-lg ring-4 ring-white"
        >
          <Camera className="h-7 w-7 text-white" />
        </Link>

        {/* More Tab - Right */}
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-1 min-w-[64px] ${
            isActive('/settings') ? 'text-amber-600' : 'text-gray-500'
          }`}
        >
          <Menu className="h-6 w-6" />
          <span className="text-xs font-medium">More</span>
        </Link>
      </div>
    </nav>
  )
}
