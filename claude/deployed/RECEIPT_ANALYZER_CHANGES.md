# Receipt Analyzer 修改总结

## ✅ 已完成的修改

### 1. AI 模型版本更新
- **旧版本**: `gemini-2.0-flash-exp`
- **新版本**: `gemini-2.5-flash` ✅
- **位置**: `GEMINI_MODEL` 常量

### 2. 字段名称映射到当前数据库结构

#### 接口字段更新 (`ReceiptAnalysisResult`)

| 旧字段名 | 新字段名 | 数据库字段 | 说明 |
|---------|---------|-----------|------|
| `merchant_name` | `vendor_name` | `transactions.vendor_name` | 商户名称 |
| `receipt_date` | `transaction_date` | `transactions.transaction_date` | 交易日期 |
| `confidence` | `ai_confidence` | `transactions.ai_confidence` | AI 置信度 |
| `category` | `category_user` | `transactions.category_user` | 用户分类 |
| - | `tax_amount` | `transactions.tax_amount` | 税金（新增） |

#### 向后兼容性
- `validateAndNormalizeData()` 函数支持旧字段名的 fallback：
  - `merchant_name` → `vendor_name`
  - `receipt_date` → `transaction_date`
  - `confidence` → `ai_confidence`
  - `category` → `category_user`

### 3. 提示词更新

#### JSON 输出格式
```json
{
  "vendor_name": "...",
  "transaction_date": "YYYY-MM-DD",
  "total_amount": 123.45,
  "currency": "CAD",
  "tax_amount": 16.05,
  "items": [...],
  "category_user": "...",
  "ai_confidence": 0.95,
  "raw_text": "..."
}
```

#### 新增指令
- **Tax Amount 提取**: 明确提取税金金额（如果可见）
- **字段映射说明**: 所有字段名与数据库表结构对应

### 4. 成本估算更新
- 注释更新为 "Gemini 2.5 Flash pricing (as of Jan 2026)"
- 定价保持不变（与 2.0 Flash 相同）

### 5. 使用示例更新
- 添加了保存到 `transactions` 表的示例
- 添加了保存到 `transaction_items` 表的示例
- 所有示例使用新的字段名

## 📋 数据库字段映射表

### 直接映射字段
```typescript
{
  vendor_name: result.vendor_name,           // → transactions.vendor_name
  transaction_date: result.transaction_date, // → transactions.transaction_date
  total_amount: result.total_amount,         // → transactions.total_amount
  currency: result.currency,                 // → transactions.currency
  tax_amount: result.tax_amount,            // → transactions.tax_amount
  category_user: result.category_user,      // → transactions.category_user
  ai_confidence: result.ai_confidence,       // → transactions.ai_confidence
}
```

### JSONB 存储字段
```typescript
{
  raw_data: {
    gemini_response: result,  // 完整分析结果
    raw_text: result.raw_text, // OCR 原始文本
  }
}
```

### 关联表存储
```typescript
// result.items → transaction_items 表
result.items.map(item => ({
  transaction_id: transaction.id,
  organization_id: orgId,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.price,
}))
```

## 🔄 迁移指南

### 如果之前使用了旧版本

1. **更新导入**:
   ```typescript
   // 旧代码
   const result = await analyzeReceipt(buffer, 'image/jpeg');
   console.log(result.merchant_name); // ❌
   
   // 新代码
   const result = await analyzeReceipt(buffer, 'image/jpeg');
   console.log(result.vendor_name); // ✅
   ```

2. **更新数据库插入**:
   ```typescript
   // 旧代码
   await supabase.from('transactions').insert({
     merchant_name: result.merchant_name, // ❌
     receipt_date: result.receipt_date,   // ❌
     confidence: result.confidence,       // ❌
   });
   
   // 新代码
   await supabase.from('transactions').insert({
     vendor_name: result.vendor_name,           // ✅
     transaction_date: result.transaction_date, // ✅
     ai_confidence: result.ai_confidence,       // ✅
   });
   ```

## ✅ 验证清单

- [x] 模型版本更新为 `gemini-2.5-flash`
- [x] 所有字段名映射到 `transactions` 表结构
- [x] 提示词使用新字段名
- [x] 向后兼容性处理（支持旧字段名）
- [x] 使用示例更新
- [x] 成本估算注释更新
- [x] 添加 `tax_amount` 字段支持

## 📝 注意事项

1. **环境变量**: 确保 `GEMINI_API_KEY` 已设置
2. **API 版本**: Gemini 2.5 Flash 需要最新的 `@google/generative-ai` SDK
3. **数据库**: 确保 `transactions` 表结构已就绪
4. **向后兼容**: 代码支持旧字段名，但建议尽快迁移到新字段名

## 🚀 下一步

1. 将 `receipt-analyzer.ts` 移到共享包 `@slo/snap-receipt-analyzer`
2. 创建 API 路由集成收据分析功能
3. 与 R2 上传 API 集成
4. 与 Dual Track 分类系统集成
5. 与 Tags 系统集成
