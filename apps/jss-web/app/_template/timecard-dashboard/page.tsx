/**
 * Template: Timecard Dashboard (Not used in JSS Phase 1)
 * Preserved for future reference if needed for Timecard features.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@slo/snap-auth/components/client'
import Link from 'next/link'

export default async function TimecardDashboardTemplatePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Template Notice */}
      <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm text-yellow-800">
        <b>Template:</b> Timecard Dashboard (Not used in JSS Phase 1)
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-amber-600">JobSite Snap</h1>
            <p className="text-sm text-gray-600">Job Site Photo Management</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to JobSite Snap
          </h2>
          <p className="text-gray-600">
            Organize and find your job site photos effortlessly
          </p>
        </div>

        {/* Other Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Upload Timecard</CardTitle>
              <CardDescription>
                Snap and digitize paper timecards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Use your camera to capture paper timecards and convert them to digital records
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/camera">Take Photo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Reports & Analytics</CardTitle>
              <CardDescription>
                Generate work reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                View analytics and generate reports for payroll and project tracking
              </p>
              <Button variant="outline" className="w-full">
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Settings</CardTitle>
              <CardDescription>
                Account and app settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Update your profile, preferences, and job site settings
              </p>
              <Button variant="ghost" className="w-full">
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hours This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500 mt-2">Total hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500 mt-2">On job site</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timecards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500 mt-2">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="ml-2 text-sm text-gray-600">{user.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">User ID:</span>
              <span className="ml-2 text-sm text-gray-600 font-mono">{user.id}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-sm text-gray-600">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
