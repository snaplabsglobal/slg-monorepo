'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Folder, Check } from 'lucide-react'

interface Job {
  id: string
  name: string
  address: string | null
}

interface JobContextBarProps {
  currentJob: Job
  recentJobs: Job[]
  onJobSelect: (job: Job) => void
  isLoading?: boolean
}

/**
 * Job Context Bar for Camera Page
 *
 * Spec: 260207_JSS_Camera页面改进与实时照片显示完整方案.md
 *
 * Rules:
 * - Shows current Job context (not full screen camera)
 * - Can switch between recent 5 jobs without leaving camera
 * - Switching job does not reset camera or interrupt flow
 */
export function JobContextBar({
  currentJob,
  recentJobs,
  onJobSelect,
  isLoading = false,
}: JobContextBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleJobSelect = (job: Job) => {
    if (job.id !== currentJob.id) {
      onJobSelect(job)
    }
    setIsOpen(false)
  }

  return (
    <div
      ref={dropdownRef}
      className="relative"
      data-testid="job-context-bar"
    >
      {/* Current Job Display + Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-black/40 hover:bg-black/60 rounded-lg backdrop-blur-sm transition-colors"
        data-testid="job-switcher"
      >
        <Folder className="w-4 h-4 text-[rgb(245,158,11)]" />
        <div className="text-left">
          <p className="text-white text-sm font-medium truncate max-w-[180px]">
            {currentJob.name}
          </p>
          {currentJob.address && (
            <p className="text-white/60 text-xs truncate max-w-[180px]">
              {currentJob.address}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown: Recent Jobs */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-white/10 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-white/60 text-xs font-medium">Switch Job</p>
          </div>

          {isLoading ? (
            <div className="px-3 py-4 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[rgb(245,158,11)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="px-3 py-4 text-center text-white/60 text-sm">
              No other jobs available
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {recentJobs.map((job, index) => (
                <button
                  key={job.id}
                  onClick={() => handleJobSelect(job)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors ${
                    job.id === currentJob.id ? 'bg-white/5' : ''
                  }`}
                  data-testid={`job-option-${index}`}
                >
                  <Folder className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm truncate">{job.name}</p>
                    {job.address && (
                      <p className="text-white/50 text-xs truncate">{job.address}</p>
                    )}
                  </div>
                  {job.id === currentJob.id && (
                    <Check className="w-4 h-4 text-[rgb(245,158,11)] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
