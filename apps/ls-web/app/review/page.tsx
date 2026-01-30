import { AccountantDashboard } from '@/app/components/accountant/AccountantDashboard';
import { DashboardLayout } from '@/app/components/layout/DashboardLayout';
import { createServerClient } from '@slo/snap-auth';
import { redirect } from 'next/navigation';

export default async function ReviewQueuePage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-600 mt-1">
            Confirm receipts and export for your accountant
          </p>
        </div>
        <AccountantDashboard />
      </div>
    </DashboardLayout>
  );
}
