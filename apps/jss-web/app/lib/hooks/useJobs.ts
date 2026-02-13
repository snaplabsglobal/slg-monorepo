import useSWR, { mutate as globalMutate } from 'swr'
import type { Job, JobListResponse, CreateJobRequest } from '@/lib/types'

// Fetcher with no-store to prevent caching
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

type JobStatus = 'active' | 'archived' | 'all'

// Helper to get the SWR key for jobs
const getJobsKey = (status: JobStatus) => `/api/jobs?status=${status}`

// Mutate all jobs keys (active/archived/all) to ensure consistency
const mutateAllJobsKeys = async () => {
  await globalMutate(
    (key: unknown) => typeof key === 'string' && key.startsWith('/api/jobs?status=')
  )
}

/**
 * SWR hook for fetching jobs list
 *
 * Features:
 * - Automatic caching with no-store fetch
 * - Revalidation on focus
 * - Proper optimistic updates with rollback on failure
 */
export function useJobs(status: JobStatus = 'active') {
  const key = getJobsKey(status)

  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0, // No deduping to ensure fresh data
    }
  )

  const createJob = async (data: CreateJobRequest) => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to create job')
    }

    const newJob: Job = await res.json()

    // Optimistic update then revalidate
    await mutate(
      current => current
        ? { jobs: [newJob, ...current.jobs], total: current.total + 1 }
        : { jobs: [newJob], total: 1 },
      { revalidate: false }
    )

    // Revalidate all jobs keys
    await mutateAllJobsKeys()

    return newJob
  }

  const archiveJob = async (jobId: string) => {
    // 1) Optimistic update - remove from current list (no revalidate)
    await mutate(
      current => current
        ? { jobs: current.jobs.filter(j => j.id !== jobId), total: current.total - 1 }
        : { jobs: [], total: 0 },
      { revalidate: false }
    )

    // 2) Call API
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
      cache: 'no-store',
    })

    if (!res.ok) {
      // 3) Rollback on failure
      await mutate()
      const data = await res.json()
      throw new Error(data.error || 'Failed to archive job')
    }

    // 4) Success - revalidate all jobs keys to get fresh data
    await mutateAllJobsKeys()

    return res.json()
  }

  const deleteJob = async (jobId: string) => {
    // 1) Optimistic update - remove from list immediately (no revalidate)
    await mutate(
      current => current
        ? { jobs: current.jobs.filter(j => j.id !== jobId), total: current.total - 1 }
        : { jobs: [], total: 0 },
      { revalidate: false }
    )

    // 2) Call delete API
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      cache: 'no-store',
    })

    const json = await res.json()

    // Log for debugging
    console.log('[deleteJob] API response:', json)

    if (!res.ok || !json.ok) {
      // 3) Rollback on failure - revalidate to get real data
      await mutate()
      throw new Error(json.error || 'Failed to delete job')
    }

    // 4) Success - force revalidate all jobs keys to ensure consistency
    await mutateAllJobsKeys()

    return true
  }

  return {
    jobs: data?.jobs ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    createJob,
    archiveJob,
    deleteJob,
  }
}

/**
 * Hook for fetching recent jobs (for Camera Job Selector)
 * Returns max 5 most recently updated active jobs
 */
export function useRecentJobs() {
  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
    '/api/jobs?status=active&limit=5',
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  return {
    recentJobs: data?.jobs ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

/**
 * SWR hook for fetching a single job
 */
export function useJob(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Job>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  )

  return {
    job: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
