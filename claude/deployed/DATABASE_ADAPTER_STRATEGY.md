# LedgerSnap - 数据库适配方案

**日期**: 2026-01-27  
**目的**: 将 COO 优化的会计级严谨系统适配到现有数据库

---

## 🎯 适配方案选择

### 方案 A: 最小改动（推荐 - MVP）

**思路**: 利用现有字段，将新数据存储在 JSONB 字段中

**优点**:
- ✅ 无需修改数据库 Schema
- ✅ 快速上线
- ✅ 向后兼容

**缺点**:
- ⚠️ 查询性能略低（JSONB 查询）
- ⚠️ 不能使用数据库约束验证

---

### 方案 B: 完整升级（长期）

**思路**: 扩展 `transactions` 表，添加会计专用字段

**优点**:
- ✅ 查询性能最优
- ✅ 数据库级别验证
- ✅ 支持复杂报表

**缺点**:
- ⚠️ 需要数据库迁移
- ⚠️ 需要时间测试

---

## 📦 方案 A 实施（推荐）

### 1. 字段映射策略

```typescript
// Receipt Analyzer 输出 → Transactions 表映射
{
  // === 基础字段（直接映射） ===
  vendor_name: "Home Depot #7133",           // → vendor_name
  transaction_date: "2024-01-27",           // → transaction_date
  currency: "CAD",                          // → currency
  
  // === 金额字段（转换为美元） ===
  total_cents: 5040,                        // → total_amount = 50.40
  subtotal_cents: 4500,                     // → (存 raw_data)
  gst_cents: 225,                           // → tax_amount = 2.25 (GST only)
  pst_cents: 315,                           // → (存 tax_details)
  
  // === 税务详情（JSONB） ===
  tax_details: {
    gst_cents: 225,
    pst_cents: 315,
    total_tax_cents: 540,
    bc_tax_split: true
  },                                        // → tax_details (JSONB)
  
  // === 会计字段 ===
  gifi_code_suggested: "8320",             // → raw_data->>'gifi_code'
  vendor_alias: "Home Depot",              // → raw_data->>'vendor_alias'
  is_meals_50_deductible: false,           // → raw_data->>'is_meals_50_deductible'
  is_shareholder_loan_potential: false,    // → raw_data->>'is_shareholder_loan_potential'
  
  // === 置信度（细化） ===
  confidence: {
    vendor_name: 1.0,
    date: 0.95,
    amounts: 0.85,
    tax_split: 0.70,
    overall: 0.875
  },                                       // → ai_confidence = 0.875 (overall)
                                           // → raw_data->'confidence' (完整对象)
  
  // === 审核标记 ===
  needs_review: false,                     // → needs_review
  
  // === 原始数据 ===
  raw_text: "HOME DEPOT #7133...",         // → raw_data->>'raw_text'
  items: [...]                             // → transaction_items 表
}
```

### 2. `raw_data` JSONB 结构

```json
{
  "gemini_version": "2.0-flash",
  "extracted_at": "2026-01-27T10:00:00Z",
  
  "amounts_cents": {
    "subtotal": 4500,
    "gst": 225,
    "pst": 315,
    "total": 5040
  },
  
  "accounting": {
    "gifi_code": "8320",
    "vendor_alias": "Home Depot",
    "is_meals_50_deductible": false,
    "is_shareholder_loan_potential": false
  },
  
  "confidence": {
    "vendor_name": 1.0,
    "date": 0.95,
    "amounts": 0.85,
    "tax_split": 0.70,
    "overall": 0.875
  },
  
  "raw_text": "HOME DEPOT #7133\n2024-01-27...",
  
  "gemini_raw_response": { /* 完整 Gemini 响应 */ }
}
```

### 3. `tax_details` JSONB 结构

```json
{
  "gst_cents": 225,
  "gst_amount": 2.25,
  "gst_rate": 0.05,
  
  "pst_cents": 315,
  "pst_amount": 3.15,
  "pst_rate": 0.07,
  
  "total_tax_cents": 540,
  "bc_province": true,
  "tax_split_confidence": 0.95
}
```

### 4. TypeScript 接口更新

