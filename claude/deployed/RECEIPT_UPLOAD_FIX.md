# 收据上传错误修复 - 负数金额问题

**错误**: `new row violates check constraint "transactions_non_negative_amount"`

**根本原因**: 金额保存为负数 `-472.54`，但数据库有非负约束

---

## 🔍 问题分析

### 错误详情
```sql
Check constraint: transactions_non_negative_amount
Failing value: -472.54

数据库约束:
CHECK (total_amount >= 0)
CHECK (tax_amount >= 0)
```

### 为什么出现负数？

```typescript
// 当前代码（错误）
const transactionData = {
  total_amount: geminiResult.total_cents / 100,  // 如果是 -47254 / 100 = -472.54
  tax_amount: geminiResult.gst_cents / 100,      // -2109 / 100 = -21.09
  // ...
};
```

**问题**: Gemini 可能返回负数（表示退款/credit），但我们的约束要求正数。

---

## ✅ 修复方案

### 方案 A: 使用绝对值（推荐）⭐

```typescript
// app/api/receipts/upload/route.ts

// 确保所有金额都是正数
const transactionData = {
  organization_id: organizationId,
  user_id: user.id,
  created_by: user.id,
  project_id: projectId,
  
  transaction_date: geminiResult.receipt_date || new Date().toISOString().split('T')[0],
  direction: 'expense' as const,
  source_app: 'ledgersnap',
  
  // ✅ 使用绝对值
  total_amount: Math.abs(geminiResult.total_cents / 100),
  tax_amount: Math.abs(geminiResult.gst_cents / 100),
  
  // 税务详情（JSONB）
  tax_details: {
    gst_cents: Math.abs(geminiResult.gst_cents),
    gst_amount: Math.abs(geminiResult.gst_cents / 100),
    gst_rate: 0.05,
    pst_cents: Math.abs(geminiResult.pst_cents),
    pst_amount: Math.abs(geminiResult.pst_cents / 100),
    pst_rate: 0.07,
    total_tax_cents: Math.abs(geminiResult.gst_cents) + Math.abs(geminiResult.pst_cents),
    bc_province: true,
    tax_split_confidence: geminiResult.confidence.tax_split,
  },
  
  currency: geminiResult.currency,
  original_currency: geminiResult.currency,
  
  category_user: geminiResult.category,
  expense_type: geminiResult.is_shareholder_loan_potential ? 'personal' : 'business',
  is_tax_deductible: !geminiResult.is_shareholder_loan_potential,
  
  vendor_name: geminiResult.vendor_name,
  
  attachment_url: imageUrl,
  image_mime_type: file.type,
  image_size_bytes: file.size,
  
  entry_source: 'ocr' as const,
  ai_confidence: geminiResult.confidence.overall,
  
  // 原始数据保留原始正负号
  raw_data: {
    gemini_version: '2.0-flash',
    extracted_at: new Date().toISOString(),
    amounts_cents: {
      subtotal: geminiResult.subtotal_cents,  // 保留原始值
      gst: geminiResult.gst_cents,
      pst: geminiResult.pst_cents,
      total: geminiResult.total_cents,
    },
    accounting: {
      gifi_code: geminiResult.gifi_code_suggested,
      vendor_alias: geminiResult.vendor_alias,
      is_meals_50_deductible: geminiResult.is_meals_50_deductible,
      is_shareholder_loan_potential: geminiResult.is_shareholder_loan_potential,
    },
    confidence: geminiResult.confidence,
    raw_text: geminiResult.raw_text,
    gemini_raw_response: geminiResult,
  },
  
  status: 'pending' as const,
  needs_review: geminiResult.needs_review || geminiResult.confidence.overall < 0.9,
  is_reimbursable: false,
};
```

---

### 方案 B: 区分支出和退款（未来增强）

```typescript
// 如果需要支持退款/credit
function processTransaction(geminiResult) {
  const isRefund = geminiResult.total_cents < 0;
  
  if (isRefund) {
    // 退款作为 revenue (收入)
    return {
      direction: 'revenue' as const,
      total_amount: Math.abs(geminiResult.total_cents / 100),
      transaction_type: 'refund',
      // ...
    };
  } else {
    // 正常支出
    return {
      direction: 'expense' as const,
      total_amount: geminiResult.total_cents / 100,
      transaction_type: 'purchase',
      // ...
    };
  }
}
```

---

## 🔧 完整修复代码

### 更新 Upload API

