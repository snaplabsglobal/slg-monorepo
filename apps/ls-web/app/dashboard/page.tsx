import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import { LsDashboard } from '@/app/components/dashboard/LsDashboard'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <LsDashboard />
    </DashboardLayout>
  )
}
