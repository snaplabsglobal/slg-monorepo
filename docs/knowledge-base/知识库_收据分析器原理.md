# Receipt Analyzer 分析报告

## 📋 概述

本文档分析 `claude/receipt-analyzer.ts` 和 `claude/LEDGERSNAP_MVP_SPEC.md` 中的收据分析实现，评估其与当前数据库结构的兼容性，并提供集成建议。

---

## 🔍 文档分析

### 1. `receipt-analyzer.ts` - Gemini 2.0 Flash 实现

**文件位置**: `claude/receipt-analyzer.ts`

**核心功能**:
- ✅ 完整的 Gemini 2.0 Flash API 集成
- ✅ 收据图片分析（JPEG, PNG, WebP）
- ✅ 结构化数据提取（merchant, date, amount, items, category）
- ✅ 错误处理和重试机制（指数退避）
- ✅ 批量处理支持
- ✅ 成本估算功能
- ✅ 详细的提示词工程（Prompt Engineering）

**输出数据结构**:
```typescript
interface ReceiptAnalysisResult {
  merchant_name: string | null;
  receipt_date: string | null;  // YYYY-MM-DD
  total_amount: number | null;
  currency: string;
  items: ReceiptItem[];
  category: string;
  confidence: number;  // 0.0-1.0
  raw_text: string;
}
```

### 2. `LEDGERSNAP_MVP_SPEC.md` - 技术规格文档

**文件位置**: `claude/LEDGERSNAP_MVP_SPEC.md`

**设计要点**:
- 独立的 `receipts` 表设计（与当前 `transactions` 表不同）
- 完整的 API 端点设计
- 前端页面结构规划
- 成本估算和开发时间表

---

## ⚠️ 数据库结构差异

### MVP 规格中的表结构（未实现）

```sql
CREATE TABLE receipts (
  merchant_name TEXT,        -- ❌ 当前使用 vendor_name
  receipt_date DATE,         -- ❌ 当前使用 transaction_date
  image_url TEXT,             -- ❌ 当前使用 attachment_url
  confidence_score DECIMAL,   -- ❌ 当前使用 ai_confidence
  gemini_response JSONB,     -- ✅ 可存储到 raw_data
  ...
);
```

### 当前实际数据库结构

```sql
CREATE TABLE transactions (
  vendor_name TEXT,           -- ✅ 对应 merchant_name
  transaction_date DATE,      -- ✅ 对应 receipt_date
  attachment_url TEXT,        -- ✅ 对应 image_url
  ai_confidence NUMERIC(3,2), -- ✅ 对应 confidence_score
  raw_data JSONB,             -- ✅ 可存储完整 Gemini 响应
  total_amount NUMERIC(15,2),
  currency TEXT DEFAULT 'CAD',
  tax_amount NUMERIC(15,2),
  category_user TEXT,
  category_tax TEXT,
  entry_source TEXT DEFAULT 'ocr',
  ...
);
```

### 字段映射关系

| MVP 规格字段 | 当前数据库字段 | 映射方式 |
|------------|--------------|---------|
| `merchant_name` | `vendor_name` | 直接映射 |
| `receipt_date` | `transaction_date` | 直接映射 |
| `image_url` | `attachment_url` | 直接映射 |
| `confidence_score` | `ai_confidence` | 直接映射 |
| `gemini_response` | `raw_data` | JSONB 存储 |
| `ocr_raw_text` | `raw_data->>'raw_text'` | JSONB 子字段 |
| `items[]` | `transaction_items` 表 | 关联表 |

---

## ✅ Receipt Analyzer 的价值评估

### 非常有用的部分 ⭐⭐⭐⭐⭐

1. **Gemini API 集成代码**
   - 完整的 SDK 使用示例
   - 错误处理逻辑
   - 重试机制（指数退避）
   - 成本估算函数

2. **提示词工程（Prompt Engineering）**
   - 详细的提取指令
   - 日期格式处理（MM/DD vs DD/MM）
   - 金额提取规则
   - 分类选择逻辑
   - 置信度评分指南

3. **数据验证和标准化**
   - `validateAndNormalizeData()` 函数
   - 日期标准化
   - 金额验证
   - 分类验证

4. **批量处理支持**
   - `analyzeReceiptBatch()` 函数
   - 并发控制（避免速率限制）
   - 错误收集和报告

### 需要适配的部分 ⚠️

1. **字段名称映射**
   ```typescript
   // receipt-analyzer.ts 输出
   {
     merchant_name: "...",
     receipt_date: "...",
     confidence: 0.9
   }
   
   // 需要转换为 transactions 表格式
   {
     vendor_name: "...",
     transaction_date: "...",
     ai_confidence: 0.9
   }
   ```

2. **Line Items 处理**
   - `receipt-analyzer.ts` 提取 `items[]` 数组
   - 当前数据库使用 `transaction_items` 表
   - 需要将数组转换为关联表记录

3. **分类系统**
   - `receipt-analyzer.ts` 使用固定分类列表
   - 当前系统使用 `accounting_categories` 表（Dual Track）
   - 需要映射到会计分类

