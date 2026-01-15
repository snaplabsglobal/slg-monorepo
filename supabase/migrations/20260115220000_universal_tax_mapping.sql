-- [1] 撤销之前具体的 state_tax 命名，改用通用业务槽位
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS "state_tax_amount",
DROP COLUMN IF EXISTS "local_tax_amount";

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS "primary_tax_amount" numeric(15,2) DEFAULT 0,   -- 对应 GST / State Tax
ADD COLUMN IF NOT EXISTS "secondary_tax_amount" numeric(15,2) DEFAULT 0; -- 对应 PST / Local Tax

-- [2] 为这两个字段增加注释，说明映射逻辑
COMMENT ON COLUMN public.transactions.primary_tax_amount IS 'Stores GST for CA or State Tax for US based on organization region.';
COMMENT ON COLUMN public.transactions.secondary_tax_amount IS 'Stores PST for CA or Local Tax for US.';

-- [3] 建立一个触发器：确保当 JSONB 更新时，自动同步到物理字段（保持一致性）
CREATE OR REPLACE FUNCTION sync_tax_fields() RETURNS trigger AS $$
BEGIN
  -- 这里根据 org 的国家代码，从 JSONB 里提取对应的税值填入物理字段
  -- 示例逻辑：如果 country 为 CA，提取 gst 键值
  -- (Current implementation is a placeholder/foundation for future logic)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger (Optional, but good practice to have it ready or commented out until logic is populated)
-- CREATE TRIGGER trigger_sync_tax_fields BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION sync_tax_fields();