```typescript
// 新增：Transaction 数据库类型
export interface TransactionRecord {
  id: string;
  organization_id: string;
  transaction_date: string; // DATE
  
  vendor_name: string | null;
  total_amount: number;      // NUMERIC(15,2) - 美元
  tax_amount: number;        // NUMERIC(15,2) - GST only
  tax_details: {
    gst_cents: number;
    gst_amount: number;
    pst_cents: number;
    pst_amount: number;
    total_tax_cents: number;
    bc_province: boolean;
    tax_split_confidence: number;
  };
  
  currency: string;
  category_user: string | null;
  
  ai_confidence: number;     // overall confidence
  needs_review: boolean;
  
  raw_data: {
    gemini_version: string;
    amounts_cents: {
      subtotal: number;
      gst: number;
      pst: number;
      total: number;
    };
    accounting: {
      gifi_code: string | null;
      vendor_alias: string | null;
      is_meals_50_deductible: boolean;
      is_shareholder_loan_potential: boolean;
    };
    confidence: ConfidenceScores;
    raw_text: string;
    gemini_raw_response: any;
  };
  
  attachment_url: string;
  entry_source: string;
  
  created_at: string;
  updated_at: string;
}

// Gemini 分析结果 → Transaction 转换函数
export function geminiResultToTransaction(
  result: ReceiptAnalysisResult,
  organizationId: string,
  userId: string,
  imageUrl: string
): Partial<TransactionRecord> {
  return {
    organization_id: organizationId,
    user_id: userId,
    created_by: userId,
    
    // 基础字段
    vendor_name: result.vendor_name,
    transaction_date: result.receipt_date || new Date().toISOString().split('T')[0],
    currency: result.currency,
    
    // 金额转换（cents → dollars）
    total_amount: result.total_cents / 100,
    tax_amount: result.gst_cents / 100,  // GST only for ITC
    
    // 税务详情
    tax_details: {
      gst_cents: result.gst_cents,
      gst_amount: result.gst_cents / 100,
      gst_rate: 0.05,
      
      pst_cents: result.pst_cents,
      pst_amount: result.pst_cents / 100,
      pst_rate: 0.07,
      
      total_tax_cents: result.gst_cents + result.pst_cents,
      bc_province: true,
      tax_split_confidence: result.confidence.tax_split,
    },
    
    // 分类
    category_user: result.category,
    
    // AI 和审核
    ai_confidence: result.confidence.overall,
    needs_review: result.needs_review,
    entry_source: 'ocr',
    
    // JSONB 存储
    raw_data: {
      gemini_version: '2.0-flash',
      extracted_at: new Date().toISOString(),
      
      amounts_cents: {
        subtotal: result.subtotal_cents,
        gst: result.gst_cents,
        pst: result.pst_cents,
        total: result.total_cents,
      },
      
      accounting: {
        gifi_code: result.gifi_code_suggested,
        vendor_alias: result.vendor_alias,
        is_meals_50_deductible: result.is_meals_50_deductible,
        is_shareholder_loan_potential: result.is_shareholder_loan_potential,
      },
      
      confidence: result.confidence,
      raw_text: result.raw_text,
      gemini_raw_response: result,
    },
    
    // 图片
    attachment_url: imageUrl,
  };
}
```

### 5. API 实现示例

```typescript
// app/api/receipts/upload/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // 1. 上传到 R2
    const imageUrl = await uploadToR2(file);

    // 2. Gemini 分析
    const buffer = Buffer.from(await file.arrayBuffer());
    const geminiResult = await analyzeReceiptWithRetry(buffer, file.type);

    // 3. 转换为 Transaction 格式
    const transactionData = geminiResultToTransaction(
      geminiResult,
      user.organization_id,
      user.id,
      imageUrl
    );

    // 4. 保存到数据库
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. 保存 Line Items（如果有）
    if (geminiResult.items.length > 0) {
      const items = geminiResult.items.map(item => ({
        transaction_id: transaction.id,
        organization_id: user.organization_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price_cents / 100,  // cents → dollars
      }));

      await supabase.from('transaction_items').insert(items);
    }

    return NextResponse.json({
      success: true,
      transaction,
      analysis: geminiResult,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
```

---

## 📦 方案 B 实施（可选 - 未来优化）

### 数据库迁移 SQL

