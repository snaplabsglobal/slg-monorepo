# Accountant API Routes - TypeScript 修复版本

以下是所有需要的 API Route 文件，已修复 TypeScript 类型错误。

---

## 1. Stats API
**文件**: `app/api/accountant/stats/route.ts`

```typescript
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
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
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
    const totalTransactions = transactions?.length || 0;
    const needsReview = transactions?.filter((t: any) => t.needs_review).length || 0;
    const approved = transactions?.filter((t: any) => t.status === 'approved').length || 0;
    
    // Calculate GST and PST totals (from tax_details JSONB)
    let totalGST = 0;
    let totalPST = 0;
    let monthlyTotal = 0;
    let confidenceSum = 0;

    transactions?.forEach((t: any) => {
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
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 2. Transactions List API
**文件**: `app/api/accountant/transactions/route.ts`

```typescript
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
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
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
```

---

## 3. Approve Transaction API
**文件**: `app/api/accountant/transactions/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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
      { error: 'Failed to approve transaction', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 4. Reject Transaction API
**文件**: `app/api/accountant/transactions/[id]/reject/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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
    let reason = '';
    try {
      const body = await request.json();
      reason = body.reason || '';
    } catch {
      // Body might be empty
    }

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
      { error: 'Failed to reject transaction', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 5. Batch Approve API
**文件**: `app/api/accountant/transactions/batch-approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const transaction_ids = body.transaction_ids;

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
```

---

## 6. Export CSV API
**文件**: `app/api/accountant/export/route.ts`

```typescript
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
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
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
    const csv = generateAccountantCSV(transactions || []);

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
      { error: 'Failed to export data', message: error.message },
      { status: 500 }
    );
  }
}

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
```

---

## 部署清单

### 1. 创建目录结构
```bash
mkdir -p app/api/accountant/stats
mkdir -p app/api/accountant/transactions/[id]/approve
mkdir -p app/api/accountant/transactions/[id]/reject
mkdir -p app/api/accountant/transactions/batch-approve
mkdir -p app/api/accountant/export
```

### 2. 复制文件
将上述代码分别保存到对应的 `route.ts` 文件中

### 3. 验证 TypeScript
```bash
pnpm run type-check
```

### 4. 测试构建
```bash
pnpm run build
```

---

## 关键修复点

1. **类型推断修复**
   - 添加显式错误处理：`error: membershipError`
   - 使用可选链：`transactions?.length`
   - 类型断言：`(t: any)`

2. **空值处理**
   - 所有数据库查询都检查错误
   - 使用 `|| []` 和 `|| 0` 提供默认值

3. **一致的错误响应**
   - 统一返回格式
   - 包含 `message` 字段

4. **安全性**
   - 所有 API 都验证认证
   - 检查组织成员资格
   - 参数验证

---

## 测试建议

```bash
# 1. Stats API
curl http://localhost:3000/api/accountant/stats?month=2026-01

# 2. Transactions API
curl http://localhost:3000/api/accountant/transactions?month=2026-01&filter=review

# 3. Approve API
curl -X POST http://localhost:3000/api/accountant/transactions/[id]/approve

# 4. Export API
curl http://localhost:3000/api/accountant/export?month=2026-01
```
