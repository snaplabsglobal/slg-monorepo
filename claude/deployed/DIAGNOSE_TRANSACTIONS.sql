-- ============================================================================
-- Transaction 显示问题诊断 SQL
-- ============================================================================
-- 在 Supabase Dashboard SQL Editor 中执行这些查询来诊断问题
-- ============================================================================

-- 1. 检查最近的 transactions
SELECT 
  id,
  organization_id,
  user_id,
  vendor_name,
  total_amount,
  transaction_date,
  direction,
  status,
  needs_review,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 2. 检查用户的 organization
SELECT 
  u.email,
  u.id as user_id,
  om.organization_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
ORDER BY u.created_at DESC;

-- 3. 检查 organization_id 匹配情况
SELECT 
  t.id as transaction_id,
  t.organization_id as tx_org_id,
  t.user_id,
  t.vendor_name,
  t.total_amount,
  om.organization_id as user_org_id,
  CASE 
    WHEN t.organization_id = om.organization_id THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as match_status
FROM transactions t
LEFT JOIN organization_members om ON t.user_id = om.user_id
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. 统计 transactions 数量
SELECT 
  COUNT(*) as total_transactions,
  COUNT(DISTINCT organization_id) as unique_orgs,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction
FROM transactions;

-- 5. 按 organization 统计
SELECT 
  o.name as org_name,
  o.id as org_id,
  COUNT(t.id) as transaction_count,
  SUM(t.total_amount) as total_amount
FROM organizations o
LEFT JOIN transactions t ON o.id = t.organization_id
GROUP BY o.id, o.name
ORDER BY transaction_count DESC;

-- 6. 检查 direction 和 status
SELECT 
  direction,
  status,
  needs_review,
  COUNT(*) as count
FROM transactions
GROUP BY direction, status, needs_review
ORDER BY count DESC;

-- 7. 检查是否有 deleted transactions
SELECT 
  COUNT(*) as deleted_count
FROM transactions
WHERE deleted_at IS NOT NULL;

-- 8. 检查最近的 transactions（包括所有字段）
SELECT 
  *
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