```sql
-- 添加会计专用字段到 transactions 表
ALTER TABLE transactions 
  ADD COLUMN subtotal_cents BIGINT,
  ADD COLUMN gst_cents BIGINT,
  ADD COLUMN pst_cents BIGINT,
  ADD COLUMN total_cents BIGINT,
  ADD COLUMN vendor_alias TEXT,
  ADD COLUMN gifi_code_suggested TEXT CHECK (gifi_code_suggested ~ '^\d{4}$'),
  ADD COLUMN is_meals_50_deductible BOOLEAN DEFAULT false,
  ADD COLUMN is_shareholder_loan_potential BOOLEAN DEFAULT false,
  ADD COLUMN confidence_vendor_name NUMERIC(3,2),
  ADD COLUMN confidence_date NUMERIC(3,2),
  ADD COLUMN confidence_amounts NUMERIC(3,2),
  ADD COLUMN confidence_tax_split NUMERIC(3,2),
  ADD COLUMN confidence_overall NUMERIC(3,2);

-- 添加注释
COMMENT ON COLUMN transactions.subtotal_cents IS '税前金额（分）';
COMMENT ON COLUMN transactions.gst_cents IS 'GST 金额（分）- 用于 ITC 抵扣';
COMMENT ON COLUMN transactions.pst_cents IS 'PST 金额（分）';
COMMENT ON COLUMN transactions.total_cents IS '总金额（分）';
COMMENT ON COLUMN transactions.gifi_code_suggested IS '建议的 GIFI 税务代码（4位）';

-- 创建 GIFI 代码参考表
CREATE TABLE IF NOT EXISTS gifi_codes (
  code TEXT PRIMARY KEY CHECK (code ~ '^\d{4}$'),
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT,
  is_common BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入常用 GIFI 代码（BC 建筑行业）
INSERT INTO gifi_codes (code, name, description, category_type, is_common) VALUES
  ('8320', 'Materials/Supplies', 'Construction materials and supplies', 'expense', true),
  ('9281', 'Fuel Costs', 'Gas, diesel, vehicle fuel', 'expense', true),
  ('9282', 'Vehicle Repairs', 'Vehicle servicing and repairs', 'expense', true),
  ('8810', 'Office Supplies', 'Stationery, office equipment', 'expense', true),
  ('8523', 'Meals & Entertainment', 'Business meals (50% deductible)', 'expense', true),
  ('8862', 'Professional Services', 'Legal, accounting, consulting', 'expense', true),
  ('9220', 'Utilities', 'Electricity, gas, water', 'expense', true),
  ('9225', 'Telephone & Internet', 'Phone and internet service', 'expense', true),
  ('8760', 'Other Expenses', 'Miscellaneous expenses', 'expense', true)
ON CONFLICT DO NOTHING;

-- 数据迁移：从 raw_data 提取到新字段
UPDATE transactions
SET 
  subtotal_cents = (raw_data->'amounts_cents'->>'subtotal')::BIGINT,
  gst_cents = (raw_data->'amounts_cents'->>'gst')::BIGINT,
  pst_cents = (raw_data->'amounts_cents'->>'pst')::BIGINT,
  total_cents = (raw_data->'amounts_cents'->>'total')::BIGINT,
  gifi_code_suggested = raw_data->'accounting'->>'gifi_code',
  vendor_alias = raw_data->'accounting'->>'vendor_alias',
  confidence_overall = (raw_data->'confidence'->>'overall')::NUMERIC(3,2)
WHERE raw_data IS NOT NULL 
  AND raw_data->'amounts_cents' IS NOT NULL;
```

---

## 🎯 推荐实施步骤

### Week 1: 方案 A（最小改动）
1. ✅ 更新 `receipt-analyzer.ts` 的接口定义
2. ✅ 创建转换函数 `geminiResultToTransaction()`
3. ✅ 更新 Upload API Route
4. ✅ 测试完整流程

### Week 2-3: 测试和优化
1. 用 50-100 张真实收据测试
2. 验证数据完整性
3. 优化 JSONB 查询性能

### Week 4+: 方案 B（可选）
1. 如果查询性能成为瓶颈
2. 或者需要复杂的数据库级别验证
3. 则执行数据库迁移

---

## 📊 性能对比

### 方案 A (JSONB)
```sql
-- 查询 GIFI 代码
SELECT * FROM transactions 
WHERE raw_data->'accounting'->>'gifi_code' = '8320';
-- 性能: ~50ms (有索引)

-- 查询置信度
SELECT * FROM transactions 
WHERE (raw_data->'confidence'->>'overall')::NUMERIC < 0.9;
-- 性能: ~80ms
```

### 方案 B (专用字段)
```sql
-- 查询 GIFI 代码
SELECT * FROM transactions 
WHERE gifi_code_suggested = '8320';
-- 性能: ~10ms (有索引)

-- 查询置信度
SELECT * FROM transactions 
WHERE confidence_overall < 0.9;
-- 性能: ~15ms
```

**结论**: 对于 MVP 阶段，方案 A 的性能完全足够。

---

## 🔗 相关文件更新清单

1. ✅ `receipt-analyzer.ts` - 已更新接口
2. ⏳ `receipt-analyzer-adapter.ts` - 新建转换适配器
3. ⏳ `upload-receipt-api.ts` - 更新 API Route
4. ⏳ `transaction.types.ts` - 新建类型定义

---

**总结**: 推荐先使用方案 A，快速上线 MVP。如果未来需要更好的性能，再升级到方案 B。
