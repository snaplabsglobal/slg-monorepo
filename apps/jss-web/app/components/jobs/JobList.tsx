'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useJobs } from '@/lib/hooks'
import { Archive, Trash2, MoreVertical, Undo } from 'lucide-react'
import type { Job } from '@/lib/types'

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, address?: string) => Promise<void>
  isSubmitting: boolean
  error: string
}

function CreateJobModal({ isOpen, onClose, onSubmit, isSubmitting, error }: CreateJobModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await onSubmit(name.trim(), address.trim() || undefined)
    setName('')
    setAddress('')
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(245,158,11)] focus:border-[rgb(245,158,11)]"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(245,158,11)] focus:border-[rgb(245,158,11)]"
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
              className="flex-1 px-4 py-2 bg-[rgb(245,158,11)] text-white rounded-lg hover:bg-[rgb(220,140,10)] disabled:opacity-50"
              disabled={isSubmitting || !name.trim()}
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
  onArchive?: (jobId: string) => Promise<void>
  onUnarchive?: (jobId: string) => Promise<void>
  onDelete?: (jobId: string) => Promise<void>
}

function JobCard({ job, onArchive, onUnarchive, onDelete }: JobCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const photoCount = job.photo_count ?? 0
  const lastPhotoDate = job.last_photo_at
    ? new Date(job.last_photo_at).toLocaleDateString()
    : null

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isProcessing || !onArchive) return
    setIsProcessing(true)
    try {
      await onArchive(job.id)
    } finally {
      setIsProcessing(false)
      setShowMenu(false)
    }
  }

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isProcessing || !onUnarchive) return
    setIsProcessing(true)
    try {
      await onUnarchive(job.id)
    } finally {
      setIsProcessing(false)
      setShowMenu(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isProcessing || !onDelete) return
    setIsProcessing(true)
    try {
      await onDelete(job.id)
    } finally {
      setIsProcessing(false)
      setShowDeleteConfirm(false)
      setShowMenu(false)
    }
  }

  return (
    <div className="relative">
      <Link
        href={`/jobs/${job.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-[rgb(245,158,11)] transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{job.name}</h3>
            {job.address && (
              <p className="text-sm text-gray-500 truncate mt-0.5">{job.address}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={`
              px-2 py-0.5 text-xs rounded-full
              ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
            `}>
              {job.status}
            </span>
            {/* Menu button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
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

      {/* Dropdown menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 top-12 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]">
            {job.status === 'active' ? (
              <button
                onClick={handleArchive}
                disabled={isProcessing}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            ) : (
              <button
                onClick={handleUnarchive}
                disabled={isProcessing}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Undo className="w-4 h-4" />
                Unarchive
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              disabled={isProcessing}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Job?
            </h3>
            <p className="text-gray-600 mb-4">
              Deleting &quot;{job.name}&quot; will permanently delete all {photoCount} photo{photoCount !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function JobList() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { jobs, isLoading, isError, createJob, archiveJob, deleteJob, mutate } = useJobs(statusFilter)

  const handleArchiveJob = async (jobId: string) => {
    await archiveJob(jobId)
  }

  const handleUnarchiveJob = async (jobId: string) => {
    // Unarchive = set status back to active
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    if (!res.ok) {
      throw new Error('Failed to unarchive job')
    }
    mutate()
  }

  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId)
  }

  const handleCreateJob = async (name: string, address?: string) => {
    setIsCreating(true)
    setCreateError('')

    try {
      await createJob(name, address)
      setShowCreateModal(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setIsCreating(false)
    }
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
          className="flex items-center gap-2 px-4 py-2 bg-[rgb(245,158,11)] text-white rounded-lg hover:bg-[rgb(220,140,10)] shadow-sm"
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
                ? 'bg-[rgb(245,158,11)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[rgb(245,158,11)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading jobs...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
          Failed to load jobs
          <button
            onClick={() => mutate()}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs yet</h3>
          <p className="mt-1 text-gray-500">Create your first job to start capturing photos</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-[rgb(245,158,11)] text-white rounded-lg hover:bg-[rgb(220,140,10)]"
          >
            Create Your First Job
          </button>
        </div>
      )}

      {/* Job Grid */}
      {!isLoading && !isError && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onArchive={handleArchiveJob}
              onUnarchive={handleUnarchiveJob}
              onDelete={handleDeleteJob}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateError('')
        }}
        onSubmit={handleCreateJob}
        isSubmitting={isCreating}
        error={createError}
      />
    </div>
  )
}
