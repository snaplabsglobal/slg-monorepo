import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { SnapCamera } from '../../../components/snap-evidence/SnapCamera'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Test mode check - allow in CI, development, or when harness is explicitly enabled
const isTestMode = (harness: string | string[] | undefined): boolean => {
  if (harness !== '1') return false
  // Allow test mode in CI, development, or when explicitly enabled via build-time flag
  // NEXT_PUBLIC_ALLOW_HARNESS is baked in at build time, while CI is a runtime env var
  return (
    process.env.CI === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ALLOW_HARNESS === 'true'
  )
}

// Mock job data for testing
const MOCK_JOB = {
  id: 'test-job',
  name: 'Test Job (Harness Mode)',
  address: '123 Test Street, Test City, TC 12345',
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { id } = await params
  const { harness } = await searchParams

  // Test mode uses mock data
  if (isTestMode(harness) && id === 'test-job') {
    return {
      title: `Capture - ${MOCK_JOB.name} | JobSite Snap`,
    }
  }

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

export default async function JobCameraPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { harness } = await searchParams

  // Test mode: bypass auth and use mock job for CI/Playwright tests
  if (isTestMode(harness) && id === 'test-job') {
    return <SnapCamera job={MOCK_JOB} />
  }

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
