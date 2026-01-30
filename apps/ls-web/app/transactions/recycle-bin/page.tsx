// app/transactions/recycle-bin/page.tsx
// Recycle Bin - Shows only deleted transactions (deleted_at IS NOT NULL)

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { TransactionList } from '@/app/components/transactions/TransactionList'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import Link from 'next/link'

export default async function RecycleBinPage() {
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

  // Fetch deleted transactions (only show items deleted within last 30 days for Recycle Bin)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('organization_id', orgMember.organization_id)
    .not('deleted_at', 'is', null) // Show only deleted items
    .gte('deleted_at', thirtyDaysAgoISO) // Only show items deleted within last 30 days
    .order('deleted_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[Recycle Bin Page] Error fetching deleted transactions:', error)
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">回收站</h1>
            <p className="text-sm text-gray-600 mt-1">
              已删除的记录（30 天内可恢复）
            </p>
          </div>
          <Link
            href="/transactions"
            prefetch={false}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← 返回主列表
          </Link>
        </div>

        {transactions && transactions.length > 0 ? (
          <TransactionList
            transactions={transactions}
            organizationId={orgMember.organization_id}
            showRestoreButton={true}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">回收站是空的</p>
            <p className="text-sm text-gray-400">
              已删除的记录会在这里保留 30 天，之后将永久删除
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
