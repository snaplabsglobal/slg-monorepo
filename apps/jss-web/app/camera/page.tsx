import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { JobSelector } from './JobSelector'

/**
 * Camera Page - Job Selection
 *
 * Photos must be associated with a job.
 * User selects job → redirects to /jobs/[id]/camera (SnapCamera)
 */

export const metadata = {
  title: 'Camera | JobSite Snap',
  description: 'Select a job to start capturing photos',
}

export default async function CameraPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's active jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name, address')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(20)

  return <JobSelector jobs={jobs || []} />
}
