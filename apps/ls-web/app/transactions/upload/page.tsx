import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import { UploadReceipt } from '@/app/components/receipts'

export default async function TransactionsUploadPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/transactions/upload')
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Receipt</h1>
          <p className="text-sm text-gray-600 mt-1">
            Capture first, process later. Upload returns instantly; AI runs in the background and your list updates automatically.
          </p>
        </div>

        <UploadReceipt />
      </div>
    </DashboardLayout>
  )
}

