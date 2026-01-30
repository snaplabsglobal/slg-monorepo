import { createServerClient } from '@slo/snap-auth';
import { redirect } from 'next/navigation';

/**
 * Legacy route: /accountant redirects to /review (Review Queue).
 * Navigation and docs now use "Review Queue" at /review.
 */
export default async function AccountantPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  redirect('/review');
}
