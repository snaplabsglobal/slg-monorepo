import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      // Return empty stats if user has no organization
      return NextResponse.json({
        totalTransactions: 0,
        needsReview: 0,
        approved: 0,
        totalGST: 0,
        totalPST: 0,
        monthlyTotal: 0,
        avgConfidence: 0,
      });
    }

    const organizationId = (membership as any).organization_id as string;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required', message: 'Month parameter is required' },
        { status: 400 }
      );
    }

    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(startDate).getFullYear(),
      new Date(startDate).getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    // Get all transactions for the month
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('direction', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null);

    if (transactionsError) {
      console.error('Failed to fetch transactions:', transactionsError);
      throw transactionsError;
    }

    const txs = (transactions as any[]) || [];

    // Calculate statistics
    const totalTransactions = txs.length || 0;
    const needsReview = txs.filter((t) => t?.needs_review).length || 0;
    const approved = txs.filter((t) => t?.status === 'approved').length || 0;
    
    // Calculate GST and PST totals (from tax_details JSONB)
    let totalGST = 0;
    let totalPST = 0;
    let monthlyTotal = 0;
    let confidenceSum = 0;

    txs.forEach((t) => {
      if (t?.tax_details?.gst_cents) {
        totalGST += Number(t.tax_details.gst_cents);
      }
      if (t?.tax_details?.pst_cents) {
        totalPST += Number(t.tax_details.pst_cents);
      }
      monthlyTotal += Number(t?.total_amount) || 0;
      confidenceSum += Number(t?.ai_confidence) || 0;
    });

    const avgConfidence = totalTransactions > 0 
      ? confidenceSum / totalTransactions 
      : 0;

    return NextResponse.json({
      totalTransactions,
      needsReview,
      approved,
      totalGST,      // in cents
      totalPST,      // in cents
      monthlyTotal,  // in dollars
      avgConfidence,
    });

  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    );
  }
}
