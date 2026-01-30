-- ============================================
-- 修复退货/退款负数金额约束
-- ============================================
-- 在 Supabase Dashboard SQL Editor 中执行此脚本
-- 或者通过 supabase db push 应用 migration
-- ============================================

-- 1. 删除旧的非负数约束
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_non_negative_amount;

ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_non_negative_tax;

-- 2. 添加新约束：只要求非 NULL，允许负数
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_amount_not_null 
  CHECK (total_amount IS NOT NULL);

-- 3. 添加注释说明
COMMENT ON CONSTRAINT transactions_amount_not_null ON transactions IS 
  'Allows negative amounts for refunds, returns, and credits. Positive amounts are normal transactions.';

-- 注意: tax_amount 列已经允许 NULL，删除非负数约束后即可支持负数（用于退税）

-- 验证：检查约束是否已更新
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE '%amount%';
