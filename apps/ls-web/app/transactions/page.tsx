// app/transactions/page.tsx
// Transactions list page with tag support

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { TransactionList } from '@/app/components/transactions/TransactionList'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'

export default async function TransactionsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's organization
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
            <p className="text-gray-600">Please join an organization to view transactions.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('organization_id', orgMember.organization_id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[Transactions Page] Error fetching transactions:', error)
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vendor documents (purchases & refunds) – tags and categories
          </p>
        </div>

        <TransactionList
          transactions={transactions || []}
          organizationId={orgMember.organization_id}
        />
      </div>
    </DashboardLayout>
  )
}
