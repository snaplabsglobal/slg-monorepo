# Transaction 显示问题诊断

**问题**: 文件成功上传到 R2，但 Dashboard 的 transaction 窗口没有显示任何数据

---

## 🔍 可能的原因

### 1. Transaction 未成功创建
- Gemini 分析失败，但错误被静默处理
- Transaction 插入失败，但错误未正确报告

### 2. Organization ID 不匹配
- 上传时使用的 organization_id 与查询时的不一致
- 用户有多个 Organization，查询了错误的那个

### 3. 查询条件问题
- Dashboard 查询使用了特定的 filter（如 `direction=expense`）
- Transaction 的某些字段不匹配查询条件

### 4. RLS 策略问题
- 虽然已禁用 RLS，但可能还有其他限制

---

## ✅ 已添加的调试日志

### 上传 API (`/api/receipts/upload`)
- ✅ Transaction 创建成功/失败的详细日志
- ✅ Organization ID 记录
- ✅ Transaction ID 记录

### 查询 API (`/api/transactions`)
- ✅ Organization 检查日志
- ✅ 查询结果日志（count, transactions_count）
- ✅ 错误详情日志

### Dashboard 组件
- ✅ 前端获取 transactions 的日志
- ✅ 错误处理日志

---

## 🧪 诊断步骤

### 步骤 1: 检查服务器日志

查看运行 `pnpm dev` 的终端，查找以下日志：

**上传时应该看到**:
```
[Upload API] Transaction created successfully: {
  transaction_id: '...',
  organization_id: '...',
  vendor_name: '...',
  total_amount: ...,
  transaction_date: '...'
}
```

**查询时应该看到**:
```
[Transactions API] Organization check: {
  user_id: '...',
  has_membership: true,
  organization_id: '...'
}
[Transactions API] Query result: {
  organization_id: '...',
  direction: 'expense',
  count: ...,
  transactions_count: ...
}
```

### 步骤 2: 检查浏览器控制台

打开浏览器开发者工具 (F12) → Console，查找：

```
[Dashboard] Transactions fetched: {
  count: ...,
  transactions: [...],
  pagination: {...}
}
```

### 步骤 3: 直接查询数据库

在 Supabase Dashboard SQL Editor 中执行：

```sql
-- 检查最近的 transactions
SELECT 
  id,
  organization_id,
  user_id,
  vendor_name,
  total_amount,
  transaction_date,
  direction,
  status,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 检查用户的 organization
SELECT 
  u.email,
  u.id as user_id,
  om.organization_id,
  o.name as org_name
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'YOUR_EMAIL@example.com';
```

---

## 🔧 快速修复检查清单

### 检查 1: Transaction 是否创建
```sql
SELECT COUNT(*) FROM transactions;
-- 应该 > 0
```

### 检查 2: Organization ID 匹配
```sql
-- 获取用户的 organization_id
SELECT organization_id FROM organization_members 
WHERE user_id = 'YOUR_USER_ID';

-- 检查 transactions 的 organization_id
SELECT DISTINCT organization_id FROM transactions;
-- 应该匹配上面的 organization_id
```

### 检查 3: 查询条件
```sql
-- 检查是否有 direction='expense' 的 transactions
SELECT COUNT(*) FROM transactions 
WHERE direction = 'expense' 
AND deleted_at IS NULL;
```

---

## 🎯 常见问题解决方案

### 问题 1: Transaction 创建但查询不到

**可能原因**: Organization ID 不匹配

**解决**:
```sql
-- 检查并修复
SELECT 
  t.id,
  t.organization_id as tx_org_id,
  om.organization_id as user_org_id
FROM transactions t
LEFT JOIN organization_members om ON t.user_id = om.user_id
WHERE t.organization_id != om.organization_id;
```

### 问题 2: Gemini 分析失败导致无数据

**检查**: 查看服务器日志中的 `Gemini analysis error`

**解决**: 即使分析失败，transaction 也应该被创建（使用默认值）

### 问题 3: 查询 API 返回空数组

**检查**: 
1. 查看 `[Transactions API] Query result` 日志
2. 检查 `count` 和 `transactions_count` 的值

**解决**: 如果 count > 0 但 transactions_count = 0，可能是分页问题

---

## 📋 下一步操作

1. **重启开发服务器**（如果还没有）
2. **上传一张新的收据**
3. **查看服务器日志**（终端输出）
4. **查看浏览器控制台**（F12 → Console）
5. **根据日志信息诊断问题**

---

**请提供服务器日志和浏览器控制台的输出，我可以帮你进一步诊断！** 🔍
