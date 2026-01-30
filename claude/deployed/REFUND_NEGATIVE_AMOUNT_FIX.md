# 退货/退款负数金额修复

## 🔍 问题

**错误信息**:
```
new row for relation "transactions" violates check constraint "transactions_non_negative_amount"
```

**原因**:
- 数据库约束 `transactions_non_negative_amount` 要求 `total_amount >= 0`
- 但退货/退款（refunds/returns）需要负数金额
- AI 识别出负数金额 `-67.13`（退货场景）

---

## ✅ 解决方案

### 1. 修改数据库约束

**Migration**: `supabase/migrations/20260129000001_allow_negative_amounts_for_refunds.sql`

**变更**:
- ❌ 删除约束：`transactions_non_negative_amount` (要求 `total_amount >= 0`)
- ✅ 新约束：`transactions_amount_not_null` (只要求 `total_amount IS NOT NULL`)

**说明**:
- 允许负数金额用于退货/退款/信用额度
- 正数金额用于正常支出/收入
- 仍然防止 NULL 值

---

## 📋 应用修复

### 方法 1: 使用 Supabase Dashboard SQL Editor（推荐）

1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制并执行 `claude/APPLY_REFUND_FIX.sql` 中的 SQL 语句

### 方法 2: 使用 Migration（如果 push 成功）

```bash
cd /home/pxjiang/slg-monorepo
supabase db push
```

**注意**: 如果遇到权限错误，使用方法 1（SQL Editor）直接执行。

---

## 🎯 业务逻辑说明

### 负数金额的使用场景

1. **退货 (Returns)**
   - 金额：`-67.13`
   - Direction: `expense`（仍然是支出类别，只是金额为负）
   - 说明：退回已购买的物品

2. **退款 (Refunds)**
   - 金额：负数
   - 说明：供应商退回已支付的款项

3. **信用额度 (Credits)**
   - 金额：负数
   - 说明：供应商提供的信用额度

### 显示逻辑

在 UI 中，负数金额应该：
- 显示为负数（如 `-$67.13`）
- 或者显示为红色/特殊样式
- 明确标识为"退货"或"退款"

---

## 🔧 后续优化建议

### 1. 添加 `is_refund` 字段（可选）

如果需要明确区分退货和正常交易：

```sql
ALTER TABLE transactions 
  ADD COLUMN is_refund BOOLEAN DEFAULT false;

-- 自动检测：如果金额为负，标记为退货
UPDATE transactions 
SET is_refund = true 
WHERE total_amount < 0;
```

### 2. UI 显示优化

在 Dashboard 和 Transactions 列表中：
- 负数金额显示为红色
- 添加"退货"或"退款"标签
- 在统计中正确处理负数（可能需要单独统计）

### 3. 报表逻辑

在生成报表时：
- 退货应该从总支出中扣除
- 或者单独显示退货总额
- 确保会计逻辑正确

---

## ✅ 验证

应用 migration 后，测试：

1. **上传退货收据**
   - 应该能成功创建负数金额的 transaction
   - 不再出现约束错误

2. **查看 Dashboard**
   - 负数金额正确显示
   - 统计计算正确

3. **查看 Transactions 列表**
   - 负数金额可见
   - 可以正确筛选和排序

---

**请运行 `supabase db push` 应用 migration！** 🚀
