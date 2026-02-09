'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Job {
  id: string
  name: string
  address: string | null
}

interface JobSelectorProps {
  jobs: Job[]
}

/**
 * Job Selector for Camera
 *
 * User must select a job before accessing the camera.
 * Redirects to /jobs/[id]/camera which uses SnapCamera (non-blocking).
 */
export function JobSelector({ jobs }: JobSelectorProps) {
  const router = useRouter()

  const handleSelectJob = (jobId: string) => {
    router.push(`/jobs/${jobId}/camera`)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <Link href="/jobs" className="text-white/70 hover:text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
        <h1 className="text-white font-semibold">Select Job</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-auto p-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-400 mb-4">No jobs yet</p>
            <Link
              href="/jobs"
              className="inline-block px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600"
            >
              Create Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm mb-4">
              Select a job to start capturing photos
            </p>
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => handleSelectJob(job.id)}
                className="w-full text-left p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{job.name}</div>
                    {job.address && (
                      <div className="text-gray-400 text-sm mt-0.5">{job.address}</div>
                    )}
                  </div>
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-center text-gray-500 text-sm">
          Photos are saved to the selected job
        </p>
      </div>
    </div>
  )
}
