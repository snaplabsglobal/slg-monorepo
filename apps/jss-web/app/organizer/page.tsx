import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '../components/layout'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Photo Organizer | JobSite Snap',
  description: 'Organize and manage your job site photos',
}

export default async function OrganizerPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[rgb(245,158,11)]/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-[rgb(245,158,11)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Photo Organizer</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Organize and manage photos across all jobs
            </p>
          </div>
        </div>

        {/* Coming Soon Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Photo Organizer lets you view, filter, and manage all your job photos in one place.
            Create Evidence Sets, apply bulk tags, and prepare documentation.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(245,158,11)] text-white rounded-lg hover:bg-[rgb(220,140,10)]"
          >
            Go to Jobs
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
