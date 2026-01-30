// app/reports/page.tsx
// Reports – monthly and category analysis

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import { MonthlyReport } from '@/app/components/reports/MonthlyReport'
import { ReportsTaxSummary } from '@/app/components/reports/ReportsTaxSummary'

export default async function ReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monthly spending, tax summary, and category breakdown
          </p>
        </div>

        <ReportsTaxSummary />

        <MonthlyReport />
      </div>
    </DashboardLayout>
  )
}
