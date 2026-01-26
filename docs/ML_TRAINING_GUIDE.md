# 机器学习训练系统使用指南

## 概述

本系统使用 **Gemini 2.5 Flash** 模型进行收据识别和商户标准化，并通过用户修正记录持续改进模型性能。

## 系统架构

### 1. 数据库表结构

#### `ml_training_data` - 机器学习训练数据表
存储用户对 AI 识别结果的修正，用于训练模型。

**主要字段：**
- `original_extraction`: AI 原始识别结果 (JSONB)
- `corrected_data`: 用户修正后的数据 (JSONB)
- `correction_fields`: 被修正的字段列表 (TEXT[])
- `is_training_ready`: 是否可用于训练
- `training_status`: 训练状态 (pending/processed/failed)

#### `vendor_standardization_log` - 商户标准化日志
记录商户名称标准化的尝试和用户反馈。

**主要字段：**
- `raw_vendor_name`: 原始商户名称
- `standardized_name`: 标准化后的名称
- `standardization_method`: 标准化方法 (exact_match/fuzzy_match/ml_suggestion/manual)
- `user_action`: 用户操作 (accepted/rejected/modified/pending)

#### `ml_model_metrics` - 模型性能指标
跟踪模型性能随时间的变化。

### 2. Edge Functions

#### `vendor-standardizer` - 商户标准化函数
- 首先尝试数据库精确/模糊匹配
- 如果无匹配，使用 Gemini 2.5 Flash 生成标准化建议
- 记录标准化日志供后续学习

#### `receipt-processor` - 收据处理函数（已更新）
- 集成了商户标准化功能
- 自动调用 `vendor-standardizer` 进行商户名称标准化

### 3. 前端组件

#### `ReceiptCorrectionModal` - 收据修正模态框
允许用户修正 AI 识别结果，并自动记录到训练数据表。

**使用示例：**
```tsx
import { ReceiptCorrectionModal } from '@/components/transactions/ReceiptCorrectionModal';

function TransactionDetail({ transaction }) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsCorrectionOpen(true)}>
        修正识别结果
      </button>
      
      <ReceiptCorrectionModal
        transactionId={transaction.id}
        originalData={transaction.raw_data} // AI 原始识别结果
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        onSave={async (correctedData) => {
          // 处理保存后的逻辑
          console.log('修正已保存:', correctedData);
        }}
      />
    </>
  );
}
```

#### `VendorStandardizer` - 商户标准化组件
提供商户名称标准化功能，支持自动和手动标准化。

**使用示例：**
```tsx
import { VendorStandardizer } from '@/components/transactions/VendorStandardizer';

function TransactionForm({ transaction, organizationId }) {
  return (
    <VendorStandardizer
      rawVendorName={transaction.vendor_name}
      organizationId={organizationId}
      transactionId={transaction.id}
      onStandardized={(standardizedName) => {
        // 更新交易记录的商户名称
        updateTransaction({ vendor_name: standardizedName });
      }}
    />
  );
}
```

## 工作流程

### 收据处理流程

1. **用户上传收据** → `receipt-processor` Edge Function
2. **Gemini 2.5 Flash 识别** → 提取收据数据
3. **商户标准化** → 自动调用 `vendor-standardizer`
   - 先查数据库（精确/模糊匹配）
   - 无匹配则使用 ML 生成建议
   - 高置信度自动接受，低置信度等待用户确认
4. **保存交易记录** → 写入 `transactions` 表
5. **用户修正** → 通过 `ReceiptCorrectionModal` 修正错误
6. **记录训练数据** → 自动保存到 `ml_training_data` 表

### 商户标准化流程

1. **触发标准化** → 用户点击"标准化"按钮或自动触发
2. **数据库查找** → 查询 `vendor_aliases` 表
3. **ML 建议** → 如果无匹配，调用 Gemini 2.5 Flash
4. **用户确认** → 接受/拒绝/修改建议
5. **保存映射** → 更新 `vendor_aliases` 表
6. **记录日志** → 保存到 `vendor_standardization_log` 表

## API 使用

### 记录修正数据

```typescript
const { data, error } = await supabase.rpc('record_ml_correction', {
  p_transaction_id: 'transaction-uuid',
  p_original_extraction: originalData,
  p_corrected_data: correctedData,
  p_correction_fields: ['vendor_name', 'total_amount'],
  p_correction_reason: '商户名称识别错误'
});
```

### 获取商户标准化建议

```typescript
const { data, error } = await supabase.rpc(
  'get_vendor_standardization_suggestion',
  {
    p_organization_id: 'org-uuid',
    p_raw_vendor_name: 'HOME DEPOT #1234'
  }
);
```

### 调用商户标准化 Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('vendor-standardizer', {
  body: {
    raw_vendor_name: 'HOME DEPOT #1234',
    organization_id: 'org-uuid',
    transaction_id: 'transaction-uuid' // 可选
  }
});
```

## 性能监控

### 查看模型性能指标

```sql
SELECT 
  metric_date,
  total_extractions,
  corrections_count,
  accuracy_rate,
  field_accuracy,
  avg_confidence_score
FROM ml_model_metrics
WHERE organization_id = 'your-org-id'
ORDER BY metric_date DESC;
```

### 查看训练数据统计

```sql
SELECT 
  COUNT(*) as total_corrections,
  COUNT(*) FILTER (WHERE is_training_ready = true) as ready_for_training,
  COUNT(*) FILTER (WHERE training_status = 'processed') as processed,
  array_agg(DISTINCT correction_fields) as corrected_fields
FROM ml_training_data
WHERE organization_id = 'your-org-id';
```

## 最佳实践

1. **及时修正错误**：用户修正的数据会立即标记为 `is_training_ready = true`
2. **定期训练**：定期处理 `ml_training_data` 表中的数据用于模型训练
3. **监控性能**：定期查看 `ml_model_metrics` 表了解模型表现
4. **商户标准化**：鼓励用户接受/修改标准化建议，建立商户别名库
5. **数据质量**：确保修正数据的准确性，这是模型改进的基础

## 注意事项

1. **Gemini API Key**：确保在 Supabase 环境变量中设置了 `GEMINI_API_KEY`
2. **RLS 策略**：所有表都启用了行级安全，确保数据隔离
3. **性能优化**：商户标准化会先查数据库，减少 API 调用
4. **错误处理**：所有函数都包含错误处理，失败时使用原始数据

## 后续开发

1. **批量训练**：定期从 `ml_training_data` 提取数据训练模型
2. **模型版本管理**：跟踪不同模型版本的性能
3. **自动标准化**：基于历史数据自动标准化常见商户
4. **性能仪表板**：创建可视化仪表板展示模型性能
