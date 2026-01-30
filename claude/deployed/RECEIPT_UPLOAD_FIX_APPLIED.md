# Receipt Upload Fix - 已应用修复

## ✅ 已完成的修复

根据 `claude/RECEIPT_UPLOAD_FIX.md` 文档，已应用以下修复：

### 1. 金额处理 - 使用绝对值

**修复位置**: `apps/ls-web/app/api/receipts/upload/route.ts` (第 364-405 行)

**变更**:
- ✅ 使用 `Math.abs()` 处理所有金额（`subtotal_cents`, `gst_cents`, `pst_cents`, `total_cents`）
- ✅ 确保 `total_amount` 和 `tax_amount` 始终为正数
- ✅ 原始值（可能为负数）保留在 `raw_data.amounts_cents` 中
- ✅ 新增 `raw_data.amounts_absolute` 记录绝对值
- ✅ 新增 `raw_data.is_refund` 标记是否为退款

**代码示例**:
```typescript
const subtotalCents = Math.abs(analysis.subtotal_cents || 0);
const gstCents = Math.abs(analysis.gst_cents || 0);
const pstCents = Math.abs(analysis.pst_cents || 0);
const totalCents = Math.abs(analysis.total_cents || 0);
const isRefund = (analysis.total_cents || 0) < 0;

total_amount: totalCents / 100,  // 正数
tax_amount: gstCents / 100,     // 正数
```

### 2. 税额验证逻辑

**新增功能**:
- ✅ 计算预期 GST/PST（基于 subtotal × 税率）
- ✅ 检测税额差异（如果差异 > $0.50，标记为 `tax_mismatch`）
- ✅ 税额异常时自动标记 `needs_review: true`

**代码示例**:
```typescript
const expectedGST = Math.round(subtotalCents * 0.05);
const expectedPST = Math.round(subtotalCents * 0.07);
const gstDiff = Math.abs(gstCents - expectedGST);
const pstDiff = Math.abs(pstCents - expectedPST);
const taxMismatch = gstDiff > 50 || pstDiff > 50;
```

### 3. 增强的 tax_details

**新增字段**:
- ✅ `gst_rate: 0.05`
- ✅ `pst_rate: 0.07`
- ✅ `gst_amount` 和 `pst_amount`（美元值）
- ✅ `bc_province: true`
- ✅ `tax_mismatch: boolean`

### 4. Transaction Items 修复

**修复位置**: `apps/ls-web/app/api/receipts/upload/route.ts` (第 492 行)

**变更**:
- ✅ 使用 `Math.abs()` 处理 `unit_price`
- ✅ 确保单价始终为正数

### 5. 增强的日志输出

**新增日志**:
- ✅ 记录 `is_refund` 状态
- ✅ 记录 `tax_mismatch` 状态
- ✅ 记录原始金额和绝对值
- ✅ 退款和税额异常的特殊提示

---

## 📊 数据存储结构

### 主表字段（正数）
```typescript
{
  total_amount: 67.13,      // 正数（绝对值）
  tax_amount: 3.00,         // 正数（绝对值）
  // ...
}
```

### raw_data（保留原始值）
```typescript
{
  amounts_cents: {
    subtotal: -4500,        // 原始值（可能为负数）
    gst: -225,
    pst: -315,
    total: -5040,
  },
  amounts_absolute: {      // 新增：绝对值
    subtotal: 4500,
    gst: 225,
    pst: 315,
    total: 5040,
  },
  is_refund: true,          // 新增：退款标记
  // ...
}
```

### tax_details（增强）
```typescript
{
  gst_cents: 225,
  gst_amount: 2.25,
  gst_rate: 0.05,
  pst_cents: 315,
  pst_amount: 3.15,
  pst_rate: 0.07,
  total_tax_cents: 540,
  bc_province: true,
  tax_split_confidence: 0.95,
  tax_mismatch: false,      // 新增：税额异常标记
}
```

---

## 🎯 业务逻辑

### 退款处理

1. **检测**: 如果 `analysis.total_cents < 0`，标记为 `is_refund: true`
2. **存储**: 
   - 主表字段使用绝对值（正数）
   - `raw_data.amounts_cents` 保留原始负数
   - `raw_data.is_refund` 标记为 `true`
3. **显示**: 前端可以通过 `raw_data.is_refund` 判断是否为退款

### 税额验证

1. **计算预期值**: `subtotal × 5%` (GST), `subtotal × 7%` (PST)
2. **检测差异**: 如果实际税额与预期差异 > $0.50
3. **标记审核**: 自动设置 `needs_review: true` 和 `tax_mismatch: true`

### 零金额处理

- 如果 `totalCents === 0`，记录警告日志
- 仍然创建 transaction，但标记 `needs_review: true`

---

## ✅ 验证清单

- [x] 使用 `Math.abs()` 处理所有金额
- [x] 原始值保留在 `raw_data.amounts_cents`
- [x] 绝对值记录在 `raw_data.amounts_absolute`
- [x] 退款标记 `raw_data.is_refund`
- [x] 税额验证逻辑
- [x] `tax_mismatch` 检测
- [x] 增强的 `tax_details`
- [x] Transaction items 使用绝对值
- [x] 增强的日志输出

---

## 🔄 与数据库约束的关系

**注意**: 虽然我们已经修改了数据库约束允许负数（`20260129000001_allow_negative_amounts_for_refunds.sql`），但按照文档建议，我们仍然使用绝对值存储在主表字段中。

**原因**:
1. 保持数据一致性（所有主表金额为正数）
2. 退款信息通过 `raw_data.is_refund` 和原始值来标识
3. 简化报表和统计逻辑

**如果将来需要支持负数金额**:
- 可以移除 `Math.abs()` 调用
- 使用 `raw_data.is_refund` 来区分退款和正常交易
- 更新 UI 显示逻辑

---

**修复已完成！现在可以正确处理退货/退款收据，同时保持数据一致性。** ✅
