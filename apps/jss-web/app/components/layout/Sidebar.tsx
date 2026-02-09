'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Folder, Camera, Shield, Settings } from 'lucide-react'
import { JSSLogo } from '@/components/ui/JSSLogo'

/**
 * Sidebar Navigation - Desktop (Manus对齐版)
 *
 * 规范来源: 260207_JSS_UI最终规范文档_Manus对齐版.md
 *
 * 菜单顺序(不可改): Jobs → Camera → Rescue Mode → Settings
 * Active Item: 背景rgb(245,158,11), 文字白色
 * 底部: 用户信息(头像+名字+角色), Logout在Settings页面内
 */

const navItems = [
  {
    href: '/jobs',
    label: 'Jobs',
    icon: Folder,
  },
  {
    href: '/camera',
    label: 'Camera',
    icon: Camera,
  },
  {
    href: '/rescue',
    label: 'Rescue Mode',
    icon: Shield,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/jobs') {
      return pathname === '/jobs' || pathname.startsWith('/jobs/')
    }
    if (href === '/rescue') {
      return pathname === '/rescue' || pathname.startsWith('/rescue/')
    }
    return pathname === href
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <JSSLogo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[rgb(245,158,11)] text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info Footer (头像+名字+角色, Logout在Settings页面) */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          {/* Avatar (首字母圆形) */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-sm font-medium">
            U
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">User</div>
            <div className="text-xs text-gray-500">Contractor</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
