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

    // Parse query parameters early (used in filename even for empty CSV)
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const filenameMonth = month || 'all';

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      // Return empty CSV if user has no organization
      const emptyCsv = 'Date,Vendor,Category,GIFI Code,Subtotal,GST (5%),PST (7%),Total,Currency,Status,Confidence,Meals 50%,Shareholder Loan\n';
      return new NextResponse(emptyCsv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ledgersnap-${filenameMonth}.csv"`,
        },
      });
    }

    const organizationId = (membership as any).organization_id as string

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

    // Fetch transactions
    const { data: transactions, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('direction', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: true });

    if (dbError) {
      throw dbError;
    }

    // Generate CSV
    const csv = generateAccountantCSV(transactions || []);

    // Layer 3: export lock (mark exported)
    // Best-effort: if schema doesn't have these columns yet, this will be ignored by PostgREST? (it will error)
    // We swallow errors to avoid breaking export download.
    if (transactions && transactions.length > 0) {
      const ids = transactions.map((t: any) => t.id).filter(Boolean)
      try {
        // NOTE: Supabase generated `Database` types may lag behind migrations.
        // Cast the client to `any` to avoid a build-blocking `never` update type.
        await (supabase as any)
          .from('transactions')
          .update({
            status: 'exported',
            exported_at: new Date().toISOString(),
            exported_by: user.id,
          })
          .in('id', ids)
          .eq('organization_id', organizationId)
      } catch (e) {
        console.warn('[Export] Failed to lock exported transactions (safe to ignore):', e)
      }
    }

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ledgersnap-${filenameMonth}.csv"`,
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

// Helper: Generate CSV for Accountants
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
