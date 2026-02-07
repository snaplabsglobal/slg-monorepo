'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Job, JobListResponse } from '@/lib/types'

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (job: Job) => void
}

function CreateJobModal({ isOpen, onClose, onCreated }: CreateJobModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Job name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const job = await res.json()
      onCreated(job)
      setName('')
      setAddress('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Create New Job</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith Residence Kitchen Remodel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main St, City, State"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#FF7A00] text-white rounded-lg hover:bg-[#E66A00] disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface JobCardProps {
  job: Job
}

function JobCard({ job }: JobCardProps) {
  const photoCount = job.photo_count ?? 0
  const lastPhotoDate = job.last_photo_at
    ? new Date(job.last_photo_at).toLocaleDateString()
    : null

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-orange-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{job.name}</h3>
          {job.address && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{job.address}</p>
          )}
        </div>
        <span className={`
          ml-2 px-2 py-0.5 text-xs rounded-full
          ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
        `}>
          {job.status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {photoCount} photo{photoCount !== 1 ? 's' : ''}
        </span>
        {lastPhotoDate && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {lastPhotoDate}
          </span>
        )}
      </div>
    </Link>
  )
}

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/jobs?status=${statusFilter}`)
      if (!res.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data: JobListResponse = await res.json()
      setJobs(data.jobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleJobCreated = (job: Job) => {
    setJobs(prev => [job, ...prev])
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Jobs</h2>
          <p className="text-sm text-gray-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-lg hover:bg-[#E66A00] shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['active', 'archived', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`
              px-3 py-1.5 text-sm rounded-full transition-colors
              ${statusFilter === status
                ? 'bg-[#FF7A00] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading jobs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
          {error}
          <button
            onClick={fetchJobs}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs yet</h3>
          <p className="mt-1 text-gray-500">Create your first job to start capturing photos</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-[#FF7A00] text-white rounded-lg hover:bg-[#E66A00]"
          >
            Create Your First Job
          </button>
        </div>
      )}

      {/* Job Grid */}
      {!loading && !error && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleJobCreated}
      />
    </div>
  )
}