---

## 🔧 集成建议

### 方案 1: 创建适配层（推荐）

在 `receipt-analyzer.ts` 基础上创建适配函数：

```typescript
// apps/ls-web/app/lib/receipt/analyzer-adapter.ts
import { analyzeReceipt, ReceiptAnalysisResult } from '@slo/snap-receipt-analyzer';
import { createServerClient } from '@slo/snap-auth';

export async function analyzeReceiptForTransaction(
  imageBuffer: Buffer,
  mimeType: string,
  organizationId: string
): Promise<{
  transaction: Partial<Transaction>;
  items: Array<Partial<TransactionItem>>;
}> {
  // 1. 调用 receipt-analyzer
  const analysis = await analyzeReceipt(imageBuffer, mimeType);
  
  // 2. 映射字段
  const transaction: Partial<Transaction> = {
    vendor_name: analysis.merchant_name,
    transaction_date: analysis.receipt_date || new Date().toISOString().split('T')[0],
    total_amount: analysis.total_amount || 0,
    currency: analysis.currency || 'CAD',
    ai_confidence: analysis.confidence,
    entry_source: 'ocr',
    raw_data: {
      gemini_response: analysis,
      raw_text: analysis.raw_text,
      extracted_at: new Date().toISOString(),
    },
    category_user: analysis.category, // 映射到用户分类
  };
  
  // 3. 转换 Line Items
  const items = analysis.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.price,
    amount: item.quantity * item.price,
  }));
  
  return { transaction, items };
}
```

### 方案 2: 修改 receipt-analyzer.ts 输出格式

直接修改 `receipt-analyzer.ts` 使其输出符合当前数据库结构：

```typescript
// packages/snap-receipt-analyzer/src/analyzer.ts
export interface TransactionAnalysisResult {
  // 使用当前数据库字段名
  vendor_name: string | null;
  transaction_date: string | null;
  total_amount: number | null;
  currency: string;
  tax_amount: number | null;
  category_user: string;
  category_tax: string | null;
  ai_confidence: number;
  raw_data: {
    gemini_response: any;
    raw_text: string;
    items: ReceiptItem[];
  };
}
```

### 方案 3: 创建共享包（最佳实践）

将 `receipt-analyzer.ts` 移到共享包，并适配当前数据库：

```
packages/snap-receipt-analyzer/
├── src/
│   ├── analyzer.ts          # 核心分析逻辑（基于 receipt-analyzer.ts）
│   ├── adapter.ts           # 数据库适配层
│   └── types.ts             # TypeScript 类型定义
└── package.json
```

---

## 🎯 与现有系统的集成点

### 1. R2 上传 API（已实现）

```typescript
// apps/ls-web/app/api/receipts/analyze/route.ts
export async function POST(request: NextRequest) {
  // 1. 上传图片到 R2
  const { fileUrl, path } = await uploadToR2(...);
  
  // 2. 从 R2 下载图片 Buffer
  const imageBuffer = await downloadFromR2(path);
  
  // 3. 调用 receipt-analyzer
  const analysis = await analyzeReceipt(imageBuffer, mimeType);
  
  // 4. 保存到 transactions 表
  const transaction = await createTransaction({
    ...analysis,
    attachment_url: fileUrl,
  });
}
```

### 2. Dual Track 分类系统（已实现）

```typescript
// 分析后自动分类
const category = await auto_assign_category(
  organizationId,
  analysis.vendor_name,
  analysis.total_amount,
  analysis.items
);

transaction.category_user = analysis.category;
transaction.category_tax = category.accounting_category;
```

### 3. Tags 系统（已实现）

```typescript
// 基于分析结果自动添加标签
if (analysis.items.length > 0) {
  const tags = await get_ai_suggested_tags(
    organizationId,
    analysis.vendor_name,
    analysis.items
  );
  await add_tags_to_transaction(transactionId, tags);
}
```

### 4. ML 训练数据（已实现）

```typescript
// 保存到 ml_training_data 表
await supabase.from('ml_training_data').insert({
  organization_id: organizationId,
  transaction_id: transaction.id,
  original_extraction: analysis,
  extraction_method: 'gemini_2.0_flash',
  confidence_score: analysis.confidence,
});
```

---

## 📊 成本分析

### Gemini 2.0 Flash 定价（来自 receipt-analyzer.ts）

```typescript
INPUT_COST_PER_MILLION = $0.075
OUTPUT_COST_PER_MILLION = $0.30

// 每张收据估算
// 输入: ~1,000 tokens (图片 + 提示词)
// 输出: ~500 tokens (JSON 响应)
// 单次成本: ~$0.0002 (0.02 分)
```

### 月度成本估算

| 收据数量/月 | 成本 |
|------------|------|
| 100 | $0.02 |
| 1,000 | $0.20 |
| 10,000 | $2.00 |
| 100,000 | $20.00 |

**结论**: 成本非常低，可以大规模使用。

---

## 🚀 实施建议

