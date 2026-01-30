import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    // Update transaction status
    let updateQuery = db
      .from('transactions')
      .update({
        status: 'approved',
        needs_review: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', id);

    if (membership?.organization_id) {
      updateQuery = updateQuery.eq('organization_id', membership.organization_id);
    }

    const { data: transaction, error: updateError } = await updateQuery
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
      { error: 'Failed to approve transaction', message: error.message },
      { status: 500 }
    );
  }
}
