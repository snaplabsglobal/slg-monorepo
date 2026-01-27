import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { isAdminEmail } from '@slo/snap-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Redirect if not admin
  if (!isAdminEmail(user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">SnapLabs Global Admin</h1>
            <p className="text-sm text-gray-600">System Administration Dashboard</p>
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
            Admin Dashboard
          </h2>
          <p className="text-gray-600">
            Manage users, organizations, and system settings
          </p>
        </div>

        {/* Admin Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Member Invitation</CardTitle>
              <CardDescription>
                Invite new members to the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Send invitation emails to new users
              </p>
              <Button className="w-full" asChild>
                <a href="/admin/invite">Invite Member</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">User Management</CardTitle>
              <CardDescription>
                View and manage all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage user accounts and permissions
              </p>
              <Button variant="outline" className="w-full">
                View Users
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Organization Management</CardTitle>
              <CardDescription>
                Manage organizations and plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                View and manage all organizations
              </p>
              <Button variant="outline" className="w-full">
                View Organizations
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage system configuration
              </p>
              <Button variant="outline" className="w-full">
                Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Analytics</CardTitle>
              <CardDescription>
                View platform analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Platform usage and metrics
              </p>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Audit Logs</CardTitle>
              <CardDescription>
                View system audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Track system activities
              </p>
              <Button variant="outline" className="w-full">
                View Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Account Information</CardTitle>
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
              <span className="text-sm font-medium text-gray-700">Role:</span>
              <span className="ml-2 text-sm text-gray-600">Administrator</span>
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
