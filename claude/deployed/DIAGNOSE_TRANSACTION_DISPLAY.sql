-- 诊断 Transaction 显示问题
-- 在 Supabase Dashboard SQL Editor 中执行

-- 1. 检查最近的 transactions（包括刚创建的）
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

-- 2. 检查特定 transaction（从日志中的 ID）
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
WHERE id = '25f2fd9e-05f0-42a1-b27c-d6329358c237';

-- 3. 检查用户的 organization
SELECT 
  u.id as user_id,
  u.email,
  om.organization_id,
  o.name as org_name,
  o.created_at as org_created_at
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 4. 检查 organization_id 是否匹配
-- 替换 YOUR_USER_EMAIL 为你的实际邮箱
SELECT 
  t.id as transaction_id,
  t.organization_id as tx_org_id,
  t.direction,
  t.status,
  t.created_at as tx_created_at,
  om.organization_id as user_org_id,
  CASE 
    WHEN t.organization_id = om.organization_id THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as org_match
FROM transactions t
CROSS JOIN (
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL' LIMIT 1)
  LIMIT 1
) om
ORDER BY t.created_at DESC
LIMIT 10;

-- 5. 检查符合 Dashboard 查询条件的 transactions
-- Dashboard 查询: /api/transactions?limit=5&direction=expense
SELECT 
  t.id,
  t.organization_id,
  t.vendor_name,
  t.total_amount,
  t.transaction_date,
  t.direction,
  t.status,
  t.deleted_at
FROM transactions t
INNER JOIN organization_members om ON t.organization_id = om.organization_id
WHERE t.direction = 'expense'
  AND t.deleted_at IS NULL
  AND om.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL' LIMIT 1)
ORDER BY t.transaction_date DESC
LIMIT 5;
