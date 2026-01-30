# 会计师 Dashboard - 完整使用指南

**版本**: 1.0  
**日期**: 2026-01-27  
**目标用户**: BC 省建筑行业会计师

---

## 📋 目录

1. [Dashboard 概述](#dashboard-概述)
2. [核心功能](#核心功能)
3. [UI 组件说明](#ui-组件说明)
4. [API 端点](#api-端点)
5. [部署步骤](#部署步骤)
6. [使用流程](#使用流程)
7. [最佳实践](#最佳实践)

---

## Dashboard 概述

### 设计理念

**专业、高效、数据密集**

- **目标用户**: BC 省建筑行业的专业会计师
- **核心任务**: GST/PST 审核、ITC 抵扣管理
- **设计风格**: 精致、可信、数据可视化

### 关键特性

✅ **实时统计面板** - 一目了然的月度概览  
✅ **智能筛选** - 快速定位需要审核的交易  
✅ **详细信息模态框** - 完整的交易信息展示  
✅ **批量操作** - 高效处理多笔交易  
✅ **CSV 导出** - 直接用于报税  
✅ **置信度可视化** - AI 分析质量评估

---

## 核心功能

### 1. 统计概览（Stats Cards）

```typescript
✅ 总交易数量 (Total Transactions)
   - 本月所有费用交易
   - 显示待审核数量
   
✅ GST 可抵扣总额 (GST Recoverable)
   - 用于 ITC 申报
   - 自动从 tax_details 计算
   
✅ 平均置信度 (Avg Confidence)
   - AI 识别质量指标
   - 已审批交易数量
   
✅ 月度总额 (Monthly Total)
   - 总支出金额
   - GST/PST 分项显示
```

### 2. 智能筛选（Filter Tabs）

```typescript
🟡 Needs Review (待审核)
   - needs_review = true
   - 或 confidence < 0.9
   - 需要会计师人工确认

📄 All Transactions (所有交易)
   - 本月全部支出

🟢 Approved (已批准)
   - status = 'approved'
   - 可直接用于报税

🔴 Rejected (已拒绝)
   - status = 'rejected'
   - 需要重新上传或修正
```

### 3. 交易详情（Transaction Row）

每行显示：
- ✅ 收据缩略图
- ✅ 商户名称 + 置信度徽章
- ✅ GIFI 代码（如 8320 - Materials）
- ✅ 特殊标记（50% 抵扣、个人支出）
- ✅ 日期和分类
- ✅ 总金额
- ✅ 税务拆分（Subtotal / GST / PST）
- ✅ 置信度进度条（4 个维度）
- ✅ 操作按钮（批准/拒绝/详情/编辑）

### 4. 详情模态框（Modal）

**左侧**：
- 收据高清图片
- 点击放大查看
- 下载原图按钮
- AI 置信度详情（5 个维度）

**右侧**：
- 基本信息（商户、日期、分类）
- 财务拆分（4 个金额卡片）
- 会计分类（GIFI 代码、特殊标记）
- 原始 OCR 文本

**操作**：
- 内联编辑
- 批准/拒绝
- 保存修改

### 5. 批量操作（Batch Operations）

选中多笔交易后：
- ✅ 批量批准
- ✅ 批量拒绝
- ✅ 批量导出
- ✅ 清除选择

---

## UI 组件说明

### 文件结构

```
components/
├── accountant/
│   ├── AccountantDashboard.tsx        # 主面板
│   ├── TransactionDetailsModal.tsx    # 详情模态框
│   ├── BatchOperationsBar.tsx         # 批量操作栏
│   ├── StatCard.tsx                   # 统计卡片
│   ├── FilterTab.tsx                  # 筛选标签
│   └── TransactionRow.tsx             # 交易行
```

### 主要组件

#### 1. AccountantDashboard

```tsx
import { AccountantDashboard } from '@/components/accountant/AccountantDashboard';

export default function AccountantPage() {
  return <AccountantDashboard />;
}
```

**Props**: 无（自包含组件）

**Features**:
- 自动获取数据
- 月份选择器
- 筛选切换
- 导出功能

#### 2. TransactionDetailsModal

```tsx
<TransactionDetailsModal
  transaction={selectedTransaction}
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onSave={(updates) => handleSave(updates)}
  onApprove={() => handleApprove(selectedTransaction.id)}
  onReject={() => handleReject(selectedTransaction.id)}
/>
```

#### 3. BatchOperationsBar

```tsx
<BatchOperationsBar
  selectedCount={selectedTransactions.length}
  onApproveAll={() => handleBatchApprove()}
  onRejectAll={() => handleBatchReject()}
  onExport={() => handleBatchExport()}
  onClear={() => setSelectedTransactions([])}
/>
```

---

## API 端点

### 1. GET /api/accountant/stats

**查询参数**:
```
?month=2026-01
```

**响应**:
```json
{
  "totalTransactions": 45,
  "needsReview": 12,
  "approved": 30,
  "totalGST": 45000,      // cents
  "totalPST": 63000,      // cents
  "monthlyTotal": 950.00, // dollars
  "avgConfidence": 0.87
}
```

### 2. GET /api/accountant/transactions

**查询参数**:
```
?month=2026-01
&filter=review
&page=1
&limit=50
```

**响应**:
```json
{
  "transactions": [ /* Transaction[] */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

### 3. POST /api/accountant/transactions/[id]/approve

**请求体**: 无

**响应**:
```json
{
  "success": true,
  "transaction": { /* Updated transaction */ },
  "message": "Transaction approved successfully"
}
```

### 4. POST /api/accountant/transactions/[id]/reject

**请求体**:
```json
{
  "reason": "Invalid vendor name"
}
```

### 5. POST /api/accountant/transactions/batch-approve

**请求体**:
```json
{
  "transaction_ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

### 6. GET /api/accountant/export

**查询参数**:
```
?month=2026-01
```

**响应**: CSV 文件下载

```csv
Date,Vendor,Category,GIFI Code,Subtotal,GST (5%),PST (7%),Total,Currency,Status,Confidence,Meals 50%,Shareholder Loan
2026-01-15,"Home Depot #7133","Office Supplies",8320,45.00,2.25,3.15,50.40,CAD,approved,0.95,No,No
```

---

## 部署步骤

### Step 1: 安装依赖

```bash
# 已包含在项目中
npm install lucide-react
```

### Step 2: 复制组件文件

```bash
# 创建目录
mkdir -p components/accountant

# 复制组件
cp accountant-dashboard-part1.tsx components/accountant/AccountantDashboard.tsx
cp accountant-dashboard-part2.tsx components/accountant/index.tsx
```

### Step 3: 创建 API Routes

```bash
# Stats API
mkdir -p app/api/accountant/stats
touch app/api/accountant/stats/route.ts

# Transactions API
mkdir -p app/api/accountant/transactions
touch app/api/accountant/transactions/route.ts

# Approve API
mkdir -p app/api/accountant/transactions/[id]/approve
touch app/api/accountant/transactions/[id]/approve/route.ts

# Reject API
mkdir -p app/api/accountant/transactions/[id]/reject
touch app/api/accountant/transactions/[id]/reject/route.ts

# Batch Approve API
mkdir -p app/api/accountant/transactions/batch-approve
touch app/api/accountant/transactions/batch-approve/route.ts

# Export API
mkdir -p app/api/accountant/export
touch app/api/accountant/export/route.ts
```

### Step 4: 创建页面

```bash
# 会计师页面
mkdir -p app/(dashboard)/accountant
touch app/(dashboard)/accountant/page.tsx
```

```tsx
// app/(dashboard)/accountant/page.tsx
import { AccountantDashboard } from '@/components/accountant/AccountantDashboard';

export default function AccountantPage() {
  return <AccountantDashboard />;
}
```

### Step 5: 添加路由保护

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  // Check if user is accountant/admin
  const role = request.headers.get('x-user-role');
  
  if (request.nextUrl.pathname.startsWith('/accountant')) {
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
}
```

---

## 使用流程

### 典型工作流程

#### 1. 月初审核（每月 1-5 日）

```
1. 登录会计师 Dashboard
2. 选择上个月（如 2025-12）
3. 点击 "Needs Review" 标签
4. 逐笔审核待审核交易：
   a. 查看收据图片
   b. 验证商户名称
   c. 确认日期
   d. 核对金额（Subtotal / GST / PST）
   e. 检查 GIFI 代码
   f. 批准或拒绝
```

#### 2. 批量操作（高置信度交易）

```
1. 筛选 confidence >= 0.95 的交易
2. 快速浏览确认无误
3. 使用多选功能
4. 点击 "Approve All"
```

#### 3. 导出报税数据（月底）

```
1. 选择要报税的月份
2. 确保所有交易已审核
3. 点击 "Export CSV"
4. 导入到会计软件（QuickBooks / Xero）
```

#### 4. 处理特殊情况

**50% 可抵扣餐饮**:
```
- 自动标记为 "Meals 50% Deductible"
- 导出 CSV 时已标注
- 报税时只申报 50% GST
```

**潜在个人支出**:
```
- 标记为 "Shareholder Loan?"
- 审核时决定：
  a. 拒绝（要求重新分类）
  b. 批准但记录股东贷款
```

**低置信度交易**:
```
- confidence < 0.7
- 必须人工审核
- 查看原始 OCR 文本
- 必要时手动编辑
```

---

## 最佳实践

### 1. 审核优先级

```
🔴 High Priority (立即处理)
   - confidence < 0.7
   - is_shareholder_loan_potential = true
   - 金额 > $500
   - 税额异常（GST/PST 比例不对）

🟡 Medium Priority (1-2 天内)
   - confidence 0.7-0.9
   - is_meals_50_deductible = true

🟢 Low Priority (批量处理)
   - confidence >= 0.9
   - 常规供应商（Home Depot, Shell）
```

### 2. 质量控制

```
每月抽查：
- 随机抽取 10% 已批准交易
- 验证 GIFI 代码准确性
- 检查税额计算
- 更新 ML 训练数据
```

### 3. 效率优化

```
使用快捷键（未来功能）：
- A: Approve
- R: Reject
- E: Edit
- Space: Open details
- Esc: Close modal
```

### 4. 数据完整性

```
每月结束前：
✅ 所有交易已审核（needs_review = 0）
✅ GIFI 代码完整
✅ 税额正确拆分
✅ 特殊标记正确
✅ CSV 导出测试
```

---

## 故障排查

### 问题 1: 统计数据不准确

**解决方案**:
```sql
-- 验证数据库
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN needs_review THEN 1 ELSE 0 END) as needs_review,
  SUM((tax_details->>'gst_cents')::int) as total_gst
FROM transactions
WHERE organization_id = 'xxx'
  AND transaction_date >= '2026-01-01'
  AND deleted_at IS NULL;
```

### 问题 2: 图片无法加载

**解决方案**:
```
1. 检查 Cloudflare R2 配置
2. 验证 attachment_url 完整性
3. 检查 CORS 设置
```

### 问题 3: 批量操作失败

**解决方案**:
```
1. 检查 transaction_ids 数组
2. 验证用户权限
3. 检查数据库连接
4. 查看 API 日志
```

---

## 性能优化

### 数据库索引

```sql
-- 确保以下索引存在
CREATE INDEX idx_transactions_org_date 
ON transactions(organization_id, transaction_date);

CREATE INDEX idx_transactions_needs_review 
ON transactions(needs_review) 
WHERE needs_review = true;

CREATE INDEX idx_transactions_status 
ON transactions(status);
```

### 前端优化

```tsx
// 使用虚拟滚动（大量交易时）
import { VirtualList } from 'react-virtual';

// 懒加载图片
<img loading="lazy" src={transaction.attachment_url} />

// 分页加载
const limit = 50; // 每页 50 笔
```

---

## 未来增强功能

### Phase 2 (1-2 个月后)
- ✅ 快捷键支持
- ✅ 高级筛选（金额范围、供应商）
- ✅ 批量编辑
- ✅ 审核历史记录

### Phase 3 (3-6 个月后)
- ✅ QuickBooks 直接集成
- ✅ 自定义报表
- ✅ 移动端审核 App
- ✅ 自动化规则引擎

---

## 联系支持

**技术问题**: CTO Patrick Jiang  
**功能建议**: 提交 GitHub Issue  
**紧急支持**: support@ledgersnap.app

---

**祝审核愉快！🎉**
