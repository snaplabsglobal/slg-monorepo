import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { isAdminEmail } from '@slo/snap-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">SnapLabs Global</h1>
          <div className="flex items-center space-x-4">
            {isAdminEmail(user.email) && (
              <Link href="/admin/dashboard">
                <Button variant="secondary" size="sm">
                  Admin Dashboard
                </Button>
              </Link>
            )}
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
            Welcome to Dashboard
          </h2>
          <p className="text-gray-600">
            Manage your construction projects and teams from one place
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">LedgerSnap</CardTitle>
              <CardDescription>
                Receipt and expense management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Track your receipts and expenses with AI-powered recognition
              </p>
              <Button variant="outline" className="w-full">
                Open LedgerSnap
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-accent">JobSite Snap</CardTitle>
              <CardDescription>
                Job site timecard management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Digitize timecards and manage worker attendance
              </p>
              <Button variant="secondary" className="w-full">
                Open JobSite Snap
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Update your profile, change password, and more
              </p>
              <Button variant="ghost" className="w-full">
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* User Info Section */}
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