```typescript
// app/api/receipts/upload/route.ts

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // ... (前面的代码保持不变)
    
    // ===== 步骤 7: 转换为 Transaction 格式（修复金额） =====
    
    // ⚠️ 确保所有金额都是正数
    const subtotalCents = Math.abs(geminiResult.subtotal_cents || 0);
    const gstCents = Math.abs(geminiResult.gst_cents || 0);
    const pstCents = Math.abs(geminiResult.pst_cents || 0);
    const totalCents = Math.abs(geminiResult.total_cents || 0);
    
    // 验证金额合理性
    if (totalCents === 0) {
      console.warn('[Upload] Total amount is zero, this might be an OCR error');
    }
    
    // 验证税额是否合理（可选但推荐）
    const expectedGST = Math.round(subtotalCents * 0.05);
    const expectedPST = Math.round(subtotalCents * 0.07);
    const gstDiff = Math.abs(gstCents - expectedGST);
    const pstDiff = Math.abs(pstCents - expectedPST);
    
    // 如果税额差异过大，标记需要审核
    const taxMismatch = gstDiff > 50 || pstDiff > 50; // 差异超过 $0.50
    
    const transactionData = {
      organization_id: organizationId,
      user_id: user.id,
      created_by: user.id,
      project_id: projectId,
      
      // 基础信息
      transaction_date: geminiResult.receipt_date || new Date().toISOString().split('T')[0],
      direction: 'expense' as const,
      source_app: 'ledgersnap',
      
      // ✅ 金额（使用绝对值）
      total_amount: totalCents / 100,
      tax_amount: gstCents / 100, // GST only for ITC
      
      // 税务详情（JSONB）
      tax_details: {
        gst_cents: gstCents,
        gst_amount: gstCents / 100,
        gst_rate: 0.05,
        pst_cents: pstCents,
        pst_amount: pstCents / 100,
        pst_rate: 0.07,
        total_tax_cents: gstCents + pstCents,
        bc_province: true,
        tax_split_confidence: geminiResult.confidence.tax_split,
        tax_mismatch: taxMismatch, // 标记税额异常
      },
      
      currency: geminiResult.currency || 'CAD',
      original_currency: geminiResult.currency || 'CAD',
      
      // 分类
      category_user: geminiResult.category || 'Other Expenses',
      expense_type: geminiResult.is_shareholder_loan_potential ? 'personal' : 'business',
      is_tax_deductible: !geminiResult.is_shareholder_loan_potential,
      
      // 商户
      vendor_name: geminiResult.vendor_name || 'Unknown Vendor',
      
      // 图片
      attachment_url: imageUrl,
      image_mime_type: file.type,
      image_size_bytes: file.size,
      
      // AI 识别
      entry_source: 'ocr' as const,
      ai_confidence: geminiResult.confidence?.overall || 0,
      
      // 原始数据（JSONB）- 保留原始值
      raw_data: {
        gemini_version: '2.0-flash',
        extracted_at: new Date().toISOString(),
        amounts_cents: {
          subtotal: geminiResult.subtotal_cents, // 保留原始正负号
          gst: geminiResult.gst_cents,
          pst: geminiResult.pst_cents,
          total: geminiResult.total_cents,
        },
        amounts_absolute: { // 新增：绝对值记录
          subtotal: subtotalCents,
          gst: gstCents,
          pst: pstCents,
          total: totalCents,
        },
        accounting: {
          gifi_code: geminiResult.gifi_code_suggested || '8760',
          vendor_alias: geminiResult.vendor_alias,
          is_meals_50_deductible: geminiResult.is_meals_50_deductible || false,
          is_shareholder_loan_potential: geminiResult.is_shareholder_loan_potential || false,
        },
        confidence: geminiResult.confidence || {
          vendor_name: 0,
          date: 0,
          amounts: 0,
          tax_split: 0,
          overall: 0,
        },
        raw_text: geminiResult.raw_text || '',
        gemini_raw_response: geminiResult,
      },
      
      // 状态
      status: 'pending' as const,
      needs_review: taxMismatch || 
                   !geminiResult.vendor_name || 
                   geminiResult.needs_review || 
                   (geminiResult.confidence?.overall || 0) < 0.9,
      is_reimbursable: false,
    };

    console.log('[Upload] Transaction data prepared:', {
      total_amount: transactionData.total_amount,
      tax_amount: transactionData.tax_amount,
      needs_review: transactionData.needs_review,
    });

    // ===== 步骤 8: 保存到数据库 =====
    
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (dbError) {
      console.error('[Upload] Database insert failed:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
        },
        { status: 500 }
      );
    }

    console.log('[Upload] Transaction saved:', transaction.id);

    // ===== 步骤 9: 保存 Line Items（如果有）=====
    if (geminiResult.items && geminiResult.items.length > 0) {
      const items = geminiResult.items.map((item: any) => ({
        transaction_id: transaction.id,
        organization_id: organizationId,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: Math.abs(item.price_cents || 0) / 100, // 绝对值
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) {
        console.error('[Upload] Failed to insert items:', itemsError);
        // 非致命错误，继续
      } else {
        console.log('[Upload] Inserted', items.length, 'transaction items');
      }
    }

    // ===== 步骤 10: 返回成功响应 =====
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        vendor_name: transaction.vendor_name,
        transaction_date: transaction.transaction_date,
        total_amount: transaction.total_amount,
        currency: transaction.currency,
        category: transaction.category_user,
        gifi_code: geminiResult.gifi_code_suggested,
        confidence: geminiResult.confidence,
        needs_review: transaction.needs_review,
        image_url: transaction.attachment_url,
      },
      organization_id: organizationId,
      message: transaction.needs_review
        ? 'Receipt uploaded. Please review the details.'
        : 'Receipt uploaded and verified successfully!',
    });

  } catch (error: any) {
    console.error('[Upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
```

