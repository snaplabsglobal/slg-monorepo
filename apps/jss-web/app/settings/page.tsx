'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { User, Mail, Lock, Shield, LogOut } from 'lucide-react'

/**
 * Settings Page (Manus对齐版)
 *
 * 规范来源: 260207_JSS_UI最终规范文档_Manus对齐版.md
 *
 * 内容:
 * 1. Profile（个人资料）- 头像、名字、邮箱
 * 2. Account（账号设置）- 密码、安全
 * 3. Logout（退出登录）
 *
 * 注意: 不单独展示Profile/Account页面，全部在Settings内
 */
export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-4">
          {/* Profile Section */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
            <div className="space-y-3">
              {/* Avatar */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xl font-medium">
                  U
                </div>
                <button className="text-sm text-[rgb(245,158,11)] hover:underline">
                  Change photo
                </button>
              </div>
              <div className="border-t" />
              {/* Name */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Name</span>
                </div>
                <span className="text-sm text-gray-500">User</span>
              </div>
              <div className="border-t" />
              {/* Email */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Email</span>
                </div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
            <div className="space-y-3">
              {/* Password */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Password</span>
                </div>
                <button className="text-sm text-[rgb(245,158,11)] hover:underline">
                  Change
                </button>
              </div>
              <div className="border-t" />
              {/* Security */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Security</span>
                </div>
                <span className="text-sm text-green-600">Secure</span>
              </div>
            </div>
          </div>

          {/* App Settings */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">App</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-gray-700">Photo quality</div>
                  <div className="text-xs text-gray-500">Higher quality uses more storage</div>
                </div>
                <span className="text-sm text-gray-500">High</span>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-gray-700">Offline mode</div>
                  <div className="text-xs text-gray-500">Photos sync when online</div>
                </div>
                <span className="text-sm text-green-600">Enabled</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">About</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Version</span>
                <span className="text-sm text-gray-500">1.0.0</span>
              </div>
              <div className="border-t" />
              <Link
                href="/"
                className="block text-sm text-[rgb(245,158,11)] hover:underline py-2"
              >
                About JobSite Snap
              </Link>
            </div>
          </div>

          {/* Logout */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
