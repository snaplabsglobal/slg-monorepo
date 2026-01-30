// app/projects/page.tsx – Projects list (client: offline cache + API)

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { DashboardLayout } from '@/app/components/layout/DashboardLayout'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <ProjectsClient />
    </DashboardLayout>
  )
}
