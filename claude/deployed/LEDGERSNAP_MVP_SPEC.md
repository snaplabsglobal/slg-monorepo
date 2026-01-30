# LedgerSnap MVP - 技术规格文档

**版本**: 1.0  
**日期**: 2026-01-27  
**状态**: 开发中

---

## 📋 目录

1. [产品概述](#产品概述)
2. [MVP 功能范围](#mvp-功能范围)
3. [技术架构](#技术架构)
4. [数据库设计](#数据库设计)
5. [Gemini 2.0 Flash 收据识别](#gemini-20-flash-收据识别)
6. [API 端点设计](#api-端点设计)
7. [前端页面结构](#前端页面结构)
8. [实施时间表](#实施时间表)
9. [成本估算](#成本估算)

---

## 产品概述

### 定位
LedgerSnap 是一款 B2B SaaS 产品，专注于帮助中小企业和自由职业者通过拍照快速记录和管理费用。

### 目标用户
- 自由职业者（设计师、顾问、开发者）
- 小型企业主（餐饮、零售）
- 独立承包商
- 需要费用报销的企业员工

### 核心价值主张
1. **快速录入**：拍照即可，无需手动输入
2. **智能识别**：AI 自动提取商家、金额、日期
3. **自动分类**：智能分类费用类型
4. **简单报表**：一键生成月度报表
5. **云端存储**：收据永不丢失

---

## MVP 功能范围

### ✅ 包含在 MVP 中

#### 1. 认证系统
- ✅ 邮箱注册/登录（Supabase Auth）
- ✅ 密码重置
- ✅ Session 管理
- ✅ 受保护路由

#### 2. 收据管理
- ✅ 拍照/上传收据图片
- ✅ AI 自动识别（Gemini 2.0 Flash）
- ✅ 手动编辑/确认
- ✅ 费用列表（表格视图）
- ✅ 搜索和筛选
- ✅ 查看收据详情
- ✅ 编辑/删除费用

#### 3. 分类系统
- ✅ 预设分类（食物、交通、办公用品等）
- ✅ 自定义分类
- ✅ AI 自动建议分类

#### 4. 报表功能
- ✅ 月度费用汇总
- ✅ 按分类统计（饼图）
- ✅ 费用趋势（折线图）
- ✅ 导出 CSV

#### 5. 云端存储
- ✅ Cloudflare R2 图片存储
- ✅ 收据预览
- ✅ 原图下载

### ❌ 不包含在 MVP 中（Phase 2）

- ❌ Google/Apple OAuth 登录
- ❌ 团队协作功能
- ❌ 预算设置和预警
- ❌ 高级报表（年度、季度、自定义）
- ❌ API 集成
- ❌ 移动端原生 App
- ❌ 多币种支持
- ❌ 发票生成
- ❌ 会计软件集成（QuickBooks、Xero）

---

## 技术架构

### 技术栈

```yaml
前端:
  框架: Next.js 16 (App Router)
  语言: TypeScript
  样式: Tailwind CSS
  组件库: shadcn/ui
  图表: Recharts / Chart.js
  状态管理: React Context / Zustand

后端:
  数据库: Supabase (PostgreSQL)
  认证: Supabase Auth
  文件存储: Cloudflare R2
  AI识别: Google Gemini 2.0 Flash API

部署:
  平台: Vercel
  环境: dev / production
  CDN: Cloudflare (R2)
```

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Upload   │  │ Receipt  │  │ Reports  │  │ Settings│ │
│  │ Page     │  │ List     │  │ Page     │  │ Page    │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/upload  │  │ /api/analyze │  │ /api/receipts│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                    │                 │
           ▼                    ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
│  Cloudflare R2  │  │ Gemini 2.0 Flash│  │  Supabase    │
│  (Image Storage)│  │  (AI Recognition)│  │  (Database)  │
└─────────────────┘  └─────────────────┘  └──────────────┘
```

---

## 数据库设计

### Schema 设计（PostgreSQL）

```sql
-- ========================================
-- 用户费用表
-- ========================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 收据信息
  merchant_name TEXT,
  receipt_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  
  -- 分类
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[], -- 标签数组
  
  -- AI 识别结果
  ocr_raw_text TEXT,
  gemini_response JSONB, -- 存储完整 Gemini 响应
  confidence_score DECIMAL(3,2), -- AI 识别置信度 (0.00-1.00)
  
  -- 图片信息
  image_url TEXT NOT NULL,
  image_size_bytes INTEGER,
  image_mime_type TEXT,
  
  -- 备注
  notes TEXT,
  is_reimbursable BOOLEAN DEFAULT false,
  is_tax_deductible BOOLEAN DEFAULT false,
  
  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 软删除
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 分类表（预设 + 自定义）
-- ========================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT, -- 图标名称（Lucide Icons）
  color TEXT, -- 十六进制颜色
  is_default BOOLEAN DEFAULT false, -- 系统预设分类
  parent_category_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- ========================================
-- 用户设置表
-- ========================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通用设置
  default_currency TEXT DEFAULT 'CAD',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  
  -- 通知设置
  email_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  
  -- 显示设置
  theme TEXT DEFAULT 'light', -- light / dark / auto
  items_per_page INTEGER DEFAULT 20,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 索引
-- ========================================
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date DESC);
CREATE INDEX idx_receipts_category ON receipts(category);
CREATE INDEX idx_receipts_merchant ON receipts(merchant_name);
CREATE INDEX idx_receipts_deleted ON receipts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_receipts_tags ON receipts USING GIN(tags);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_name ON categories(name);

-- ========================================
-- 自动更新 updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS)
-- ========================================
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Receipts 策略
CREATE POLICY "Users can view their own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Categories 策略
CREATE POLICY "Users can view their own categories and defaults"
  ON categories FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- User Settings 策略
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- 视图：月度汇总
-- ========================================
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', receipt_date) AS month,
  category,
  COUNT(*) AS receipt_count,
  SUM(total_amount) AS total_spent,
  AVG(total_amount) AS avg_amount
FROM receipts
WHERE deleted_at IS NULL
GROUP BY user_id, month, category;

-- ========================================
-- 插入默认分类
-- ========================================
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('Food & Dining', 'utensils', '#EF4444', true),
  ('Transportation', 'car', '#3B82F6', true),
  ('Office Supplies', 'briefcase', '#8B5CF6', true),
  ('Utilities', 'zap', '#F59E0B', true),
  ('Entertainment', 'film', '#EC4899', true),
  ('Healthcare', 'heart', '#10B981', true),
  ('Travel', 'plane', '#06B6D4', true),
  ('Shopping', 'shopping-bag', '#6366F1', true),
  ('Professional Services', 'users', '#14B8A6', true),
  ('Other', 'more-horizontal', '#6B7280', true);

-- ========================================
-- 分析函数：按类别统计
-- ========================================
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  total_amount NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.category,
    COUNT(*)::BIGINT AS count,
    SUM(r.total_amount) AS total_amount,
    ROUND(
      (SUM(r.total_amount) / NULLIF(
        (SELECT SUM(total_amount) FROM receipts 
         WHERE user_id = p_user_id 
         AND receipt_date BETWEEN p_start_date AND p_end_date
         AND deleted_at IS NULL), 
        0
      ) * 100), 
      2
    ) AS percentage
  FROM receipts r
  WHERE r.user_id = p_user_id
    AND r.receipt_date BETWEEN p_start_date AND p_end_date
    AND r.deleted_at IS NULL
  GROUP BY r.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Gemini 2.0 Flash 收据识别

### API 配置

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 使用 Gemini 2.0 Flash 模型
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp" // 或 "gemini-2.0-flash-001"
});
```

### 提示词设计（Prompt Engineering）

```typescript
const RECEIPT_ANALYSIS_PROMPT = `
You are a receipt analysis AI. Analyze this receipt image and extract the following information in JSON format:

{
  "merchant_name": "Store or business name",
  "receipt_date": "YYYY-MM-DD format",
  "total_amount": "Numeric value only (e.g., 45.99)",
  "currency": "Currency code (e.g., CAD, USD)",
  "items": [
    {
      "description": "Item description",
      "quantity": 1,
      "price": 10.00
    }
  ],
  "category": "Suggested category from: Food & Dining, Transportation, Office Supplies, Utilities, Entertainment, Healthcare, Travel, Shopping, Professional Services, Other",
  "confidence": "0.0 to 1.0",
  "raw_text": "All visible text from the receipt"
}

Important guidelines:
1. Extract dates carefully (check DD/MM vs MM/DD based on context)
2. Total amount should be the final amount paid (after tax)
3. Currency should default to CAD if not specified
4. Category should be your best guess based on merchant name and items
5. Confidence should reflect how certain you are about the extraction
6. If any field is unclear, use null
7. Return ONLY valid JSON, no additional text

Receipt Image:
`;
```

### 完整识别流程

```typescript
// lib/receipt-analyzer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReceiptData {
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  category: string;
  confidence: number;
  raw_text: string;
}

export async function analyzeReceipt(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ReceiptData> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });

    // 将图片转换为 base64
    const imageBase64 = imageBuffer.toString('base64');

    const result = await model.generateContent([
      RECEIPT_ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // 清理 Gemini 响应（去除 Markdown 代码块）
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const receiptData: ReceiptData = JSON.parse(cleanedText);

    // 验证和标准化数据
    return {
      merchant_name: receiptData.merchant_name || 'Unknown Merchant',
      receipt_date: receiptData.receipt_date || new Date().toISOString().split('T')[0],
      total_amount: receiptData.total_amount || 0,
      currency: receiptData.currency || 'CAD',
      items: receiptData.items || [],
      category: receiptData.category || 'Other',
      confidence: receiptData.confidence || 0.5,
      raw_text: receiptData.raw_text || '',
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    throw new Error('Failed to analyze receipt with Gemini');
  }
}
```

### 错误处理和重试机制

```typescript
// lib/receipt-analyzer.ts (续)
import { retry } from '@/lib/utils/retry';

export async function analyzeReceiptWithRetry(
  imageBuffer: Buffer,
  mimeType: string,
  maxRetries = 3
): Promise<ReceiptData> {
  return retry(
    () => analyzeReceipt(imageBuffer, mimeType),
    {
      maxRetries,
      retryDelay: 1000,
      shouldRetry: (error) => {
        // 只重试网络错误和速率限制
        return error.message.includes('network') || 
               error.message.includes('rate limit');
      }
    }
  );
}
```

### 成本优化策略

```yaml
Gemini 2.0 Flash 定价（截至 2024）:
  输入（每百万 tokens）: $0.075
  输出（每百万 tokens）: $0.30
  
估算:
  每张收据图片: ~1,000 tokens (输入) + 500 tokens (输出)
  单次识别成本: ~$0.0002 (约 0.02 分钱)
  
月度成本估算:
  100 张收据/月: $0.02
  1,000 张收据/月: $0.20
  10,000 张收据/月: $2.00
  
优化建议:
  1. 压缩图片到 1024x1024 以下
  2. 使用 JPEG 格式（比 PNG 小）
  3. 缓存已识别的收据
  4. 批量处理（如果适用）
```

---

## API 端点设计

### 1. 上传并识别收据

```typescript
// app/api/receipts/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/cloudflare-r2';
import { analyzeReceiptWithRetry } from '@/lib/receipt-analyzer';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 验证用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // 转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到 Cloudflare R2
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const imageUrl = await uploadToR2(buffer, fileName, file.type);

    // 使用 Gemini 分析收据
    const analysisResult = await analyzeReceiptWithRetry(buffer, file.type);

    // 保存到数据库
    const { data: receipt, error: dbError } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        merchant_name: analysisResult.merchant_name,
        receipt_date: analysisResult.receipt_date,
        total_amount: analysisResult.total_amount,
        currency: analysisResult.currency,
        category: analysisResult.category,
        ocr_raw_text: analysisResult.raw_text,
        gemini_response: analysisResult,
        confidence_score: analysisResult.confidence,
        image_url: imageUrl,
        image_size_bytes: file.size,
        image_mime_type: file.type,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt,
      analysis: analysisResult,
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

### 2. 获取收据列表

```typescript
// app/api/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 验证用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');

    // 构建查询
    let query = supabase
      .from('receipts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('receipt_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 应用过滤器
    if (category) {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('receipt_date', startDate);
    }

    if (endDate) {
      query = query.lte('receipt_date', endDate);
    }

    if (search) {
      query = query.or(
        `merchant_name.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    const { data: receipts, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}
```

### 3. 更新收据

```typescript
// app/api/receipts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // 验证允许更新的字段
    const allowedFields = [
      'merchant_name',
      'receipt_date',
      'total_amount',
      'category',
      'subcategory',
      'notes',
      'tags',
      'is_reimbursable',
      'is_tax_deductible',
    ];

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    const { data: receipt, error: dbError } = await supabase
      .from('receipts')
      .update(filteredUpdates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update receipt' },
        { status: 500 }
      );
    }

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ receipt });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 软删除
    const { error: dbError } = await supabase
      .from('receipts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}
```

### 4. 报表 API

```typescript
// app/api/reports/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format

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

    // 获取分类统计
    const { data: categoryBreakdown, error: categoryError } = await supabase
      .rpc('get_category_breakdown', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (categoryError) {
      console.error('Category breakdown error:', categoryError);
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    // 获取总计
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('total_amount')
      .eq('user_id', user.id)
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .is('deleted_at', null);

    if (receiptsError) {
      console.error('Receipts error:', receiptsError);
      return NextResponse.json(
        { error: 'Failed to calculate totals' },
        { status: 500 }
      );
    }

    const totalSpent = receipts.reduce(
      (sum, r) => sum + parseFloat(r.total_amount),
      0
    );

    return NextResponse.json({
      month,
      totalSpent,
      receiptCount: receipts.length,
      categoryBreakdown,
    });

  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
```

---

## 前端页面结构

### 页面路由结构

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx         # Dashboard 布局（侧边栏）
│   ├── page.tsx           # 主页（重定向到 /receipts）
│   ├── receipts/
│   │   ├── page.tsx       # 收据列表
│   │   ├── upload/
│   │   │   └── page.tsx   # 上传收据
│   │   └── [id]/
│   │       └── page.tsx   # 收据详情
│   ├── reports/
│   │   └── page.tsx       # 报表页面
│   └── settings/
│       └── page.tsx       # 设置页面
└── api/                   # API 路由（见上文）
```

### 1. 上传页面

```typescript
// app/(dashboard)/receipts/upload/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function UploadReceiptPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResult(data);

      // 3秒后跳转到收据详情页
      setTimeout(() => {
        router.push(`/receipts/${data.receipt.id}`);
      }, 3000);

    } catch (err) {
      setError('Failed to upload receipt. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload Receipt</h1>

      <Card className="p-8">
        {!preview ? (
          <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-sm text-gray-600">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-gray-500 mt-2">
              PNG, JPG or WEBP (max. 10MB)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-full rounded-lg"
            />

            {!result ? (
              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Upload & Analyze'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">
                    Receipt Analyzed Successfully!
                  </span>
                </div>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>Merchant:</strong> {result.analysis.merchant_name}</p>
                  <p><strong>Amount:</strong> ${result.analysis.total_amount}</p>
                  <p><strong>Date:</strong> {result.analysis.receipt_date}</p>
                  <p><strong>Category:</strong> {result.analysis.category}</p>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  Redirecting to receipt details...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-900">{error}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
```

### 2. 收据列表页面

```typescript
// app/(dashboard)/receipts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReceiptCard } from '@/components/receipts/receipt-card';

export default function ReceiptsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/receipts');
      const data = await response.json();
      setReceipts(data.receipts);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Receipts</h1>
        <Button onClick={() => router.push('/receipts/upload')}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Receipt
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No receipts yet</p>
          <Button onClick={() => router.push('/receipts/upload')}>
            Upload Your First Receipt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt: any) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onClick={() => router.push(`/receipts/${receipt.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 实施时间表

### Week 1: 基础设施 + 认证（Jan 27 - Feb 2）

```yaml
Day 1-2: 数据库设置
  ☐ 在 Supabase 中运行迁移脚本
  ☐ 验证表结构和 RLS 策略
  ☐ 插入默认分类数据
  ☐ 测试数据库连接

Day 3-4: 认证系统
  ☐ 完善登录/注册页面
  ☐ 实现密码重置功能
  ☐ 配置 Session 管理
  ☐ 创建认证中间件
  ☐ 保护 Dashboard 路由

Day 5-7: 基础 UI 框架
  ☐ 安装 shadcn/ui 组件
  ☐ 创建 Dashboard 布局
  ☐ 设计侧边栏导航
  ☐ 创建空白页面框架
```

### Week 2: Gemini 集成 + 上传功能（Feb 3 - Feb 9）

```yaml
Day 1-2: Cloudflare R2 配置
  ☐ 创建 R2 存储桶
  ☐ 配置 API 密钥
  ☐ 实现上传工具函数
  ☐ 测试图片上传

Day 3-5: Gemini 识别
  ☐ 安装 Gemini SDK
  ☐ 设计提示词
  ☐ 实现识别函数
  ☐ 添加错误处理和重试
  ☐ 测试各种收据格式

Day 6-7: 上传页面
  ☐ 创建文件上传 UI
  ☐ 实现拖拽上传
  ☐ 显示预览
  ☐ 调用识别 API
  ☐ 显示识别结果
```

### Week 3: 收据管理（Feb 10 - Feb 16）

```yaml
Day 1-3: 收据列表
  ☐ 创建收据列表 API
  ☐ 实现搜索功能
  ☐ 添加过滤选项
  ☐ 设计收据卡片组件
  ☐ 实现分页

Day 4-5: 收据详情
  ☐ 创建详情页面
  ☐ 显示收据信息
  ☐ 查看原图
  ☐ 编辑功能
  ☐ 删除功能

Day 6-7: 分类管理
  ☐ 显示预设分类
  ☐ 创建自定义分类
  ☐ 编辑分类
  ☐ 分类图标和颜色选择
```

### Week 4: 报表功能（Feb 17 - Feb 23）

```yaml
Day 1-3: 统计 API
  ☐ 实现月度汇总
  ☐ 按分类统计
  ☐ 费用趋势分析
  ☐ 导出 CSV 功能

Day 4-7: 报表 UI
  ☐ 安装图表库（Recharts）
  ☐ 创建饼图（分类占比）
  ☐ 创建折线图（费用趋势）
  ☐ 显示统计数据
  ☐ 实现导出功能
  ☐ 月份选择器
```

### Week 5: 测试和优化（Feb 24 - Mar 2）

```yaml
Day 1-3: 功能测试
  ☐ 端到端测试
  ☐ Bug 修复
  ☐ 边界情况处理
  ☐ 性能优化

Day 4-5: UI/UX 优化
  ☐ 响应式设计检查
  ☐ 加载状态优化
  ☐ 错误提示优化
  ☐ 用户体验改进

Day 6-7: 准备上线
  ☐ 文档编写
  ☐ 部署到生产环境
  ☐ 监控设置
  ☐ Beta 测试准备
```

---

## 成本估算

### 开发成本（时间投入）

```yaml
总开发时间: ~5 周（约 200 小时）

Week 1 (基础设施): 40 小时
Week 2 (Gemini 集成): 40 小时
Week 3 (收据管理): 40 小时
Week 4 (报表功能): 40 小时
Week 5 (测试优化): 40 小时
```

### 运营成本（月度）

```yaml
基础设施成本:
  Vercel Pro: $20/月（可选，Hobby 免费）
  Supabase Pro: $25/月（前期可用免费版）
  Cloudflare R2: ~$1/月（10GB 存储 + 流量）
  
AI 识别成本（Gemini 2.0 Flash）:
  100 张收据/月: $0.02
  1,000 张收据/月: $0.20
  10,000 张收据/月: $2.00
  
总计（保守估计）:
  前期（免费层）: ~$1-2/月
  增长期（付费层）: ~$50-100/月
```

### 收入预测（假设）

```yaml
定价策略:
  Free Tier:
    - 最多 50 张收据/月
    - 基础报表
    
  Pro Tier ($9/月):
    - 无限收据
    - 高级报表
    - 导出功能
    - 优先支持
    
  Business Tier ($29/月):
    - Pro 功能
    - 团队协作
    - API 访问
    - 白标定制

第一年目标:
  Month 3: 50 免费用户，5 付费用户 → $45 MRR
  Month 6: 200 免费用户，30 付费用户 → $270 MRR
  Month 12: 1,000 免费用户，150 付费用户 → $1,350 MRR
  
年收入: ~$16,200
ROI: 盈亏平衡 + 可持续增长
```

---

## 附录

### 环境变量配置

```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=ledgersnap-receipts
R2_PUBLIC_URL=https://your-r2-public-url

# Next.js
NEXT_PUBLIC_APP_URL=https://dev.ledgersnap.app
```

### 有用的库和工具

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.1.3",
    "@supabase/supabase-js": "^2.38.0",
    "@aws-sdk/client-s3": "^3.450.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

**🎉 LedgerSnap MVP 规格文档完成！**

下一步行动:
1. 审核技术方案
2. 运行数据库迁移
3. 开始 Week 1 开发
4. 定期同步进度

**问题或建议？** 随时联系 CTO Patrick Jiang 讨论！
