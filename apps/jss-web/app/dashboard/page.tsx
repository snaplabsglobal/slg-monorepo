import { redirect } from 'next/navigation'

/**
 * Dashboard redirects to /jobs (Projects list)
 *
 * Per CPO directive: JSS Phase 1 首屏 = Jobs列表，不是Dashboard
 * "先选Project再拍照" - 必须先进入Job才能拍照
 */
export default function DashboardPage() {
  redirect('/jobs')
}
