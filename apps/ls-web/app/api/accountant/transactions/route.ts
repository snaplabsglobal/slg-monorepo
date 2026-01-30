import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const db = supabase as any;
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await db
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      // Return empty transactions if user has no organization
      return NextResponse.json({
        transactions: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const filter = searchParams.get('filter'); // 'all', 'review', 'approved', 'rejected'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required', message: 'Month parameter is required' },
        { status: 400 }
      );
    }

    const organizationId = (membership as any).organization_id as string;

    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(startDate).getFullYear(),
      new Date(startDate).getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    // Build query
    let query = db
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
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
      { error: 'Failed to fetch transactions', message: error.message },
      { status: 500 }
    );
  }
}
