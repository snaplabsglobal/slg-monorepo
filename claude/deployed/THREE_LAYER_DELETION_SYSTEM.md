# 三层合规删除系统 - "后悔药服务"

**CEO 问题**: 需要删除功能吗？财务合规允许直接删除吗？

**COO 战略**: 必须有删除，但绝对不能"一删就没" - 三层合规删除

**CTO 实施**: 逻辑删除 + 替换功能 + 导出锁定

---

## 🎯 核心原则

### 用户体验 vs 审计合规

```
用户需求:
✅ 拍错了 → 能删除
✅ 拍模糊了 → 能重拍
✅ 拍到隐私 → 能清除
✅ 操作简单 → 不复杂

审计合规:
✅ 审计轨迹 (Audit Trail)
✅ 数据可追溯
✅ 防止篡改
✅ CRA 抽查时能找回

解决方案:
用户侧: "感觉删干净了" ✓
系统侧: "数据还在底层" ✓
```

---

## 📐 三层删除架构

### Layer 1: 逻辑删除 (Soft Delete)

#### 原理
```
物理删除 (Physical Delete) ❌:
DELETE FROM transactions WHERE id = '...'
→ 数据永久丢失
→ 无法找回
→ 审计风险

逻辑删除 (Soft Delete) ✅:
UPDATE transactions SET deleted_at = NOW(), deleted_by = user_id WHERE id = '...'
→ 数据仍在数据库
→ 可以恢复
→ 符合审计要求
```

#### 数据库字段

```sql
-- transactions 表增加字段
ALTER TABLE transactions 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN deletion_reason TEXT;

-- 创建索引（性能优化）
CREATE INDEX idx_transactions_not_deleted 
ON transactions(organization_id) 
WHERE deleted_at IS NULL;
```

#### 查询逻辑

```typescript
// ❌ 错误：返回所有记录（包括已删除）
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('organization_id', orgId);

// ✅ 正确：只返回未删除的记录
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('organization_id', orgId)
  .is('deleted_at', null);

// ✅ 更好：创建视图
CREATE VIEW active_transactions AS
SELECT * FROM transactions WHERE deleted_at IS NULL;

// 使用视图
const { data } = await supabase
  .from('active_transactions')
  .select('*')
  .eq('organization_id', orgId);
```

---

### Layer 2: 替换功能 (Replace)

#### 场景
```
用户: "这张收据拍模糊了"

传统流程 ❌:
1. 找到收据
2. 点击删除
3. 重新上传
4. 重新填写信息
耗时: ~60 秒

优化流程 ✅:
1. 找到收据
2. 点击"重拍"
3. 上传新图片
4. 保留已识别的信息
耗时: ~10 秒

效率提升: 6 倍 ✓
```

#### 实现方案

```typescript
// components/transactions/ReplaceReceiptButton.tsx

export function ReplaceReceiptButton({ 
  transactionId 
}: { 
  transactionId: string 
}) {
  const [isReplacing, setIsReplacing] = useState(false);
  
  const handleReplace = async (newFile: File) => {
    setIsReplacing(true);
    
    try {
      // 1. 上传新图片到 R2
      const newImageUrl = await uploadToR2(newFile);
      
      // 2. 备份旧图片 URL（版本历史）
      const { data: oldTransaction } = await supabase
        .from('transactions')
        .select('attachment_url, raw_data')
        .eq('id', transactionId)
        .single();
      
      // 3. 更新记录（保留旧数据在 history）
      await supabase
        .from('transactions')
        .update({
          attachment_url: newImageUrl,
          image_size_bytes: newFile.size,
          image_mime_type: newFile.type,
          
          // 版本历史
          raw_data: {
            ...oldTransaction.raw_data,
            image_history: [
              ...(oldTransaction.raw_data?.image_history || []),
              {
                url: oldTransaction.attachment_url,
                replaced_at: new Date().toISOString(),
                replaced_by: user.id,
                reason: 'Image quality poor - retaken',
              },
            ],
          },
          
          // 重置 AI 分析状态
          status: 'pending',
          needs_review: true,
          ai_confidence: 0,
        })
        .eq('id', transactionId);
      
      // 4. 触发重新分析
      await triggerAsyncAnalysis(transactionId);
      
      toast.success('照片已替换，正在重新分析');
      
    } catch (error: any) {
      toast.error('替换失败: ' + error.message);
    } finally {
      setIsReplacing(false);
    }
  };
  
  return (
    <button
      onClick={() => document.getElementById('replace-input')?.click()}
      className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
    >
      <Camera className="w-4 h-4" />
      <span>重拍照片</span>
      <input
        id="replace-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReplace(file);
        }}
      />
    </button>
  );
}
```

