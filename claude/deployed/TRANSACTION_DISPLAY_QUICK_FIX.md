# Transaction 显示问题 - 快速诊断

**问题**: 文件成功上传到 R2，但 Dashboard 没有显示 transaction 数据

---

## ✅ 关于 Supabase Studio 错误

`GET http://127.0.0.1:54323/api/incident-status 404` 错误来自 Supabase Studio（本地管理界面），**可以安全忽略**。这不是应用代码的问题。

---

## 🔍 诊断步骤

### 步骤 1: 检查浏览器控制台

打开浏览器开发者工具 (F12) → Console，查找：

**应该看到**:
```
[Dashboard] Transactions fetched: {
  count: ...,
  transactions: [...],
  pagination: {...}
}
```

**如果看到错误**:
```
[Dashboard] Failed to fetch transactions: {
  status: ...,
  error: {...}
}
```

### 步骤 2: 检查服务器日志

查看运行 `pnpm dev` 的终端，查找：

**上传时应该看到**:
```
[Upload API] Transaction created successfully: {
  transaction_id: '...',
  organization_id: '...',
  ...
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

### 步骤 3: 直接查询数据库

在 Supabase Dashboard SQL Editor 中执行：

```sql
-- 检查最近的 transactions
SELECT 
  id,
  organization_id,
  vendor_name,
  total_amount,
  transaction_date,
  direction,
  status,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;

-- 检查用户的 organization
SELECT 
  u.email,
  om.organization_id,
  o.name as org_name
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'YOUR_EMAIL@example.com';
```

---

## 🎯 常见问题和解决方案

### 问题 1: Transaction 已创建但查询不到

**可能原因**: Organization ID 不匹配

**检查**:
```sql
-- 检查 organization_id 是否匹配
SELECT 
  t.id,
  t.organization_id as tx_org_id,
  t.user_id,
  om.organization_id as user_org_id
FROM transactions t
LEFT JOIN organization_members om ON t.user_id = om.user_id
ORDER BY t.created_at DESC
LIMIT 5;
```

**如果发现不匹配**:
- 上传时使用的 organization_id 与查询时的不一致
- 可能是用户有多个 Organization

### 问题 2: 查询返回空数组但 count > 0

**可能原因**: 分页或查询条件问题

**检查**:
- Dashboard 查询: `/api/transactions?limit=5&direction=expense`
- 确保 transaction 的 `direction` 是 `'expense'`
- 确保 `deleted_at` 是 `NULL`

### 问题 3: Gemini 分析失败

**检查**: 查看服务器日志中的 `Gemini analysis error`

**即使分析失败，transaction 也应该被创建**（使用默认值）

---

## 🔧 立即检查

### 1. 查看浏览器控制台

按 F12 → Console，查找 `[Dashboard]` 开头的日志

### 2. 查看服务器终端

查找 `[Upload API]` 和 `[Transactions API]` 开头的日志

### 3. 执行 SQL 查询

在 Supabase Dashboard SQL Editor 中执行上面的查询

---

## 📋 请提供以下信息

1. **浏览器控制台输出**（特别是 `[Dashboard] Transactions fetched` 或错误信息）
2. **服务器终端输出**（特别是 `[Upload API]` 和 `[Transactions API]` 的日志）
3. **SQL 查询结果**（如果可能）

根据这些信息，我可以帮你进一步诊断问题！

---

**请提供浏览器控制台和服务器日志的输出，我可以帮你找到问题所在！** 🔍
