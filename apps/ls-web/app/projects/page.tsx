// app/projects/page.tsx
// Projects – aggregate receipts and income by project (placeholder)

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import Link from 'next/link'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import { ProjectBreakdownPlaceholder } from '@/app/components/dashboard/ProjectBreakdownPlaceholder'

export default async function ProjectsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track receipts and income by project
          </p>
        </div>

        <ProjectBreakdownPlaceholder />

        <div className="flex gap-4">
          <Link
            href="/transactions"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Receipts →
          </Link>
          <Link
            href="/income"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Income →
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
