// app/income/page.tsx
// Income list – client invoices / money in (direction=income)

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { TransactionList } from '@/app/components/transactions/TransactionList'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'

export default async function IncomePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!orgMember) {
    return (
      <DashboardLayout userEmail={user.email}>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Organization</h1>
            <p className="text-gray-600">Please join an organization to view income.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Income</h1>
          <p className="text-sm text-gray-600 mt-1">
            Invoices and payments from clients
          </p>
        </div>

        <TransactionList
          organizationId={orgMember.organization_id}
          directionFilter="income"
        />
      </div>
    </DashboardLayout>
  )
}
