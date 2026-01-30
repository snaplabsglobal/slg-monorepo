// app/settings/page.tsx
// Settings – user and org settings (placeholder)

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'

export default async function SettingsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email} userName={user.user_metadata?.name ?? undefined}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Account and organization settings
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500">Settings coming soon.</p>
          <p className="text-sm text-gray-400 mt-2">Email: {user.email}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Learning</h2>
          <p className="text-sm text-gray-600 mb-4">
            Monitor user-driven learning: corrections and learned patterns (no hardcoded rules).
          </p>
          <Link
            href="/dashboard/ml"
            prefetch={false}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Open ML monitoring
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
