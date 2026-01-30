# 优雅的用户驱动学习系统

**CEO**: 不要硬编码，要让用户教 AI
**COO**: 一人纠错，全员受益
**CTO**: 去中心化学习 + 地域上下文

---

## ❌ 为什么硬编码不优雅？

```typescript
// ❌ 暴力方案
if (vendor === 'HOME DEPOT') {
  dateFormat = 'DD/MM/YY';
}

问题:
1. 不可扩展
2. 地域盲区
3. 维护噩梦
4. 不是真正的 ML
```

---

## ✅ 优雅方案

### 四层学习系统

```
Layer 1: 用户纠错
用户修改任何字段 → 自动记录

Layer 2: 智能分析
自动识别纠错类型 → 生成规则

Layer 3: 全局学习
累积纠正 → 形成共识 → 激活规则

Layer 4: 智能应用
下次识别 → 应用规则 → 直接正确
```

---

## 🗄️ 数据库设计

```sql
-- 修正记录
CREATE TABLE transaction_corrections (
  field_name VARCHAR(50),
  original_value TEXT,
  corrected_value TEXT,
  vendor_name VARCHAR(255),
  location_context JSONB,
  ...
);

-- 学习规则
CREATE TABLE vendor_patterns (
  vendor_name VARCHAR(255),
  field_name VARCHAR(50),
  pattern_value TEXT,
  correction_count INT,
  location_region VARCHAR(100),
  is_active BOOLEAN
);
```

---

## 🎯 核心特性

```
1. 全字段监控
   date, vendor, amount, tax...

2. 自动分析类型
   格式错误、年份推断、名称规范化...

3. 地域上下文
   温哥华规则 ≠ 西雅图规则

4. 自动激活
   10 次纠正 → 激活规则

5. 智能应用
   查询规则 → 应用 → 标记可疑
```

---

## 🛠️ 给 Cursor 的指令

```markdown
Task: User-Driven Learning System

NO hardcoded rules!

1. Monitor ALL field edits
2. Auto-detect correction types
3. Record with location context
4. Aggregate into patterns
5. Auto-activate at 10 corrections
6. Apply learned rules pre-scan
7. Flag suspicious even at 99% confidence
8. SLG dashboard for monitoring

Success: Users teach AI, system learns
```

---

**共识**:

✅ 拒绝硬编码
✅ 用户驱动
✅ 全局学习
✅ 地域上下文
✅ 优雅架构

🧠 让用户成为 AI 的老师！
