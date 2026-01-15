-- Migration: Ultimate Transactions v2.1.1 (Reboot)
-- Timestamp: 20260114072000
-- Purpose: Clean legacy architecture and establish 32-field transactions table.

BEGIN;

-- [1] 彻底清理旧架构 (Force Clean)
DROP TABLE IF EXISTS public.receipt_projects CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.transaction_items CASCADE; -- Ensure clean slate for items too
DROP TABLE IF EXISTS public.transactions CASCADE;      -- Ensure clean slate for transactions too

-- [2] 创建 32 字段主表
CREATE TABLE public.transactions (
    -- 身份与多租户
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID REFERENCES public.projects(id),
    user_id UUID REFERENCES auth.users(id),
    source_app TEXT,
    transaction_date DATE NOT NULL,
    
    -- 财务核心
    direction TEXT DEFAULT 'expense' CHECK (direction IN ('income', 'expense')),
    total_amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    exchange_rate NUMERIC(10,5) DEFAULT 1.0,
    base_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount * exchange_rate) STORED, -- Computed
    
    -- 税务抵扣 (针对加拿大/BC省优化)
    tax_amount NUMERIC(15,2),
    tax_details JSONB, -- 存储 {"gst": 5.0, "pst": 7.0}
    is_tax_deductible BOOLEAN DEFAULT true,
    deductible_rate NUMERIC(3,2) DEFAULT 1.0,
    
    -- AI 翻译与分类
    category_user TEXT,
    category_tax TEXT, -- CRA科目代码
    expense_type TEXT DEFAULT 'business',
    is_capital_asset BOOLEAN DEFAULT false,
    vendor_name TEXT,
    
    -- 证据链
    attachment_url TEXT,
    image_hash TEXT,
    entry_source TEXT DEFAULT 'ocr',
    ai_confidence NUMERIC(3,2),
    
    -- 审计流与状态
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'paid',
    is_reimbursable BOOLEAN DEFAULT false, -- [NEW] 报销标记
    needs_review BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    internal_notes TEXT,
    
    -- 原始记忆 (黑匣子)
    raw_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- [3] 创建明细子表
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    description TEXT,
    quantity NUMERIC(15,2),
    unit_price NUMERIC(15,2),
    amount NUMERIC(15,2),
    category_tax TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [4] 建立查询索引
CREATE INDEX idx_transactions_org ON public.transactions(org_id);
CREATE INDEX idx_transactions_project ON public.transactions(project_id);

COMMIT;
