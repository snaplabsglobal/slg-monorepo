'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'

/**
 * Settings Page
 *
 * Per CDO document:
 * - Part of main navigation: Jobs → Camera → Self-Rescue → Settings
 * - Accessible from sidebar and bottom nav
 */
export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-4">
          {/* Account Section */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Email</span>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
              <div className="border-t" />
              <Link
                href="/auth/signout"
                className="block w-full rounded-xl border border-red-200 px-4 py-3 text-center text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </Link>
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
                className="block text-sm text-amber-600 hover:text-amber-700 py-2"
              >
                About JobSite Snap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
