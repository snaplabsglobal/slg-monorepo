# 完整数据库 Schema 文档

**最后更新**: 2026-01-27  
**数据库**: PostgreSQL (Supabase)  
**用途**: 确认 CTO 文档与当前数据库结构的适配性  
**参考文档**: `claude/DATABASE_ADAPTER_STRATEGY.md`, `claude/GEMINI_OPTIMIZATION_SUMMARY.md`, `claude/receipt-to-transaction-adapter.ts`

---

## 📋 目录

1. [核心表结构](#核心表结构)
2. [收据分析相关表](#收据分析相关表)
3. [标签系统表](#标签系统表)
4. [会计分类系统表](#会计分类系统表)
5. [ML 训练相关表](#ml-训练相关表)
6. [权限系统表](#权限系统表)
7. [其他业务表](#其他业务表)
8. [字段映射对照表](#字段映射对照表)
9. [CTO 文档适配说明](#cto-文档适配说明)
10. [JSONB 数据结构](#jsonb-数据结构)
11. [会计师 Dashboard 功能](#会计师-dashboard-功能)
12. [功能模块总结](#功能模块总结)

---

## 核心表结构

### 1. `transactions` - 交易表（核心）

**用途**: 存储所有财务交易记录，包括收入和支出

```sql
CREATE TABLE transactions (
  -- 主键和关联
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  user_id UUID,
  created_by UUID,
  subcontractor_id UUID,
  
  -- 交易基本信息
  transaction_date DATE NOT NULL,
  direction TEXT DEFAULT 'expense' CHECK (direction IN ('income', 'expense')),
  source_app TEXT,
  
  -- 金额相关
  total_amount NUMERIC(15,2) NOT NULL,
  base_amount NUMERIC GENERATED ALWAYS AS (total_amount * COALESCE(exchange_rate, 1.0)) STORED,
  tax_amount NUMERIC(15,2),
  tax_details JSONB,
  currency TEXT DEFAULT 'CAD',
  original_currency TEXT DEFAULT 'CAD',
  base_currency TEXT DEFAULT 'CAD',
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  exchange_rate_source TEXT,
  exchange_rate_date DATE,
  
  -- 分类和税务
  category_user TEXT,              -- 用户分类（对应 Dual Track）
  category_tax TEXT,               -- 税务分类（对应 Dual Track）
  expense_type TEXT DEFAULT 'business',
  is_tax_deductible BOOLEAN DEFAULT true,
  deductible_rate NUMERIC(3,2) DEFAULT 1.0,
  is_capital_asset BOOLEAN DEFAULT false,
  
  -- 商户和附件
  vendor_name TEXT,                -- ✅ Receipt Analyzer 使用
  attachment_url TEXT,             -- ✅ 收据图片 URL
  image_hash TEXT,
  
  -- AI 识别相关
  entry_source TEXT DEFAULT 'ocr', -- ✅ 'ocr', 'manual', 'bank'
  ai_confidence NUMERIC(3,2),      -- ✅ Receipt Analyzer 使用 (0.00-1.00) - overall confidence
  raw_data JSONB,                  -- ✅ 存储完整 Gemini 响应（包含 cents、GIFI、细化置信度等）
  
  -- 状态和审核
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'paid',
  is_reimbursable BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  
  -- 备注和元数据
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);
```

**关键字段（Receipt Analyzer 映射）**:
- ✅ `vendor_name` ← `receipt-analyzer.ts` 的 `vendor_name`
- ✅ `transaction_date` ← `receipt-analyzer.ts` 的 `transaction_date`
- ✅ `total_amount` ← `receipt-analyzer.ts` 的 `total_cents / 100`（转换为美元）
- ✅ `tax_amount` ← `receipt-analyzer.ts` 的 `gst_cents / 100`（GST only，用于 ITC）
- ✅ `tax_details` ← 存储完整的 GST/PST 拆分（JSONB）
- ✅ `currency` ← `receipt-analyzer.ts` 的 `currency`
- ✅ `category_user` ← `receipt-analyzer.ts` 的 `category`
- ✅ `ai_confidence` ← `receipt-analyzer.ts` 的 `confidence.overall`
- ✅ `needs_review` ← `receipt-analyzer.ts` 的 `needs_review` 或 `confidence.overall < 0.9`
- ✅ `raw_data` ← 存储完整的 Gemini 响应（包含 cents、GIFI、细化置信度等）

### 2. `transaction_items` - 交易明细项

**用途**: 存储交易的 Line Items（明细项）

```sql
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  
  description TEXT,
  quantity NUMERIC(10,3),
  unit_price NUMERIC(15,2),
  amount NUMERIC GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(unit_price, 0)) STORED,
  category_tax TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**映射**: `receipt-analyzer.ts` 的 `items[]` 数组 → 此表的记录

### 3. `organizations` - 组织表

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'Free' CHECK (plan IN ('Free', 'LS Pro', 'JSS Base', 'Team', 'Enterprise')),
  plan_type TEXT DEFAULT 'free',
  owner_id UUID,
  usage_metadata JSONB DEFAULT '{"project_limit": 1, "receipt_count": 0}',
  primary_phone TEXT,
  primary_email TEXT,
  physical_address TEXT,
  default_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. `organization_members` - 组织成员表

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member', 'Uploader')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. `profiles` - 用户资料表

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  persona TEXT DEFAULT 'General' CHECK (persona IN ('Construction', 'Worker', 'Individual', 'General')),
  language_code TEXT DEFAULT 'en',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 权限系统扩展字段
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic_ls', 'basic_jss', 'pro_ls', 'pro_jss', 'enterprise')),
  accessible_apps TEXT[] DEFAULT ARRAY['ledgersnap'],
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ
);
```

### 6. `projects` - 项目表

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  metadata JSONB DEFAULT '{}',
  is_diy BOOLEAN DEFAULT false,
  client_organization_id UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. `vendor_aliases` - 商户别名表

```sql
CREATE TABLE vendor_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  resolved_name TEXT NOT NULL,  -- 标准化名称
  alias TEXT NOT NULL,          -- 别名/变体
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, LOWER(alias))
);
```

**用途**: 商户名称标准化，支持模糊匹配和 ML 学习

### 8. `gifi_codes` - GIFI 税务代码参考表（可选）

**说明**: CTO 文档建议创建此表，但当前数据库未创建。可以创建或仅在 `raw_data` 中存储。

```sql
-- 可选：创建 GIFI 代码参考表
CREATE TABLE IF NOT EXISTS gifi_codes (
  code TEXT PRIMARY KEY CHECK (code ~ '^\d{4}$'),
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT, -- 'expense', 'revenue', 'asset', 'liability'
  is_common BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 常用 GIFI 代码（BC 建筑行业）
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
```

**存储位置**: 
- 如果创建表：`gifi_codes` 表
- 如果未创建：`raw_data->'accounting'->>'gifi_code'` (TEXT)

---

## 收据分析相关表

### 8. `ml_training_data` - ML 训练数据表

**用途**: 存储用户对 AI 识别结果的修正，用于训练模型

```sql
CREATE TABLE ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id UUID REFERENCES transactions(id),
  
  -- 原始 AI 提取
  original_extraction JSONB NOT NULL,  -- ✅ 完整的 Gemini 响应
  ai_model_version TEXT DEFAULT 'gemini-2.5-flash',
  ai_confidence NUMERIC(3,2),
  
  -- 用户修正
  corrected_data JSONB NOT NULL,
  correction_fields TEXT[] NOT NULL,  -- ['vendor_name', 'total_amount', ...]
  
  -- 修正元数据
  corrected_by UUID REFERENCES auth.users(id),
  corrected_at TIMESTAMPTZ DEFAULT NOW(),
  correction_reason TEXT,
  
  -- 训练状态
  is_training_ready BOOLEAN DEFAULT false,
  training_status TEXT DEFAULT 'pending' CHECK (training_status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9. `vendor_standardization_log` - 商户标准化日志

**用途**: 记录商户名称标准化的尝试和用户反馈

```sql
CREATE TABLE vendor_standardization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id UUID REFERENCES transactions(id),
  
  raw_vendor_name TEXT NOT NULL,
  standardized_name TEXT,
  vendor_alias_id UUID REFERENCES vendor_aliases(id),
  
  standardization_method TEXT NOT NULL CHECK (standardization_method IN (
    'exact_match', 'fuzzy_match', 'ml_suggestion', 'manual', 'auto_created'
  )),
  confidence_score NUMERIC(3,2),
  
  ml_suggestion JSONB,
  ml_model_version TEXT DEFAULT 'gemini-2.5-flash',
  
  user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'modified', 'pending')),
  user_modified_name TEXT,
  actioned_by UUID REFERENCES auth.users(id),
  actioned_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10. `ml_model_metrics` - ML 模型性能指标

```sql
CREATE TABLE ml_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  model_version TEXT,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  total_extractions INTEGER DEFAULT 0,
  corrections_count INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5,2),
  
  field_accuracy JSONB DEFAULT '{}',  -- {"vendor_name": 0.95, "total_amount": 0.98, ...}
  
  vendor_standardizations INTEGER DEFAULT 0,
  vendor_auto_accept_rate NUMERIC(5,2),
  
  avg_processing_time_ms INTEGER,
  avg_confidence_score NUMERIC(3,2),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, model_name, metric_date)
);
```

---

## 标签系统表

### 11. `tags` - 标签主表

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  name TEXT NOT NULL,                    -- '#Project-Burnaby'
  display_name TEXT,                     -- 'Burnaby Kitchen Renovation'
  color TEXT DEFAULT '#0066CC',
  icon TEXT,
  
  category TEXT CHECK (category IN ('project', 'client', 'location', 'expense_type', 'tax', 'custom')),
  parent_tag_id UUID REFERENCES tags(id),
  
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  ai_confidence DECIMAL(3,2),
  ai_suggested_for TEXT[],
  
  is_system_tag BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12. `transaction_tags` - 交易标签关联表

```sql
CREATE TABLE transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  
  source TEXT NOT NULL CHECK (source IN (
    'user_manual', 'ai_suggested', 'ai_auto', 'imported', 'system'
  )),
  
  user_confirmed BOOLEAN,
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(transaction_id, tag_id)
);
```

### 13. `tag_patterns` - 标签使用模式表

```sql
CREATE TABLE tag_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  vendor_name TEXT,
  standardized_vendor TEXT,
  amount_range NUMRANGE,
  
  suggested_tags UUID[],
  confidence DECIMAL(3,2),
  
  sample_count INTEGER DEFAULT 1,
  last_trained_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, vendor_name)
);
```

### 14. `tag_templates` - 标签模板表

```sql
CREATE TABLE tag_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  name TEXT NOT NULL,
  description TEXT,
  tag_ids UUID[],
  
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## 会计分类系统表

### 15. `accounting_categories` - 标准会计科目表

```sql
CREATE TABLE accounting_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code TEXT NOT NULL UNIQUE,           -- 'CAT-001'
  name_en TEXT NOT NULL,               -- 'Meals & Entertainment'
  name_fr TEXT,
  
  parent_category_id UUID REFERENCES accounting_categories(id),
  level INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  
  is_tax_deductible BOOLEAN DEFAULT true,
  tax_deduction_rate DECIMAL(3,2),
  
  cra_code TEXT,
  cra_description TEXT,
  
  gst_applicable BOOLEAN DEFAULT true,
  pst_applicable BOOLEAN DEFAULT false,
  
  industry_tags TEXT[],
  
  is_system_category BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 16. `tag_category_mappings` - 标签和会计科目映射表

```sql
CREATE TABLE tag_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tag_id UUID REFERENCES tags(id),
  category_id UUID REFERENCES accounting_categories(id),
  
  mapping_source TEXT NOT NULL CHECK (mapping_source IN (
    'user_defined', 'ai_suggested', 'system_default', 'ml_learned'
  )),
  
  confidence DECIMAL(3,2) DEFAULT 0.5,
  
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  organization_id UUID REFERENCES organizations(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tag_id, category_id, organization_id)
);
```

### 17. `transaction_categories` - 交易会计科目表

```sql
CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES accounting_categories(id),
  
  assignment_source TEXT NOT NULL CHECK (assignment_source IN (
    'user_manual', 'ai_auto', 'rule_based', 'imported'
  )),
  
  confidence_score DECIMAL(3,2),
  
  user_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  
  is_tax_deductible BOOLEAN,
  tax_deduction_amount_cents BIGINT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(transaction_id)
);
```

### 18. `vendor_category_patterns` - 供应商分类模式表

```sql
CREATE TABLE vendor_category_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  vendor_name TEXT NOT NULL,
  standardized_vendor TEXT,
  vendor_type TEXT,
  
  suggested_category_id UUID REFERENCES accounting_categories(id),
  confidence DECIMAL(3,2),
  
  sample_count INTEGER DEFAULT 1,
  user_agreement_rate DECIMAL(3,2),
  
  organization_id UUID REFERENCES organizations(id),
  industry_tag TEXT,
  
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vendor_name, organization_id)
);
```

### 19. `accounting_report_configs` - 会计报表配置表

```sql
CREATE TABLE accounting_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  report_name TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN (
    'tax_summary', 'expense_by_category', 'expense_by_tag', 'dual_view'
  )),
  
  included_categories UUID[],
  included_tags UUID[],
  date_range_type TEXT,
  
  output_format TEXT DEFAULT 'pdf' CHECK (output_format IN ('pdf', 'excel', 'csv', 'json')),
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ML 训练相关表

（已在"收据分析相关表"部分列出）

---

## 权限系统表

### 20. `app_permissions` - 应用权限配置表

```sql
CREATE TABLE app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL UNIQUE CHECK (app_code IN (
    'ledgersnap', 'jobsite-snap', 'service-snap-qr'
  )),
  app_name TEXT NOT NULL,
  required_tier TEXT[] NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21. `app_access_logs` - 应用访问日志表

```sql
CREATE TABLE app_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  app_code TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 22. `upgrade_requests` - 升级请求表

```sql
CREATE TABLE upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  app_code TEXT NOT NULL,
  
  request_status TEXT DEFAULT 'pending' CHECK (request_status IN (
    'pending', 'approved', 'rejected', 'completed', 'cancelled'
  )),
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 其他业务表

### 23. `time_entries` - 工时记录表

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  break_duration INTEGER DEFAULT 0,
  period_date DATE GENERATED ALWAYS AS ((start_time AT TIME ZONE 'UTC')::date) STORED,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
```

### 24. `subcontractors` - 分包商表

```sql
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_info JSONB DEFAULT '{}',
  tax_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 25. `employees` - 员工表

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  employee_number TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 字段映射对照表

### Receipt Analyzer → Transactions 表

| Receipt Analyzer 字段 | Transactions 表字段 | 类型 | 说明 |
|---------------------|-------------------|------|------|
| `vendor_name` | `vendor_name` | TEXT | ✅ 直接映射 |
| `transaction_date` | `transaction_date` | DATE | ✅ 直接映射 |
| `total_amount` | `total_amount` | NUMERIC(15,2) | ✅ 直接映射 |
| `currency` | `currency` | TEXT | ✅ 直接映射 |
| `tax_amount` | `tax_amount` | NUMERIC(15,2) | ✅ 直接映射 |
| `category_user` | `category_user` | TEXT | ✅ 直接映射 |
| `ai_confidence` | `ai_confidence` | NUMERIC(3,2) | ✅ 直接映射 |
| `raw_text` | `raw_data->>'raw_text'` | JSONB | ✅ JSONB 子字段 |
| `items[]` | `transaction_items` 表 | 关联表 | ✅ 多条记录 |

### 完整 Gemini 响应存储

```typescript
// raw_data JSONB 结构
{
  gemini_response: {
    vendor_name: "...",
    transaction_date: "...",
    total_amount: 123.45,
    // ... 完整响应
  },
  raw_text: "所有可见文本...",
  extracted_at: "2026-01-27T10:00:00Z",
  model_version: "gemini-2.5-flash"
}
```

---

## CTO 文档适配说明

### 关键设计理念（来自 CTO 文档）

#### 1. **分位制计算（Cents-Only）**
- **目的**: 避免浮点数舍入误差，确保会计精度
- **实现**: 在 `raw_data` JSONB 中存储所有金额的 cents（整数）
- **数据库字段**: `total_amount` 使用 `NUMERIC(15,2)`（美元），但 `raw_data->'amounts_cents'` 存储精确的 cents

#### 2. **BC 省税务拆分（GST/PST Split）**
- **目的**: 支持 ITC（进项税额抵扣），符合 CRA 要求
- **实现**: `tax_details` JSONB 存储 GST 和 PST 的拆分
- **税率**: GST 5%, PST 7%

#### 3. **GIFI 税务代码**
- **目的**: 符合加拿大税表标准分类
- **实现**: 存储在 `raw_data->'accounting'->>'gifi_code'`
- **格式**: 4 位数字（如 "8320"）

#### 4. **细化置信度评分**
- **目的**: 更精确地评估 AI 识别质量
- **实现**: `raw_data->'confidence'` 存储各字段的置信度
- **字段**: vendor_name, date, amounts, tax_split, overall

#### 5. **待审核标记**
- **目的**: 自动标记低置信度收据，需要会计师审核
- **实现**: `needs_review` 字段
- **触发条件**: `confidence.overall < 0.9` 或税额拆分不确定

---

## JSONB 数据结构

### `raw_data` JSONB 结构（完整版）

```json
{
  "gemini_version": "2.5-flash",
  "extracted_at": "2026-01-27T10:00:00Z",
  
  "amounts_cents": {
    "subtotal": 4500,      // 税前金额（分）
    "gst": 225,            // GST 金额（分）
    "pst": 315,            // PST 金额（分）
    "total": 5040          // 总金额（分）
  },
  
  "accounting": {
    "gifi_code": "8320",                           // GIFI 税务代码
    "vendor_alias": "Home Depot",                  // 标准化商户名
    "is_meals_50_deductible": false,               // 是否 50% 可抵扣餐饮
    "is_shareholder_loan_potential": false         // 是否潜在股东贷款
  },
  
  "confidence": {
    "vendor_name": 1.0,    // 商户名称置信度
    "date": 0.95,          // 日期置信度
    "amounts": 0.85,       // 金额置信度
    "tax_split": 0.70,     // 税务拆分置信度
    "overall": 0.875       // 整体置信度
  },
  
  "raw_text": "HOME DEPOT #7133\n2024-01-27...",
  
  "gemini_raw_response": {
    // 完整的 Gemini API 响应
    "vendor_name": "...",
    "transaction_date": "...",
    // ...
  }
}
```

### `tax_details` JSONB 结构

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

---

## ✅ 适配性检查

### CTO 文档适配情况

#### ✅ 完全适配
1. **receipt-analyzer.ts** - 字段名已更新为数据库字段名（vendor_name, transaction_date, ai_confidence）
2. **transactions 表** - 所有必需字段都存在
3. **ML 训练系统** - `ml_training_data` 表已就绪
4. **商户标准化** - `vendor_standardization_log` 表已就绪
5. **JSONB 存储** - `raw_data` 和 `tax_details` 支持完整存储 CTO 设计的数据

#### ⚠️ 需要注意
1. **金额存储方式**
   - CTO 文档：使用 cents（整数）避免舍入误差
   - 当前数据库：`total_amount` 使用 `NUMERIC(15,2)`（美元）
   - **解决方案**: 在 `raw_data->'amounts_cents'` 中存储精确的 cents，`total_amount` 用于显示和查询

2. **分类系统**
   - CTO 文档：固定 10 个分类列表
   - 当前系统：`accounting_categories` 表（Dual Track）
   - **解决方案**: 将固定分类映射到 `accounting_categories` 表，同时填充 `category_user`

3. **Line Items**
   - CTO 文档：`items[]` 数组，使用 `price_cents`
   - 当前数据库：`transaction_items` 表，使用 `unit_price` (NUMERIC)
   - **解决方案**: 转换 cents → dollars 保存到 `transaction_items`

4. **GIFI 代码表**
   - CTO 文档：建议创建 `gifi_codes` 参考表
   - 当前数据库：未创建（可选）
   - **解决方案**: 可以创建，或仅在 `raw_data` 中存储

#### 📝 实施建议

1. **使用适配器函数** (`receipt-to-transaction-adapter.ts`)
   - 将 Gemini 的 cents 数据转换为数据库格式
   - 在 `raw_data` 中保留原始 cents 数据
   - 在 `total_amount` 中存储美元金额（用于查询）

2. **分类映射**
   - 创建映射函数，将固定分类映射到 `accounting_categories`
   - 同时填充 `category_user` 和 `category_tax`

3. **Line Items 转换**
   - `price_cents / 100` → `unit_price` (NUMERIC)
   - 保存到 `transaction_items` 表

4. **GIFI 代码**
   - 可选：创建 `gifi_codes` 参考表
   - 或仅在 `raw_data->'accounting'->>'gifi_code'` 中存储

---

## 📊 表关系图

```
organizations
  ├── organization_members
  ├── projects
  ├── transactions (核心表)
  │   ├── transaction_items (Line Items)
  │   ├── transaction_tags (标签关联)
  │   └── transaction_categories (会计分类关联)
  ├── tags (标签系统)
  │   └── transaction_tags
  ├── accounting_categories (Dual Track 系统)
  │   ├── transaction_categories
  │   └── tag_category_mappings
  ├── vendor_aliases (商户标准化)
  ├── ml_training_data (ML 训练)
  ├── vendor_standardization_log (商户标准化日志)
  ├── ml_model_metrics (模型性能)
  └── gifi_codes (可选，GIFI 代码参考表)
```

## 🎯 功能模块总结

### 1. 收据分析模块
- **输入**: 收据图片（JPEG/PNG/WebP）
- **处理**: Gemini 2.5 Flash AI 识别
- **输出**: 结构化数据（vendor, date, amounts, tax, category, GIFI）
- **存储**: `transactions` 表 + `transaction_items` 表

### 2. 会计师审核模块
- **功能**: 审核待审核交易、批准/拒绝、批量操作
- **API**: `/api/accountant/*`
- **UI**: Accountant Dashboard
- **数据**: 基于 `transactions.needs_review` 和 `transactions.status`

### 3. 标签系统
- **功能**: 灵活的标签分类（项目、客户、地点等）
- **表**: `tags`, `transaction_tags`, `tag_patterns`
- **用途**: 用户自定义分类，为 JSS 升级准备

### 4. 会计分类系统（Dual Track）
- **功能**: 标准化的会计科目分类（符合 CRA）
- **表**: `accounting_categories`, `transaction_categories`
- **用途**: 报税和会计软件集成

### 5. ML 训练系统
- **功能**: 记录用户修正，持续改进 AI 模型
- **表**: `ml_training_data`, `vendor_standardization_log`, `ml_model_metrics`
- **用途**: 提升识别准确度

## 🎯 CTO 文档核心设计要点

### 1. 分位制计算（Cents-Only）

**设计理念**: 避免浮点数舍入误差，确保会计精度

**实现方式**:
- `transactions.total_amount`: NUMERIC(15,2) - 存储美元金额（用于查询和显示）
- `raw_data->'amounts_cents'`: 存储精确的 cents（整数）
  - `subtotal`: 税前金额（分）
  - `gst`: GST 金额（分）
  - `pst`: PST 金额（分）
  - `total`: 总金额（分）

**转换逻辑**:
```typescript
// Gemini 输出（cents）
total_cents: 5040

// 数据库存储
total_amount: 50.40  // NUMERIC(15,2)
raw_data->'amounts_cents'->>'total': 5040  // 保留精确值
```

### 2. BC 省税务拆分（GST/PST Split）

**设计理念**: 支持 ITC（进项税额抵扣），符合 CRA 要求

**实现方式**:
- `tax_amount`: NUMERIC(15,2) - 存储 GST 金额（美元），用于 ITC 抵扣
- `tax_details` JSONB - 存储完整的税务拆分信息

**税率**:
- GST: 5%
- PST: 7%

**数据结构**:
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

### 3. GIFI 税务代码

**设计理念**: 符合加拿大税表标准分类

**实现方式**:
- 存储在 `raw_data->'accounting'->>'gifi_code'`
- 可选：创建 `gifi_codes` 参考表

**常用代码**:
- `8320`: Materials/Supplies
- `9281`: Fuel Costs
- `8523`: Meals & Entertainment (50% deductible)
- `8862`: Professional Services

### 4. 细化置信度评分

**设计理念**: 更精确地评估 AI 识别质量，支持字段级别的置信度

**实现方式**:
- `ai_confidence`: NUMERIC(3,2) - 存储 overall 置信度（用于查询和排序）
- `raw_data->'confidence'`: JSONB - 存储各字段的细化置信度

**字段**:
- `vendor_name`: 商户名称置信度
- `date`: 日期置信度
- `amounts`: 金额置信度
- `tax_split`: 税务拆分置信度
- `overall`: 整体置信度

### 5. 待审核标记

**设计理念**: 自动标记低置信度收据，需要会计师审核

**实现方式**:
- `needs_review`: BOOLEAN
- 触发条件：
  - `confidence.overall < 0.9`
  - 税额拆分不确定
  - 金额计算不匹配（±2 分容差）

**UI 显示**:
- 🟢 Verified (overall >= 0.9) - 绿色徽章
- 🟡 Needs Review (overall < 0.9) - 黄色徽章
- 🔴 Failed (overall < 0.5) - 红色徽章

---

## 会计师 Dashboard 功能

### 概述

**设计目标**: 为 BC 省建筑行业会计师提供专业的交易审核和管理界面

**核心功能**:
- ✅ 实时统计面板（总交易数、GST 可抵扣、平均置信度、月度总额）
- ✅ 智能筛选（待审核、已批准、已拒绝、全部）
- ✅ 交易详情模态框（收据图片、财务拆分、置信度详情）
- ✅ 批量操作（批量批准/拒绝、批量导出）
- ✅ CSV 导出（符合 CRA 报税格式）

### 相关 API 端点

1. **GET /api/accountant/stats** - 获取统计信息
2. **GET /api/accountant/transactions** - 获取交易列表（支持筛选）
3. **POST /api/accountant/transactions/[id]/approve** - 批准交易
4. **POST /api/accountant/transactions/[id]/reject** - 拒绝交易
5. **POST /api/accountant/transactions/batch-approve** - 批量批准
6. **GET /api/accountant/export** - 导出 CSV

### 数据库查询示例

#### 统计查询
```sql
-- 获取月度统计
SELECT 
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE needs_review = true) as needs_review,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  SUM((tax_details->>'gst_cents')::int) as total_gst_cents,
  SUM((tax_details->>'pst_cents')::int) as total_pst_cents,
  SUM(total_amount) as monthly_total,
  AVG(ai_confidence) as avg_confidence
FROM transactions
WHERE organization_id = $1
  AND transaction_date >= $2
  AND transaction_date <= $3
  AND deleted_at IS NULL;
```

#### 待审核交易查询
```sql
-- 获取需要审核的交易
SELECT *
FROM transactions
WHERE organization_id = $1
  AND needs_review = true
  AND transaction_date >= $2
  AND transaction_date <= $3
  AND deleted_at IS NULL
ORDER BY 
  ai_confidence ASC,  -- 低置信度优先
  transaction_date DESC;
```

#### 批量批准
```sql
-- 批量更新状态
UPDATE transactions
SET 
  status = 'approved',
  needs_review = false,
  verified_at = NOW(),
  verified_by = $1
WHERE id = ANY($2::uuid[])
  AND organization_id = $3;
```

### CSV 导出格式

```csv
Date,Vendor,Category,GIFI Code,Subtotal,GST (5%),PST (7%),Total,Currency,Status,Confidence,Meals 50%,Shareholder Loan
2026-01-15,"Home Depot #7133","Office Supplies",8320,45.00,2.25,3.15,50.40,CAD,approved,0.95,No,No
```

**数据来源**:
- `Subtotal`: `raw_data->'amounts_cents'->>'subtotal' / 100`
- `GST (5%)`: `tax_details->>'gst_cents' / 100`
- `PST (7%)`: `tax_details->>'pst_cents' / 100`
- `GIFI Code`: `raw_data->'accounting'->>'gifi_code'`
- `Meals 50%`: `raw_data->'accounting'->>'is_meals_50_deductible'`
- `Shareholder Loan`: `raw_data->'accounting'->>'is_shareholder_loan_potential'`

---

## 🔗 相关文档

### 当前数据库文档
- `docs/TRANSACTIONS_TABLE_SCHEMA.md` - Transactions 表详细说明
- `docs/RECEIPT_ANALYZER_ANALYSIS.md` - Receipt Analyzer 分析报告

### CTO 设计文档（claude 文件夹，忽略 deployed 子文件夹）
- `claude/DATABASE_ADAPTER_STRATEGY.md` - 数据库适配方案（**重要**）
- `claude/GEMINI_OPTIMIZATION_SUMMARY.md` - Gemini 优化总结（会计级严谨度）
- `claude/ACCOUNTANT_DASHBOARD_GUIDE.md` - 会计师 Dashboard 完整指南（**新增**）
- `claude/receipt-analyzer.ts` - 收据分析器实现（使用 cents 和细化置信度）
- `claude/receipt-to-transaction-adapter.ts` - 适配器函数（Gemini → Transaction）
- `claude/upload-api-adapted.ts` - 上传 API 实现示例
- `claude/accountant-dashboard-api.ts` - 会计师 Dashboard API 实现（**新增**）
- `claude/accountant-dashboard-part1.tsx` - Dashboard UI 组件 Part 1（**新增**）
- `claude/accountant-dashboard-part2.tsx` - Dashboard UI 组件 Part 2（**新增**）
- `claude/ledgersnap_migration.sql` - MVP 规格的 receipts 表设计（参考用）

### 实施建议
1. **使用适配器函数**: `receipt-to-transaction-adapter.ts` 中的 `geminiResultToTransaction()`
2. **金额处理**: 在 `raw_data` 中保留 cents，在 `total_amount` 中存储美元
3. **税务拆分**: 使用 `tax_details` JSONB 存储完整的 GST/PST 信息
4. **置信度**: 在 `raw_data->'confidence'` 中存储细化置信度，`ai_confidence` 存储 overall
5. **会计师 Dashboard**: 参考 `ACCOUNTANT_DASHBOARD_GUIDE.md` 实现审核功能