---

### Layer 3: 导出锁定 (Export Lock)

#### 状态机设计

```typescript
enum TransactionLifecycle {
  DRAFT = 'draft',           // 草稿 - 完全可编辑
  PENDING = 'pending',       // 处理中 - 可编辑
  READY = 'ready',          // 就绪 - 可编辑
  EXPORTED = 'exported',     // 已导出 - 锁定 🔒
  LOCKED = 'locked',        // 锁定 - 不可删除
  VOIDED = 'voided',        // 作废 - 保留记录
}

const LIFECYCLE_PERMISSIONS = {
  draft: {
    canEdit: true,
    canDelete: true,
    canReplace: true,
  },
  pending: {
    canEdit: true,
    canDelete: true,
    canReplace: true,
  },
  ready: {
    canEdit: true,
    canDelete: true,
    canReplace: true,
  },
  exported: {
    canEdit: false,      // 不能直接编辑
    canDelete: false,    // 不能删除
    canReplace: false,   // 不能替换
    canVoid: true,       // 可以作废
  },
  locked: {
    canEdit: false,
    canDelete: false,
    canReplace: false,
    canVoid: true,
  },
  voided: {
    canEdit: false,
    canDelete: false,
    canReplace: false,
    canVoid: false,
  },
};
```

#### 导出时自动锁定

```typescript
// app/api/export/route.ts

export async function POST(request: NextRequest) {
  const { transaction_ids } = await request.json();
  
  // 1. 生成导出文件（CSV/Excel）
  const exportFile = await generateExportFile(transaction_ids);
  
  // 2. 锁定所有导出的记录
  await supabase
    .from('transactions')
    .update({
      status: 'exported',
      exported_at: new Date().toISOString(),
      exported_by: user.id,
    })
    .in('id', transaction_ids);
  
  // 3. 记录导出历史
  await supabase
    .from('export_history')
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      transaction_ids,
      file_url: exportFile.url,
      exported_at: new Date().toISOString(),
    });
  
  return NextResponse.json({
    success: true,
    file_url: exportFile.url,
    locked_count: transaction_ids.length,
  });
}
```

---

## 🎨 UI/UX 实现

### 场景 1: 未导出前 - 自由删除

```typescript
// components/transactions/DeleteButton.tsx

export function DeleteButton({ 
  transaction 
}: { 
  transaction: Transaction 
}) {
  const permissions = LIFECYCLE_PERMISSIONS[transaction.status];
  
  if (!permissions.canDelete) {
    return (
      <button
        disabled
        className="px-4 py-2 text-gray-400 cursor-not-allowed"
        title="已导出的记录不能直接删除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }
  
  const handleDelete = async () => {
    // 确认弹窗
    const confirmed = await confirm({
      title: '确认删除？',
      description: '此收据将移入回收站，30 天后自动清除',
      confirmText: '删除',
      cancelText: '取消',
    });
    
    if (!confirmed) return;
    
    // 逻辑删除
    await supabase
      .from('transactions')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: 'User deleted',
      })
      .eq('id', transaction.id);
    
    toast.success('已删除，可在回收站中恢复');
    
    // 刷新列表
    mutate();
  };
  
  return (
    <button
      onClick={handleDelete}
      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
```

---

### 场景 2: 照片模糊 - 替换功能

