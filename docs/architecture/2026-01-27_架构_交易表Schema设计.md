# Transactions 表字段结构

## 📋 完整字段列表

### 主键和标识
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | UUID | 主键，自动生成 |
| `organization_id` | UUID | 组织 ID（必填） |
| `project_id` | UUID | 项目 ID（可选） |
| `user_id` | UUID | 用户 ID（可选） |
| `created_by` | UUID | 创建者 ID |
| `subcontractor_id` | UUID | 分包商 ID（可选） |

### 交易基本信息
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `transaction_date` | DATE | - | 交易日期（必填） |
| `direction` | TEXT | `'expense'` | 方向：`'income'` 或 `'expense'` |
| `source_app` | TEXT | - | 来源应用（如 'ls-web', 'jss-web'） |

### 金额相关
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `total_amount` | NUMERIC(15,2) | - | 总金额（必填） |
| `base_amount` | NUMERIC | - | 基础金额（计算字段：total_amount * exchange_rate） |
| `tax_amount` | NUMERIC(15,2) | - | 税金金额 |
| `tax_details` | JSONB | - | 税金详情（JSON） |
| `currency` | TEXT | `'CAD'` | 货币代码 |
| `original_currency` | TEXT | `'CAD'` | 原始货币 |
| `base_currency` | TEXT | `'CAD'` | 基础货币 |
| `exchange_rate` | NUMERIC(10,6) | `1.0` | 汇率 |
| `exchange_rate_source` | TEXT | - | 汇率来源 |
| `exchange_rate_date` | DATE | - | 汇率日期 |

### 分类和税务
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `category_user` | TEXT | - | 用户分类（对应 Dual Track 系统） |
| `category_tax` | TEXT | - | 税务分类（对应 Dual Track 系统） |
| `expense_type` | TEXT | `'business'` | 费用类型 |
| `is_tax_deductible` | BOOLEAN | `true` | 是否可抵税 |
| `deductible_rate` | NUMERIC(3,2) | `1.0` | 抵税率 |
| `is_capital_asset` | BOOLEAN | `false` | 是否为资本资产 |

### 商户和附件
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `vendor_name` | TEXT | 商户名称 |
| `attachment_url` | TEXT | 附件 URL（收据图片） |
| `image_hash` | TEXT | 图片哈希值 |

### AI 识别相关
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `entry_source` | TEXT | `'ocr'` | 录入来源（如 'ocr', 'manual'） |
| `ai_confidence` | NUMERIC(3,2) | - | AI 置信度（0.00-1.00） |
| `raw_data` | JSONB | - | 原始数据（存储 Gemini 响应等） |

### 状态和审核
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `status` | TEXT | `'pending'` | 状态 |
| `payment_status` | TEXT | `'paid'` | 支付状态 |
| `is_reimbursable` | BOOLEAN | `false` | 是否可报销 |
| `needs_review` | BOOLEAN | `false` | 是否需要审核 |
| `verified_at` | TIMESTAMPTZ | - | 审核时间 |
| `verified_by` | UUID | - | 审核人 ID |

### 备注和元数据
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `internal_notes` | TEXT | 内部备注 |
| `created_at` | TIMESTAMPTZ | 创建时间（自动） |
| `updated_at` | TIMESTAMPTZ | 更新时间（自动） |
| `deleted_at` | TIMESTAMPTZ | 删除时间（软删除） |
| `deleted_by` | UUID | 删除人 ID |

## 📊 字段分组总结

### 核心字段（收据分析器使用）
```typescript
{
  vendor_name: string | null,           // 商户名称
  transaction_date: string,              // 交易日期（必填）
  total_amount: number,                  // 总金额（必填）
  currency: string,                      // 货币（默认 CAD）
  tax_amount: number | null,             // 税金
  category_user: string | null,          // 用户分类
  ai_confidence: number | null,          // AI 置信度
  attachment_url: string | null,         // 附件 URL
  raw_data: JSONB,                       // 原始数据（Gemini 响应）
}
```

### 关联字段
- `organization_id`: 组织（必填）
- `project_id`: 项目（可选）
- `user_id`: 用户（可选）

### 状态字段
- `status`: 状态（默认 'pending'）
- `payment_status`: 支付状态（默认 'paid'）
- `needs_review`: 是否需要审核

### 计算字段
- `base_amount`: 自动计算（total_amount * exchange_rate）

## 🔗 关联表

### transaction_items
存储交易的明细项（Line Items）：
- `transaction_id` → `transactions.id`
- `description`: 描述
- `quantity`: 数量
- `unit_price`: 单价
- `amount`: 金额（计算字段）

### transaction_tags
存储交易的标签（Tags 系统）：
- `transaction_id` → `transactions.id`
- `tag_id` → `tags.id`

### transaction_categories
存储交易的会计分类（Dual Track 系统）：
- `transaction_id` → `transactions.id`
- `accounting_category_id` → `accounting_categories.id`

## 📝 约束条件

1. **方向检查**: `direction` 必须是 `'income'` 或 `'expense'`
2. **金额非负**: `total_amount >= 0`
3. **税金非负**: `tax_amount >= 0` 或 `NULL`
4. **汇率有效**: `exchange_rate > 0`

## 🎯 与 Receipt Analyzer 的映射

| Receipt Analyzer 字段 | Transactions 表字段 | 说明 |
|---------------------|-------------------|------|
| `vendor_name` | `vendor_name` | 直接映射 |
| `transaction_date` | `transaction_date` | 直接映射 |
| `total_amount` | `total_amount` | 直接映射 |
| `currency` | `currency` | 直接映射 |
| `tax_amount` | `tax_amount` | 直接映射 |
| `category_user` | `category_user` | 直接映射 |
| `ai_confidence` | `ai_confidence` | 直接映射 |
| `raw_text` | `raw_data->>'raw_text'` | JSONB 子字段 |
| `items[]` | `transaction_items` 表 | 关联表 |

## 💡 使用示例

### 创建交易记录
```typescript
const transaction = await supabase
  .from('transactions')
  .insert({
    organization_id: orgId,
    vendor_name: 'Home Depot',
    transaction_date: '2026-01-27',
    total_amount: 123.45,
    currency: 'CAD',
    tax_amount: 16.05,
    category_user: 'Office Supplies',
    ai_confidence: 0.95,
    entry_source: 'ocr',
    raw_data: {
      gemini_response: analysisResult,
      raw_text: '...',
    },
    attachment_url: 'https://r2.example.com/receipt.jpg',
  })
  .select()
  .single();
```

### 查询交易
```typescript
const { data } = await supabase
  .from('transactions')
  .select('*, transaction_items(*)')
  .eq('organization_id', orgId)
  .order('transaction_date', { ascending: false });
```