### 阶段 1: 基础集成（1-2 天）

1. ✅ 将 `receipt-analyzer.ts` 移到共享包 `@slo/snap-receipt-analyzer`
2. ✅ 安装依赖：`@google/generative-ai`
3. ✅ 创建适配函数，映射字段到 `transactions` 表
4. ✅ 创建 API 路由：`/api/receipts/analyze`

### 阶段 2: 完整功能（3-5 天）

1. ✅ 集成 R2 上传（已实现）
2. ✅ 集成 Dual Track 分类（已实现）
3. ✅ 集成 Tags 系统（已实现）
4. ✅ 保存 Line Items 到 `transaction_items` 表
5. ✅ 保存 ML 训练数据

### 阶段 3: 优化（1-2 天）

1. ✅ 添加重试逻辑（receipt-analyzer.ts 已包含）
2. ✅ 添加批量处理（receipt-analyzer.ts 已包含）
3. ✅ 添加成本监控
4. ✅ 优化提示词（基于实际使用反馈）

---

## 📝 代码示例

### 完整的收据分析流程

```typescript
// apps/ls-web/app/api/receipts/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';
import { analyzeReceiptWithRetry } from '@slo/snap-receipt-analyzer';
import { uploadToR2, generateFilePath } from '@slo/snap-storage/server';
import { auto_assign_category } from '@/lib/categories/categories';
import { get_ai_suggested_tags, add_tags_to_transaction } from '@/lib/tags/tags';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. 获取组织
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    // 2. 解析文件
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // 3. 上传到 R2
    const filePath = generateFilePath({
      folder: 'receipts',
      organizationId: orgMember.organization_id,
      filename: file.name,
    });
    const { fileUrl } = await uploadToR2(
      fileBuffer,
      filePath,
      file.type
    );
    
    // 4. 分析收据（使用 receipt-analyzer.ts）
    const analysis = await analyzeReceiptWithRetry(
      fileBuffer,
      file.type,
      3, // max retries
      1000 // retry delay
    );
    
    // 5. 自动分类（Dual Track）
    const category = await auto_assign_category(
      orgMember.organization_id,
      analysis.merchant_name,
      analysis.total_amount || 0
    );
    
    // 6. 创建交易记录
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        organization_id: orgMember.organization_id,
        user_id: user.id,
        vendor_name: analysis.merchant_name,
        transaction_date: analysis.receipt_date || new Date().toISOString().split('T')[0],
        total_amount: analysis.total_amount || 0,
        currency: analysis.currency || 'CAD',
        category_user: analysis.category,
        category_tax: category?.accounting_category || null,
        attachment_url: fileUrl,
        ai_confidence: analysis.confidence,
        entry_source: 'ocr',
        raw_data: {
          gemini_response: analysis,
          raw_text: analysis.raw_text,
          extracted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    
    if (txError) throw txError;
    
    // 7. 保存 Line Items
    if (analysis.items && analysis.items.length > 0) {
      const items = analysis.items.map(item => ({
        transaction_id: transaction.id,
        organization_id: orgMember.organization_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
      }));
      
      await supabase.from('transaction_items').insert(items);
    }
    
    // 8. 自动添加标签
    if (analysis.merchant_name) {
      const tags = await get_ai_suggested_tags(
        orgMember.organization_id,
        analysis.merchant_name,
        analysis.items
      );
      if (tags.length > 0) {
        await add_tags_to_transaction(transaction.id, tags);
      }
    }
    
    // 9. 保存 ML 训练数据
    await supabase.from('ml_training_data').insert({
      organization_id: orgMember.organization_id,
      transaction_id: transaction.id,
      original_extraction: analysis,
      extraction_method: 'gemini_2.0_flash',
      confidence_score: analysis.confidence,
    });
    
    return NextResponse.json({
      success: true,
      transaction,
      analysis,
    });
    
  } catch (error: any) {
    console.error('Receipt analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze receipt' },
      { status: 500 }
    );
  }
}
```

---

## ✅ 结论

### Receipt Analyzer 非常有价值 ⭐⭐⭐⭐⭐

**推荐使用原因**:
1. ✅ 完整的 Gemini API 集成代码
2. ✅ 优秀的提示词工程
3. ✅ 完善的错误处理和重试机制
4. ✅ 成本估算功能
5. ✅ 批量处理支持

**需要做的适配**:
1. ⚠️ 字段名称映射（merchant_name → vendor_name）
2. ⚠️ Line Items 存储到 `transaction_items` 表
3. ⚠️ 分类映射到 Dual Track 系统

**实施优先级**: **高** - 这是 LedgerSnap 的核心功能

**预计工作量**: 3-5 天（包括测试和优化）

---

## 📚 相关文档

- `claude/receipt-analyzer.ts` - 原始实现
- `claude/LEDGERSNAP_MVP_SPEC.md` - 技术规格
- `docs/ML_TRAINING_GUIDE.md` - ML 训练指南
- `supabase/migrations/20260119164038_remote_schema.sql` - 当前数据库结构
