'use client'

import Link from 'next/link'

/**
 * JobSite Snap Registration Page
 * Currently disabled - product not yet launched
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            Coming Soon
          </h1>

          <p className="mt-3 text-gray-600">
            JobSite Snap is not yet open for public registration.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            We're working hard to bring you the best jobsite photo experience.
            Check back soon!
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/"
              className="block w-full rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-amber-600"
            >
              Back to Home
            </Link>

            <Link
              href="/login"
              className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Existing User? Login
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            For early access, contact us at{' '}
            <a
              href="mailto:hello@snaplabs.global"
              className="text-amber-600 hover:underline"
            >
              hello@snaplabs.global
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
