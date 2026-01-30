# Transaction 显示问题诊断

## 📊 当前状态

从日志看：
- ✅ Transaction 创建成功: `a798e0e3-a630-4ded-8f79-d9efb791389e`
- ✅ Organization ID: `2fb12b1f-0d9f-4a6a-8518-cf3030ebe717`
- ✅ 查询 API 返回 200: `GET /transactions 200`
- ❌ 但没有看到 `[Transactions API]` 的日志输出

---

## 🔍 问题分析

### 问题 1: Transaction Items 插入失败 ✅ 已修复

**错误**:
```
[Upload API] Failed to insert transaction items: {
  code: '428C9',
  details: 'Column "amount" is a generated column.',
  message: 'cannot insert a non-DEFAULT value into column "amount"'
}
```

**原因**: `transaction_items.amount` 是 GENERATED column，由 `quantity * unit_price` 自动计算，不能手动插入。

**修复**: 已从插入语句中移除 `amount` 字段。

### 问题 2: 查询 API 没有显示数据 ⚠️ 待诊断

**可能原因**:
1. 代码还没有重新编译，新的日志没有输出
2. 查询条件不匹配（organization_id、direction 等）
3. 数据确实返回了，但前端没有正确显示

---

## 🔧 诊断步骤

### 步骤 1: 刷新页面并查看日志

刷新 Dashboard 页面，应该看到：
```
[Transactions API] ============================================
[Transactions API] Request received: { ... }
[Transactions API] User authenticated: { ... }
[Transactions API] Organization check: { ... }
[Transactions API] Query result: { ... }
```

### 步骤 2: 检查浏览器控制台

按 F12 → Console，查找：
```
[Dashboard] Transactions fetched: { ... }
```

### 步骤 3: 直接查询数据库

在 Supabase Dashboard SQL Editor 中执行：

```sql
-- 检查 transaction 是否存在
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
WHERE id = 'a798e0e3-a630-4ded-8f79-d9efb791389e';

-- 检查符合查询条件的 transactions
SELECT 
  t.id,
  t.organization_id,
  t.vendor_name,
  t.total_amount,
  t.direction,
  t.deleted_at,
  om.organization_id as user_org_id
FROM transactions t
LEFT JOIN organization_members om ON om.user_id = '813778b5-9823-46cd-b10d-303adf3a0df0'
WHERE t.organization_id = '2fb12b1f-0d9f-4a6a-8518-cf3030ebe717'
  AND t.direction = 'expense'
  AND t.deleted_at IS NULL
ORDER BY t.transaction_date DESC
LIMIT 5;
```

---

## ✅ 已修复的问题

1. **Transaction Items 插入失败** ✅
   - 移除了 `amount` 字段（它是 generated column）
   - 现在只会插入 `quantity` 和 `unit_price`，`amount` 会自动计算

---

## 📋 下一步

1. **刷新 Dashboard 页面**
2. **查看服务器日志** - 应该看到 `[Transactions API]` 的详细日志
3. **查看浏览器控制台** - 应该看到 `[Dashboard] Transactions fetched:` 日志
4. **如果还是没有数据**，执行上面的 SQL 查询检查数据库

---

**请刷新页面并提供新的日志输出！** 🔍
