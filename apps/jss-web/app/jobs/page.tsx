import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { JobList } from '../components/jobs/JobList'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#FF7A00' }}>JobSite Snap</h1>
            <p className="text-xs text-gray-500">Job Photos</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 hidden sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <JobList />
      </main>
    </div>
  )
}