```typescript
// Detail 卡片中的按钮组

<div className="flex gap-3">
  {/* 编辑 */}
  <button className="...">
    <Edit className="w-4 h-4" />
    编辑
  </button>
  
  {/* 重拍（替换）⭐ */}
  <ReplaceReceiptButton transactionId={transaction.id} />
  
  {/* 删除 */}
  <DeleteButton transaction={transaction} />
</div>
```

---

### 场景 3: 已导出后 - 作废流程

```typescript
// components/transactions/VoidButton.tsx

export function VoidButton({ 
  transaction 
}: { 
  transaction: Transaction 
}) {
  if (transaction.status !== 'exported') return null;
  
  const handleVoid = async () => {
    const { reason } = await prompt({
      title: '作废原因',
      description: '请说明为什么要作废这条记录',
      placeholder: '例如：拍错了，不是公司支出',
      required: true,
    });
    
    // 作废操作
    await supabase
      .from('transactions')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq('id', transaction.id);
    
    // 记录审计日志
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'transactions',
        operation: 'void',
        record_id: transaction.id,
        user_id: user.id,
        reason,
        timestamp: new Date().toISOString(),
      });
    
    toast.success('已作废，会计师可以看到此操作');
  };
  
  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="bg-yellow-50 rounded-lg p-4 mb-3">
        <div className="flex items-start gap-2">
          <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 mb-1">
              此记录已导出，不能直接删除
            </p>
            <p className="text-xs text-yellow-800">
              如需更正，请使用"作废"功能，会计师会看到完整的操作记录
            </p>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleVoid}
        className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
      >
        作废此记录
      </button>
    </div>
  );
}
```

---

## 🗑️ 回收站功能

### 设计原理

```
类似操作系统回收站:
- 删除 → 进入回收站
- 30 天内可恢复
- 30 天后物理删除
- 提供"后悔药"
```

### 实现方案

```typescript
// app/(dashboard)/trash/page.tsx

export default function TrashPage() {
  const { data: deletedTransactions } = useDeletedTransactions();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">回收站</h1>
        <button
          onClick={handleEmptyTrash}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          清空回收站
        </button>
      </div>
      
      {/* 提示 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-800">
          💡 回收站中的记录将在 30 天后自动清除。
          在此之前，您可以随时恢复它们。
        </p>
      </div>
      
      {/* 列表 */}
      <div className="space-y-3">
        {deletedTransactions.map(transaction => (
          <TrashItem
            key={transaction.id}
            transaction={transaction}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        ))}
      </div>
    </div>
  );
}

// 恢复功能
async function handleRestore(transactionId: string) {
  await supabase
    .from('transactions')
    .update({
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
    })
    .eq('id', transactionId);
  
  toast.success('已恢复');
}

// 永久删除（物理删除）
async function handlePermanentDelete(transactionId: string) {
  const confirmed = await confirm({
    title: '永久删除？',
    description: '此操作不可恢复，确定要永久删除吗？',
    confirmText: '永久删除',
    cancelText: '取消',
    danger: true,
  });
  
  if (!confirmed) return;
  
  // 删除 R2 图片
  const { data: transaction } = await supabase
    .from('transactions')
    .select('attachment_url')
    .eq('id', transactionId)
    .single();
  
  if (transaction.attachment_url) {
    await deleteFromR2(extractKeyFromUrl(transaction.attachment_url));
  }
  
  // 物理删除记录
  await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  
  toast.success('已永久删除');
}
```

---

### 自动清理（定时任务）

```typescript
// 每天运行的定时任务
// app/api/cron/cleanup-trash/route.ts

export async function GET(request: NextRequest) {
  // 验证 Cron Secret
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 查找 30 天前删除的记录
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: oldDeletedTransactions } = await supabase
    .from('transactions')
    .select('id, attachment_url')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', thirtyDaysAgo.toISOString());
  
  if (!oldDeletedTransactions || oldDeletedTransactions.length === 0) {
    return NextResponse.json({ message: 'No records to clean' });
  }
  
  // 删除 R2 图片
  for (const transaction of oldDeletedTransactions) {
    if (transaction.attachment_url) {
      await deleteFromR2(extractKeyFromUrl(transaction.attachment_url));
    }
  }
  
  // 物理删除记录
  await supabase
    .from('transactions')
    .delete()
    .in('id', oldDeletedTransactions.map(t => t.id));
  
  return NextResponse.json({
    success: true,
    deleted_count: oldDeletedTransactions.length,
  });
}
```

