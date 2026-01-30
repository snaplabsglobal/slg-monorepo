// ========================================
// Accountant Dashboard API Routes
// ========================================
// API endpoints for accountant dashboard functionality
// ========================================

// ========================================
// 1. Dashboard Stats API
// ========================================
// File: app/api/accountant/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required' },
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
      .eq('organization_id', membership.organization_id)
      .eq('direction', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null);

    if (transactionsError) {
      console.error('Failed to fetch transactions:', transactionsError);
      throw transactionsError;
    }

    // Calculate statistics
    const totalTransactions = transactions.length;
    const needsReview = transactions.filter(t => t.needs_review).length;
    const approved = transactions.filter(t => t.status === 'approved').length;
    
    // Calculate GST and PST totals (from tax_details JSONB)
    let totalGST = 0;
    let totalPST = 0;
    let monthlyTotal = 0;
    let confidenceSum = 0;

    transactions.forEach(t => {
      if (t.tax_details?.gst_cents) {
        totalGST += t.tax_details.gst_cents;
      }
      if (t.tax_details?.pst_cents) {
        totalPST += t.tax_details.pst_cents;
      }
      monthlyTotal += t.total_amount || 0;
      confidenceSum += t.ai_confidence || 0;
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
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

// ========================================
// 2. Transactions List API
// ========================================
// File: app/api/accountant/transactions/route.ts

export async function GET_TRANSACTIONS(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const filter = searchParams.get('filter'); // 'all', 'review', 'approved', 'rejected'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required' },
        { status: 400 }
      );
    }

    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(startDate).getFullYear(),
      new Date(startDate).getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', membership.organization_id)
      .eq('direction', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (filter === 'review') {
      query = query.eq('needs_review', true);
    } else if (filter === 'approved') {
      query = query.eq('status', 'approved');
    } else if (filter === 'rejected') {
      query = query.eq('status', 'rejected');
    }

    const { data: transactions, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// ========================================
// 3. Approve Transaction API
// ========================================
// File: app/api/accountant/transactions/[id]/approve/route.ts

export async function POST_APPROVE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update transaction status
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'approved',
        needs_review: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to approve transaction:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction approved successfully',
    });

  } catch (error: any) {
    console.error('Approve API error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transaction' },
      { status: 500 }
    );
  }
}

// ========================================
// 4. Reject Transaction API
// ========================================
// File: app/api/accountant/transactions/[id]/reject/route.ts

export async function POST_REJECT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for rejection reason
    const { reason } = await request.json();

    // Update transaction status
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'rejected',
        needs_review: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        internal_notes: reason 
          ? `Rejected: ${reason}`
          : 'Rejected by accountant',
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to reject transaction:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction rejected',
    });

  } catch (error: any) {
    console.error('Reject API error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transaction' },
      { status: 500 }
    );
  }
}

// ========================================
// 5. Batch Approve API
// ========================================
// File: app/api/accountant/transactions/batch-approve/route.ts

export async function POST_BATCH_APPROVE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { transaction_ids } = await request.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: 'transaction_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Batch update
    const { data: transactions, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'approved',
        needs_review: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .in('id', transaction_ids)
      .select();

    if (updateError) {
      console.error('Batch approve error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      count: transactions.length,
      message: `${transactions.length} transactions approved`,
    });

  } catch (error: any) {
    console.error('Batch approve API error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transactions' },
      { status: 500 }
    );
  }
}

// ========================================
// 6. Export to CSV API
// ========================================
// File: app/api/accountant/export/route.ts

export async function GET_EXPORT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required' },
        { status: 400 }
      );
    }

    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(startDate).getFullYear(),
      new Date(startDate).getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    // Fetch transactions
    const { data: transactions, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('direction', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: true });

    if (dbError) {
      throw dbError;
    }

    // Generate CSV
    const csv = generateAccountantCSV(transactions);

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ledgersnap-${month}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

// ========================================
// Helper: Generate CSV for Accountants
// ========================================

function generateAccountantCSV(transactions: any[]): string {
  const headers = [
    'Date',
    'Vendor',
    'Category',
    'GIFI Code',
    'Subtotal',
    'GST (5%)',
    'PST (7%)',
    'Total',
    'Currency',
    'Status',
    'Confidence',
    'Meals 50%',
    'Shareholder Loan',
  ];

  const rows = transactions.map(t => {
    const rawData = t.raw_data || {};
    const amounts = rawData.amounts_cents || {};
    const accounting = rawData.accounting || {};

    return [
      t.transaction_date,
      `"${t.vendor_name || ''}"`,
      `"${t.category_user || ''}"`,
      accounting.gifi_code || '',
      (amounts.subtotal || 0) / 100,
      (t.tax_details?.gst_cents || 0) / 100,
      (t.tax_details?.pst_cents || 0) / 100,
      t.total_amount || 0,
      t.currency || 'CAD',
      t.status || 'pending',
      (t.ai_confidence || 0).toFixed(2),
      accounting.is_meals_50_deductible ? 'Yes' : 'No',
      accounting.is_shareholder_loan_potential ? 'Yes' : 'No',
    ];
  });

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

// ========================================
// Export all API handlers
// ========================================

export {
  GET as GET_STATS,
  GET_TRANSACTIONS,
  POST_APPROVE,
  POST_REJECT,
  POST_BATCH_APPROVE,
  GET_EXPORT,
};
