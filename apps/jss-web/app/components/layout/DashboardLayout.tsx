'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

/**
 * Dashboard Layout
 *
 * Per CDO document:
 * - Desktop: Left sidebar navigation
 * - Mobile: Bottom navigation with safe area
 * - Content area with proper padding for both layouts
 *
 * Mobile First design:
 * - Main operations visible on single screen
 * - No horizontal scroll
 * - Single thumb operation possible
 */

interface DashboardLayoutProps {
  children: React.ReactNode
  /** Optional header content for the mobile view */
  header?: React.ReactNode
  /** Hide bottom nav on certain pages (e.g., camera) */
  hideBottomNav?: boolean
}

export function DashboardLayout({ children, header, hideBottomNav }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
          {header || (
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">JobSite Snap</span>
            </div>
          )}
        </header>

        {/* Page content - pb-[76px] matches BottomNav height */}
        <main className={`${hideBottomNav ? '' : 'pb-[76px] md:pb-0'}`}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}
