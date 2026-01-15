-- [1] 扩展交易表，增加审计级元数据
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS "gps_location" geography(POINT),        -- 地理位置
ADD COLUMN IF NOT EXISTS "payment_method_last4" TEXT,            -- 支付卡末四位
ADD COLUMN IF NOT EXISTS "business_purpose" TEXT,                -- 业务用途
ADD COLUMN IF NOT EXISTS "state_tax_amount" numeric(15,2),       -- 美国州税
ADD COLUMN IF NOT EXISTS "local_tax_amount" numeric(15,2),       -- 美国地方税
ADD COLUMN IF NOT EXISTS "is_asset" BOOLEAN DEFAULT false,       -- 是否为资产
ADD COLUMN IF NOT EXISTS "asset_category" TEXT,                  -- 资产分类 (如 Class 8)
ADD COLUMN IF NOT EXISTS "rd_percentage" numeric(5,2) DEFAULT 0, -- SR&ED 权重
ADD COLUMN IF NOT EXISTS "rd_nature" TEXT,                       -- 研发性质说明
ADD COLUMN IF NOT EXISTS "approval_status" TEXT DEFAULT 'L1',    -- L1-L3 审批流
ADD COLUMN IF NOT EXISTS "invoice_number" TEXT,                  -- 唯一发票号
ADD COLUMN IF NOT EXISTS "audit_locked" BOOLEAN DEFAULT false;   -- 会计锁账开关

-- [2] 创建不可篡改的审计日志表
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "record_id" uuid NOT NULL,
    "table_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changed_by" uuid REFERENCES auth.users(id),
    "old_data" jsonb,
    "new_data" jsonb,
    "timestamp" timestamptz DEFAULT now()
);

-- [3] 为审计日志开启 RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
create policy "Enable insert for authenticated users only"
on "public"."audit_logs"
as permissive
for insert
to authenticated
with check ( true );

create policy "Enable read access for authenticated users"
on "public"."audit_logs"
as permissive
for select
to authenticated
using ( true );
