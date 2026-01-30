// app/upgrade/page.tsx
// Paywall page for users without access to current app

import { redirect } from 'next/navigation'
import { createServerClient } from '@slo/snap-auth'
import { getUserSubscription } from '@/lib/permissions/permissions'
import { UpgradeModal } from '@/components/upgrade/upgrade-modal'

export const metadata = {
  title: 'Upgrade to JobSite Snap | SnapLabs Global',
  description: 'Unlock powerful project management features',
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user subscription info
  const subscription = await getUserSubscription(user.id)

  // Get query params
  const from = searchParams.from as string || 'direct'
  const appCode = searchParams.app as string || 'jobsite-snap'
  const originalPath = searchParams.path as string
  const dataSnapshot = searchParams.data as string

  // Parse user data snapshot
  let userData: Record<string, any> = {}
  if (dataSnapshot) {
    try {
      userData = JSON.parse(dataSnapshot)
    } catch (e) {
      console.error('Failed to parse user data snapshot')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Full-screen modal */}
      <UpgradeModal
        user={user}
        subscription={subscription}
        appCode={appCode}
        userData={userData}
        originalPath={originalPath}
        referralSource={from}
      />
    </div>
  )
}
