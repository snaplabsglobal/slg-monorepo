import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const db = supabase as any;
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has organization (optional check, but good for security)
    const { data: membership } = await db
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    // Parse request body
    const { transaction_ids } = await request.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: 'transaction_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Batch update
    let updateQuery = db
      .from('transactions')
      .update({
        status: 'approved',
        needs_review: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .in('id', transaction_ids);

    const organizationId = (membership as any)?.organization_id as string | undefined;
    if (organizationId) {
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }

    const { data: transactions, error: updateError } = await updateQuery
      .select();

    if (updateError) {
      console.error('Batch approve error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      count: transactions?.length || 0,
      message: `${transactions?.length || 0} transactions approved`,
    });

  } catch (error: any) {
    console.error('Batch approve API error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transactions', message: error.message },
      { status: 500 }
    );
  }
}
