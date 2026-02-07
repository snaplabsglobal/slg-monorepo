import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { JobDetail } from '../../components/jobs/JobDetail'

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
    title: job ? `${job.name} | JobSite Snap` : 'Job | JobSite Snap',
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch initial job data
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !job) {
    notFound()
  }

  return <JobDetail job={job} />
}
