import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { JobList } from '../components/jobs/JobList'
import { DashboardLayout } from '../components/layout'

export const metadata = {
  title: 'Jobs | JobSite Snap',
  description: 'Manage your job sites and photos',
}

export default async function JobsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Your Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your job sites and photos
            </p>
          </div>
        </div>

        <JobList />
      </div>
    </DashboardLayout>
  )
}
