import useSWR, { mutate as globalMutate } from 'swr'
import type { Job, JobListResponse } from '@/lib/types'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => {
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

  const archiveJob = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to archive job')
    }

    // Optimistic update - remove from active list
    mutate(
      current => current
        ? { jobs: current.jobs.filter(j => j.id !== jobId), total: current.total - 1 }
        : { jobs: [], total: 0 },
      { revalidate: false }
    )

    // Also refresh archived list
    globalMutate((key: unknown) =>
      typeof key === 'string' && key.includes('/api/jobs')
    )

    return res.json()
  }

  const deleteJob = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete job')
    }

    // Optimistic update
    mutate(
      current => current
        ? { jobs: current.jobs.filter(j => j.id !== jobId), total: current.total - 1 }
        : { jobs: [], total: 0 },
      { revalidate: false }
    )

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
