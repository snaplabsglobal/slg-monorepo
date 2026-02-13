'use client'

import Link from 'next/link'
import Image from 'next/image'

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
          <div className="mx-auto">
            <Image
              src="/icons/jss-logo.svg"
              alt="JobSite Snap"
              width={48}
              height={48}
              className="mx-auto rounded-xl"
            />
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
