'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Upload, Camera, Folder, ArrowRight } from 'lucide-react'

/**
 * JSS Dashboard - Action Hub
 *
 * Simple hub with quick actions:
 * - Take Photo
 * - Import Photos
 * - View Jobs
 */
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* IMPORT PHOTOS CARD */}
        <Link
          href="/import"
          className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-900">
                  Import Photos
                </div>
                <p className="mt-1 text-sm text-amber-700">
                  Organize unassigned photos into jobs
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-amber-600 mt-1" />
          </div>
        </Link>

        {/* JOBS SNAPSHOT */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your jobs</h2>
            <Link
              href="/jobs"
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              View all jobs
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700">
                No jobs yet
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Create your first job to start organizing photos
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              href="/jobs"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              View all jobs
            </Link>
            <Link
              href="/jobs/new"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              + New Job
            </Link>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/camera"
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Take Photo</div>
                <div className="text-xs text-gray-500">Snap first, assign later</div>
              </div>
            </Link>
            <Link
              href="/import"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Upload className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Import</div>
                <div className="text-xs text-gray-500">Organize old photos</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
