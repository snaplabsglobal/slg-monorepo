import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@slo/snap-auth/components/client'
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
          <div>
            <h1 className="text-2xl font-bold text-primary">LedgerSnap</h1>
            <p className="text-sm text-gray-600">Receipt & Expense Management</p>
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
            Welcome to LedgerSnap
          </h2>
          <p className="text-gray-600">
            Manage your receipts and expenses with AI-powered recognition
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">📸 Snap Receipt</CardTitle>
              <CardDescription>
                Capture and upload receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Use your camera to snap receipts and let AI extract the details automatically
              </p>
              <Button className="w-full" variant="default">
                Take Photo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">📊 Expense Reports</CardTitle>
              <CardDescription>
                View and manage expense reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Generate comprehensive expense reports and track your spending
              </p>
              <Button variant="outline" className="w-full">
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">💰 Recent Expenses</CardTitle>
              <CardDescription>
                Latest expense entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                View your most recent receipt entries and transactions
              </p>
              <Button variant="outline" className="w-full">
                View Expenses
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">📁 Receipt Library</CardTitle>
              <CardDescription>
                All your receipts in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Browse and search through all your stored receipts
              </p>
              <Button variant="outline" className="w-full">
                Browse Library
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">🏷️ Categories</CardTitle>
              <CardDescription>
                Organize expenses by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage expense categories and tags
              </p>
              <Button variant="outline" className="w-full">
                Manage Categories
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">⚙️ Settings</CardTitle>
              <CardDescription>
                Account and app settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Update your profile, preferences, and more
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
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">$0.00</p>
              <p className="text-sm text-gray-500 mt-2">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipts Count</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500 mt-2">Total receipts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500 mt-2">Awaiting approval</p>
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
