import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@slo/snap-auth'
import { Camera, Plus } from 'lucide-react'

/**
 * Camera Entry - Instant Redirect to Real Camera
 *
 * CPO Decision: Camera is NOT a form, Camera is an instant entry point.
 *
 * Behavior:
 * - Has active job → redirect to /jobs/[id]/camera (most recent)
 * - No jobs → show "No jobs yet" empty state (do NOT leave camera route)
 *
 * The real camera only exists at /jobs/[id]/camera (SnapCamera)
 */

export const metadata = {
  title: 'Camera | JobSite Snap',
  description: 'Instant photo capture for jobsite documentation',
}

export default async function CameraEntry() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch most recent active job (by updated_at)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)

  // Has job → instant redirect to camera
  if (jobs?.[0]?.id) {
    redirect(`/jobs/${jobs[0].id}/camera`)
  }

  // No jobs → show empty state (stay on camera route)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <div className="flex flex-col items-center max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
          <Camera className="w-10 h-10 text-gray-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">No Jobs Yet</h1>
        <p className="text-gray-400 mb-8">
          Create your first job to start capturing photos.
        </p>

        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create First Job
        </Link>
      </div>
    </div>
  )
}
