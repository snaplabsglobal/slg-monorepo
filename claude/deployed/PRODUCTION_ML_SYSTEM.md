# 生产级机器学习系统 - COO 指导方案

**核心问题**: Cursor 使用 localStorage ❌
**正确方案**: 持久化到数据库 ✅

---

## 🚨 关键问题

### localStorage 的三大致命缺陷

```
1. 换设备就失忆 ❌
2. 清理缓存就丢失 ❌
3. 无法全局学习 ❌

结果:
每个用户都要教 AI 三次！
这不是真正的 ML！
```

---

## ✅ 正确方案

### 数据库持久化

```sql
CREATE TABLE vendor_patterns (
  vendor_name VARCHAR(255) UNIQUE,
  date_format VARCHAR(20),
  correction_count INT,
  is_default_rule BOOLEAN
);

优势:
✅ 永久保存
✅ 全局学习
✅ 一人纠错，全员受益
```

---

## 🎯 三层学习系统

```
个人层 → 全局层 → 应用层

用户 A 纠错
→ 记录到数据库
→ 累计 10 次
→ 升级为默认规则
→ 用户 B 自动受益

这才是真正的 ML！
```

---

## 📊 温哥华护城河

### 预置规则库

```sql
INSERT INTO vendor_preset_rules VALUES
('THE HOME DEPOT', 'DD/MM/YY', '20'),
('RONA', 'DD/MM/YY', '20'),
('CANADIAN TIRE', 'DD/MM/YY', '20'),
('CLOVERDALE PAINT', 'MM/DD/YY', '20'),
('COSTCO', 'MM/DD/YY', '20');

本地优势 > 通用 AI
```

---

## 🛠️ 给 Cursor 的指令

```markdown
CRITICAL: 立即停止使用 localStorage

Phase 1: 数据库迁移
- 创建 vendor_patterns 表
- 创建 vendor_preset_rules 表
- 预置温哥华商家规则

Phase 2: 全局学习
- POST /api/corrections
- 累计纠正次数
- 10 次自动升级为默认规则

Phase 3: SLG 后台
- AI 质量控制仪
- 纠错排行榜
- 可疑识别审核

Success: 一人纠错，全员受益
```

---

**COO 核心要求**:

✅ 停止 localStorage
✅ 数据库持久化
✅ 全局学习
✅ 温哥华护城河
✅ SLG 质量监控

🚀 立即实施！
