// app/dashboard/ml/page.tsx
// ML monitoring (ELEGANT_USER_DRIVEN_ML: SLG dashboard)

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import { MlMonitoringClient } from '@/app/components/dashboard/MlMonitoringClient'

export default async function MlMonitoringPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email} userName={user.user_metadata?.name ?? undefined}>
      <MlMonitoringClient />
    </DashboardLayout>
  )
}
