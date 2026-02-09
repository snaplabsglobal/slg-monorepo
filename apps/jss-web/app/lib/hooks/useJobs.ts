import useSWR from 'swr'
import type { Job, JobListResponse } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

type JobStatus = 'active' | 'archived' | 'all'

/**
 * SWR hook for fetching jobs list
 *
 * Features:
 * - Automatic caching
 * - Revalidation on focus
 * - Optimistic updates via mutate
 */
export function useJobs(status: JobStatus = 'active') {
  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
    `/api/jobs?status=${status}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  )

  const createJob = async (name: string, address?: string) => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to create job')
    }

    const newJob: Job = await res.json()

    // Optimistic update
    mutate(
      current => current
        ? { jobs: [newJob, ...current.jobs], total: current.total + 1 }
        : { jobs: [newJob], total: 1 },
      { revalidate: false }
    )

    return newJob
  }

  return {
    jobs: data?.jobs ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    createJob,
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