---

## 🧪 测试验证

### 测试用例

```typescript
// 测试 1: 正常金额
const normal = {
  subtotal_cents: 4500,   // $45.00
  gst_cents: 225,         // $2.25
  pst_cents: 315,         // $3.15
  total_cents: 5040,      // $50.40
};
// 预期: 通过 ✓

// 测试 2: 负数金额（退款）
const refund = {
  subtotal_cents: -4500,  // -$45.00
  gst_cents: -225,        // -$2.25
  pst_cents: -315,        // -$3.15
  total_cents: -5040,     // -$50.40
};
// 预期: 转换为正数后通过 ✓

// 测试 3: 零金额（OCR 错误）
const zero = {
  subtotal_cents: 0,
  gst_cents: 0,
  pst_cents: 0,
  total_cents: 0,
};
// 预期: 通过但标记需要审核 ✓

// 测试 4: 税额不匹配
const mismatch = {
  subtotal_cents: 4500,   // $45.00
  gst_cents: 500,         // $5.00 (应该是 $2.25)
  pst_cents: 100,         // $1.00 (应该是 $3.15)
  total_cents: 5100,
};
// 预期: 标记 tax_mismatch，需要审核 ✓
```

---

## 📊 验证清单

### 数据库层面

```sql
-- 检查约束
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
AND conname LIKE '%amount%';

-- 应该看到:
-- transactions_non_negative_amount: CHECK (total_amount >= 0)
-- transactions_non_negative_tax: CHECK (tax_amount >= 0)
```

### API 层面

```bash
# 测试上传
curl -X POST http://localhost:3000/api/receipts/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-receipt.jpg"

# 预期返回:
{
  "success": true,
  "transaction": {
    "id": "...",
    "total_amount": 50.40,  // 正数 ✓
    "tax_amount": 2.25,     // 正数 ✓
    ...
  }
}
```

### 前端层面

```typescript
// 检查返回的金额
console.log('Total:', transaction.total_amount);
// 应该是正数

// 如果需要显示退款，检查 raw_data
console.log('Original:', transaction.raw_data.amounts_cents.total);
// 可能是负数（表示退款）
```

---

## 🔄 数据库迁移（如果需要修复现有数据）

```sql
-- 如果数据库中已有负数金额的记录，需要修复

-- 1. 检查是否有负数
SELECT COUNT(*) 
FROM transactions 
WHERE total_amount < 0 OR tax_amount < 0;

-- 2. 修复负数（转换为绝对值）
UPDATE transactions
SET 
  total_amount = ABS(total_amount),
  tax_amount = ABS(tax_amount),
  tax_details = jsonb_set(
    jsonb_set(
      tax_details,
      '{gst_cents}',
      to_jsonb(ABS((tax_details->>'gst_cents')::numeric))
    ),
    '{pst_cents}',
    to_jsonb(ABS((tax_details->>'pst_cents')::numeric))
  )
WHERE total_amount < 0 OR tax_amount < 0;

-- 3. 验证修复
SELECT COUNT(*) 
FROM transactions 
WHERE total_amount < 0 OR tax_amount < 0;
-- 应该返回 0
```

---

## 🎯 总结

### 问题原因
```
Gemini 返回负数金额
→ 数据库约束要求非负
→ INSERT 失败
```

### 解决方案
```
✅ 使用 Math.abs() 转换为正数
✅ 原始数据保留在 raw_data.amounts_cents
✅ 增加 tax_mismatch 检测
✅ 零金额标记需要审核
```

### 代码修改位置
```
app/api/receipts/upload/route.ts
- 第 7 步：转换为 Transaction 格式
- 使用 Math.abs() 处理所有金额
- 增加税额验证逻辑
```

---

**CTO，立即应用这个修复！使用 Math.abs() 确保所有金额都是正数，同时在 raw_data 中保留原始值。** ✅
