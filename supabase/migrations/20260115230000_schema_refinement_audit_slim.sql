-- [1] 合并冗余的资产标记字段
ALTER TABLE public.transactions DROP COLUMN IF EXISTS "is_capital_asset";

-- ADD COLUMN IF NOT EXISTS "tax_amount" numeric(15,2) DEFAULT 0; -- Ensure tax_amount exists before commenting (Safety check based on grep results)

-- [2] 优化税收字段注释，明确逻辑关系
COMMENT ON COLUMN public.transactions.tax_amount IS 'Total Tax Sum (Primary + Secondary)';
COMMENT ON COLUMN public.transactions.primary_tax_amount IS 'Main Tax (GST in CA / State Tax in US)';
COMMENT ON COLUMN public.transactions.secondary_tax_amount IS 'Additional Tax (PST in CA / Local Tax in US)';

-- [3] 确保所有 CFO 要求的审计字段具备默认值，防止空值报错
ALTER TABLE public.transactions 
ALTER COLUMN "approval_status" SET DEFAULT 'L1',
ALTER COLUMN "audit_locked" SET DEFAULT false,
ALTER COLUMN "is_asset" SET DEFAULT false;

-- [4] 增加一个简单的检查约束，确保逻辑闭环
-- 总税额必须等于两个子税额之和
-- ALTER TABLE public.transactions ADD CONSTRAINT tax_integrity_check 
-- CHECK (tax_amount = (primary_tax_amount + secondary_tax_amount));
