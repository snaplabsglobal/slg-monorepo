# CTO 文档总结

**最后更新**: 2026-01-27  
**文档位置**: `claude/` 文件夹（忽略 `deployed/` 子文件夹）

---

## 📚 文档清单

### 核心设计文档

1. **DATABASE_ADAPTER_STRATEGY.md** ⭐⭐⭐
   - **用途**: 数据库适配方案
   - **核心内容**: 
     - 方案 A（推荐）：使用 JSONB 存储，最小改动
     - 方案 B（可选）：扩展表结构，完整升级
     - 字段映射策略（cents → dollars）
     - `raw_data` 和 `tax_details` JSONB 结构
   - **关键点**: 使用适配器函数 `geminiResultToTransaction()`

2. **GEMINI_OPTIMIZATION_SUMMARY.md** ⭐⭐⭐
   - **用途**: Gemini 2.5 Flash 优化总结
   - **核心内容**:
     - 五大核心优化维度（分位制、BC 税务拆分、GIFI 代码、JSON 输出、置信度评分）
     - 会计级严谨度要求
     - 成本估算
     - 预期效果（准确度、效率、成本节约）
   - **关键点**: BC 省 GST/PST 拆分逻辑，GIFI 代码映射

3. **ACCOUNTANT_DASHBOARD_GUIDE.md** ⭐⭐
   - **用途**: 会计师 Dashboard 完整使用指南
   - **核心内容**:
     - Dashboard 概述和设计理念
     - 核心功能（统计面板、筛选、详情模态框、批量操作）
     - API 端点说明
     - 使用流程和最佳实践
   - **关键点**: 审核工作流程，CSV 导出格式

### 实现代码

4. **receipt-analyzer.ts** ⭐⭐⭐
   - **用途**: 收据分析器实现（Gemini 2.5 Flash）
   - **核心内容**:
     - 接口定义（使用 cents、细化置信度）
     - 提示词工程（BC 建筑行业优化）
     - 错误处理和重试机制
     - 批量处理支持
   - **关键点**: 
     - 模型版本：`gemini-2.5-flash` ✅
     - 字段名：`transaction_date`（匹配数据库）✅
     - 金额：全部使用 cents（整数）

5. **receipt-to-transaction-adapter.ts** ⭐⭐⭐
   - **用途**: Gemini 结果 → Transaction 转换适配器
   - **核心内容**:
     - `geminiResultToTransaction()` - 主转换函数
     - `geminiItemsToTransactionItems()` - Line Items 转换
     - `validateTransactionData()` - 数据验证
     - `getConfidenceBadge()` - UI 徽章生成
   - **关键点**: cents → dollars 转换，JSONB 结构构建

6. **upload-api-adapted.ts** ⭐⭐
   - **用途**: 上传 API 实现示例
   - **核心内容**:
     - 文件上传到 R2
     - Gemini 分析调用
     - 数据转换和保存
     - ML 训练数据记录
   - **关键点**: 完整的上传流程实现

7. **accountant-dashboard-api.ts** ⭐⭐
   - **用途**: 会计师 Dashboard API 实现
   - **核心内容**:
     - Stats API（统计信息）
     - Transactions API（交易列表）
     - Approve/Reject API（审核操作）
     - Batch Approve API（批量操作）
     - Export API（CSV 导出）
   - **关键点**: 基于 `needs_review` 和 `status` 的筛选

8. **accountant-dashboard-part1.tsx** ⭐
   - **用途**: Dashboard UI 组件 Part 1
   - **核心内容**: 主面板、统计卡片、筛选标签、交易列表

9. **accountant-dashboard-part2.tsx** ⭐
   - **用途**: Dashboard UI 组件 Part 2
   - **核心内容**: 详情模态框、批量操作栏

### 参考文档

10. **ledgersnap_migration.sql**
    - **用途**: MVP 规格的 receipts 表设计（参考用）
    - **注意**: 这是独立表设计，当前数据库使用 `transactions` 表

---

## 🎯 核心设计理念

### 1. 分位制计算（Cents-Only）
- **目的**: 避免浮点数舍入误差
- **实现**: 所有金额以整数（分）存储和计算
- **存储**: `raw_data->'amounts_cents'` (JSONB)

### 2. BC 省税务拆分
- **目的**: 支持 ITC（进项税额抵扣）
- **实现**: GST 和 PST 分开存储
- **存储**: `tax_details` JSONB + `tax_amount` (GST only)

### 3. GIFI 税务代码
- **目的**: 符合加拿大税表标准
- **实现**: 4 位数字代码
- **存储**: `raw_data->'accounting'->>'gifi_code'`

### 4. 细化置信度评分
- **目的**: 精确评估 AI 识别质量
- **实现**: 5 个维度的置信度（vendor_name, date, amounts, tax_split, overall）
- **存储**: `raw_data->'confidence'` (JSONB) + `ai_confidence` (overall)

### 5. 待审核标记
- **目的**: 自动标记低置信度收据
- **实现**: `needs_review` 字段
- **触发**: `confidence.overall < 0.9` 或税额拆分不确定

---

## ✅ 适配状态

### 完全适配 ✅
- ✅ 字段名映射（vendor_name, transaction_date, ai_confidence）
- ✅ JSONB 存储结构（raw_data, tax_details）
- ✅ ML 训练系统（ml_training_data 表）
- ✅ 会计师 Dashboard 功能（基于现有 transactions 表）

### 需要实施 ⚠️
- ⚠️ 适配器函数集成（receipt-to-transaction-adapter.ts）
- ⚠️ 会计师 Dashboard UI（accountant-dashboard-part1.tsx, part2.tsx）
- ⚠️ 会计师 Dashboard API（accountant-dashboard-api.ts）
- ⚠️ GIFI 代码表（可选）

---

## 📝 实施优先级

### Phase 1: 核心功能（高优先级）
1. ✅ 更新 receipt-analyzer.ts（模型版本、字段名）
2. ⏳ 集成适配器函数（receipt-to-transaction-adapter.ts）
3. ⏳ 实现上传 API（upload-api-adapted.ts）

### Phase 2: 会计师功能（中优先级）
4. ⏳ 实现会计师 Dashboard API（accountant-dashboard-api.ts）
5. ⏳ 实现会计师 Dashboard UI（accountant-dashboard-part1.tsx, part2.tsx）

### Phase 3: 优化（低优先级）
6. ⏳ 创建 GIFI 代码参考表（可选）
7. ⏳ 性能优化和索引优化

---

## 🔗 相关文档

- `docs/DATABASE_SCHEMA_COMPLETE.md` - 完整数据库 Schema
- `docs/TRANSACTIONS_TABLE_SCHEMA.md` - Transactions 表详细说明
- `docs/RECEIPT_ANALYZER_ANALYSIS.md` - Receipt Analyzer 分析报告
