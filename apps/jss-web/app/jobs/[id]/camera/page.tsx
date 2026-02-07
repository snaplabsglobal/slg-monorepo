import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { SnapCamera } from '../../../components/snap-evidence/SnapCamera'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: job ? `Capture - ${job.name} | JobSite Snap` : 'Capture | JobSite Snap',
  }
}

export default async function JobCameraPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch job data
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, name, address')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !job) {
    notFound()
  }

  return <SnapCamera job={job} />
}