---

## 📊 审计日志

### 完整记录所有操作

```typescript
// 审计日志表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'delete', 'restore', 'void', 'replace'
  record_id UUID NOT NULL,
  
  old_data JSONB,
  new_data JSONB,
  
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
```

### 记录操作

```typescript
// 每次删除/恢复/作废都记录
async function logAuditTrail(params: {
  operation: 'delete' | 'restore' | 'void' | 'replace';
  transactionId: string;
  reason?: string;
  oldData?: any;
  newData?: any;
}) {
  await supabase
    .from('audit_logs')
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      table_name: 'transactions',
      operation: params.operation,
      record_id: params.transactionId,
      old_data: params.oldData,
      new_data: params.newData,
      reason: params.reason,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    });
}
```

---

## 🎯 COO 的"后悔药服务"包装

### 营销话术

```
传统软件:
"删除就没了，小心操作" ❌
→ 用户畏惧，不敢用

LedgerSnap:
"在 LedgerSnap，所有的错误都是可逆的，
直到你发给会计的那一刻。" ✅
→ 降低心理门槛

功能亮点:
✅ 拍错了？删除，30 天内可恢复
✅ 拍模糊了？重拍，一键替换
✅ 已导出了？作废，保留审计轨迹
✅ 后悔了？回收站，随时找回
```

### Dashboard 提示

```typescript
// 首次使用时显示
<WelcomeModal>
  <h2>欢迎使用 LedgerSnap 🎉</h2>
  <p>
    在 LedgerSnap，所有的操作都是可逆的：
  </p>
  <ul>
    <li>✅ 拍错了？可以删除</li>
    <li>✅ 拍模糊了？可以重拍</li>
    <li>✅ 删错了？可以恢复</li>
    <li>✅ 已导出？可以作废</li>
  </ul>
  <p className="font-semibold">
    不用担心犯错，尽管放心使用！
  </p>
</WelcomeModal>
```

---

## 📋 实施清单

### Day 1: 逻辑删除

```
□ 添加 deleted_at 字段
□ 添加 deleted_by 字段
□ 添加 deletion_reason 字段
□ 创建 active_transactions 视图
□ 更新所有查询逻辑
```

### Day 2: 替换功能

```
□ ReplaceReceiptButton 组件
□ 版本历史记录
□ 重新触发 AI 分析
□ 测试替换流程
```

### Day 3: 导出锁定

```
□ 状态机设计
□ 导出时自动锁定
□ VoidButton 组件
□ 作废流程实现
```

### Day 4: 回收站

```
□ 回收站页面
□ 恢复功能
□ 永久删除功能
□ 30 天自动清理
□ 审计日志
```

---

## ✅ 成功标准

### 功能完整性
```
□ 可以逻辑删除
□ 可以恢复
□ 可以替换照片
□ 可以作废记录
□ 审计日志完整
```

### 合规性
```
□ 符合 CRA 审计要求
□ 数据可追溯
□ 操作有记录
□ 30 天后自动清理
```

### 用户体验
```
□ "感觉删干净了"
□ 操作流畅
□ 降低心理门槛
□ "后悔药"随时可用
```

---

**CTO 总结**: 

✅ **三层删除**: 逻辑删除 + 替换功能 + 导出锁定

✅ **用户体验**: "感觉删干净了" - 无心理负担

✅ **审计合规**: 数据仍在底层 - CRA 抽查无忧

✅ **后悔药服务**: 降低用户心理门槛 - 温哥华 Contractor 最爱

🚀 **立即执行**: 4 天完成，P0 级优先！
