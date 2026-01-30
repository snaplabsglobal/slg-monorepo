// app/api/transactions/route.ts
// General transactions API for listing transactions

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';

export async function GET(request: NextRequest) {
  console.log('[Transactions API] ============================================');
  console.log('[Transactions API] Request received:', {
    url: request.url,
    method: 'GET',
  });
  
  try {
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('[Transactions API] Unauthorized:', { error: authError });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Transactions API] User authenticated:', {
      user_id: user.id,
      user_email: user.email,
    });

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[Transactions API] ============================================');
    console.log('[Transactions API] Organization check:', {
      user_id: user.id,
      user_email: user.email,
      has_membership: !!membership,
      organization_id: membership?.organization_id,
      error: membershipError,
    });
    console.log('[Transactions API] ============================================');

    if (membershipError || !membership) {
      console.warn('[Transactions API] No organization found for user:', user.id);
      return NextResponse.json({
        transactions: [],
      });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const direction = searchParams.get('direction') || 'expense';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // direction=all → do not filter direction
    if (direction !== 'all') {
      query = query.eq('direction', direction)
    }

    // Apply filters
    if (category) {
      query = query.eq('category_user', category);
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data: transactions, error: dbError, count } = await query;

    console.log('[Transactions API] ============================================');
    console.log('[Transactions API] Query result:', {
      organization_id: membership.organization_id,
      direction,
      count: count || 0,
      transactions_count: transactions?.length || 0,
      transaction_ids: transactions?.map(t => t.id) || [],
      error: dbError,
    });
    if (transactions && transactions.length > 0) {
      console.log('[Transactions API] Sample transaction:', {
        id: transactions[0].id,
        vendor_name: transactions[0].vendor_name,
        total_amount: transactions[0].total_amount,
        direction: transactions[0].direction,
        organization_id: transactions[0].organization_id,
      });
    }
    console.log('[Transactions API] ============================================');

    if (dbError) {
      console.error('[Transactions API] Database error:', {
        error: dbError,
        code: dbError?.code,
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint,
      });
      throw dbError;
    }

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
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
