'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Folder, Camera, MoreHorizontal, Sparkles, Settings, LogOut } from 'lucide-react'

/**
 * Mobile Bottom Navigation (Manus对齐版)
 *
 * 规范来源: 260207_JSS_UI最终规范文档_Manus对齐版.md
 *
 * 结构: [ Jobs ]  [ CAMERA ]  [ More ]
 * - 底栏高度: 76px
 * - Camera按钮: 64px直径, ring 4px, 上浮24px
 * - More: 打开bottom sheet (不是跳页)
 */

export function BottomNav() {
  const pathname = usePathname()
  const [showSheet, setShowSheet] = useState(false)

  const isActive = (href: string) => {
    if (href === '/jobs') {
      return pathname === '/jobs' || pathname.startsWith('/jobs/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-[76px] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-full px-6">
          {/* Jobs Tab - Left (Folder icon) */}
          <Link
            href="/jobs"
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive('/jobs') ? 'text-[rgb(245,158,11)]' : 'text-gray-500'
            }`}
          >
            <Folder className="h-6 w-6" />
            <span className="text-xs font-medium">Jobs</span>
          </Link>

          {/* Camera Button - Center Floating (64px, ring 4px, -24px上浮) */}
          <Link
            href="/camera"
            className="-mt-6 flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(245,158,11)] shadow-lg ring-4 ring-white"
          >
            <Camera className="h-7 w-7 text-white" />
          </Link>

          {/* More Tab - Right (opens bottom sheet) */}
          <button
            onClick={() => setShowSheet(true)}
            className="flex flex-col items-center gap-1 min-w-[64px] text-gray-500"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet (仅含3项: Photo Organizer / Settings / Logout) */}
      {showSheet && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setShowSheet(false)}
          />

          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-4 space-y-1">
              {/* Photo Organizer */}
              <Link
                href="/organizer"
                onClick={() => setShowSheet(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50"
              >
                <Sparkles className="h-6 w-6 text-gray-600" />
                <span className="text-base text-gray-900">Photo Organizer</span>
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                onClick={() => setShowSheet(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50"
              >
                <Settings className="h-6 w-6 text-gray-600" />
                <span className="text-base text-gray-900">Settings</span>
              </Link>

              {/* Logout */}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 w-full text-left"
                >
                  <LogOut className="h-6 w-6 text-gray-600" />
                  <span className="text-base text-gray-900">Logout</span>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
