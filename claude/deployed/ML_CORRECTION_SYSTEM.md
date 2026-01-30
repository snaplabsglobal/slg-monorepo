# LedgerSnap 机器学习能力完整方案

**问题**: Home Depot 日期识别错误（15/08/25 → 2015-08-25，应为 2025-08-15）

**机会**: 建立智能学习系统，从错误中成长

---

## ✅ COO 确认：数据库完全支持 ML

### Supabase (PostgreSQL) 的 ML 能力

```sql
1. pgvector 扩展（向量化）
CREATE EXTENSION vector;

2. 存储原始值 vs 修正值
3. 商家模式学习
4. 闭环反馈系统

结论: 完全支持 ML！✅
```

---

## 🎯 完整 ML 架构

### 闭环学习系统

```
Step 1: AI 识别
15/08/25 → 2015-08-25 ❌

Step 2: 用户修正
2015-08-25 → 2025-08-15 ✅

Step 3: 系统学习
记录: Home Depot 使用 DD/MM/YY
更新: vendor_patterns 表

Step 4: 下次识别
检测到 Home Depot
应用规则: DD/MM/YY, 20XX
结果: 15/08/25 → 2025-08-15 ✅
```

---

## 🗄️ 数据库设计

```sql
-- 1. 修正记录表
CREATE TABLE transaction_corrections (
  id UUID PRIMARY KEY,
  transaction_id UUID,
  field_name VARCHAR(50), -- 'date', 'vendor', 'amount'
  original_value TEXT,
  corrected_value TEXT,
  confidence_score FLOAT,
  vendor_name VARCHAR(255),
  correction_type VARCHAR(50),
  created_at TIMESTAMPTZ,
  user_id UUID
);

-- 2. 商家模式表
CREATE TABLE vendor_patterns (
  id UUID PRIMARY KEY,
  vendor_name VARCHAR(255) UNIQUE,
  date_format VARCHAR(20), -- 'DD/MM/YY', 'MM/DD/YY'
  year_century VARCHAR(4), -- '20' or '19'
  correction_count INT DEFAULT 0,
  confidence_level FLOAT DEFAULT 0.5,
  last_updated TIMESTAMPTZ
);

-- 3. 索引优化
CREATE INDEX idx_corrections_vendor 
ON transaction_corrections(vendor_name);

CREATE INDEX idx_patterns_vendor 
ON vendor_patterns(vendor_name);
```

---

## 🎨 前端实现

### A. 可疑日期警告

```typescript
// 检测可疑日期
function checkSuspiciousDate(dateStr: string): boolean {
  const year = new Date(dateStr).getFullYear();
  const currentYear = new Date().getFullYear();
  
  // 年份距今超过 5 年
  if (Math.abs(currentYear - year) > 5) {
    return true;
  }
  
  return false;
}

// DateField 组件
<div className="relative">
  <label>Date</label>
  <input
    type="date"
    value={date}
    className={isSuspicious ? 'bg-yellow-50 border-yellow-400' : ''}
  />
  
  {isSuspicious && (
    <div className="text-yellow-600 text-xs mt-1">
      ⚠️ 年份可疑（距今 {Math.abs(currentYear - year)} 年），请确认
    </div>
  )}
  
  {confidence && (
    <div className="text-xs text-gray-600 mt-1">
      AI 置信度: {(confidence * 100).toFixed(0)}%
    </div>
  )}
</div>
```

### B. 修正反馈机制

```typescript
// 保存时发送反馈
async function handleSave() {
  const original = transaction.transaction_date;
  const corrected = formData.transaction_date;
  
  if (original !== corrected) {
    // 1. 更新记录
    await updateTransaction(id, formData);
    
    // 2. 发送学习反馈
    await sendCorrectionFeedback({
      transactionId: id,
      vendorName: transaction.vendor_name,
      fieldName: 'date',
      originalValue: original,
      correctedValue: corrected,
      confidenceScore: transaction.raw_data?.confidence
    });
    
    toast.success('已保存，系统正在学习 🧠');
  }
}
```

### C. 模式检测弹窗

```typescript
// 3次修正后提示
{corrections >= 3 && (
  <Dialog>
    <div className="p-6">
      <h3>🧠 检测到模式</h3>
      <p>
        系统检测到您多次修正 {vendorName} 的日期格式。
      </p>
      <p>
        是否将 DD/MM/YY 设为此商家的默认规则？
      </p>
      <button onClick={applyPattern}>
        ✓ 应用规则
      </button>
    </div>
  </Dialog>
)}
```

---

## 🔧 后端实现

### API: 记录修正

```typescript
// POST /api/corrections
export async function POST(request: Request) {
  const correction = await request.json();
  
  // 1. 记录修正
  await supabase
    .from('transaction_corrections')
    .insert({
      transaction_id: correction.transactionId,
      field_name: correction.fieldName,
      original_value: correction.originalValue,
      corrected_value: correction.correctedValue,
      vendor_name: correction.vendorName,
      correction_type: detectType(...)
    });
  
  // 2. 更新商家模式
  await updateVendorPattern(
    correction.vendorName,
    correction.originalValue,
    correction.correctedValue
  );
  
  return NextResponse.json({ success: true });
}

function updateVendorPattern(vendor, original, corrected) {
  const format = detectFormat(original, corrected);
  
  await supabase
    .from('vendor_patterns')
    .upsert({
      vendor_name: vendor,
      date_format: format, // 'DD/MM/YY'
      year_century: '20',
      correction_count: supabase.raw('correction_count + 1'),
      confidence_level: supabase.raw('LEAST(confidence_level + 0.1, 1.0)')
    });
}
```

---

## 🎯 温哥华本地商家适配

### 护城河策略 ⭐

```
目标商家:
1. THE HOME DEPOT → DD/MM/YY
2. RONA → DD/MM/YY
3. CANADIAN TIRE → DD/MM/YY
4. CLOVERDALE PAINT → MM/DD/YY
5. STAPLES → MM/DD/YY

策略:
✅ 针对本地商家优化
✅ 建立商家知识库
✅ 比通用 AI 更准确
✅ 这就是护城河！
```

---

## 🛠️ 给 Cursor 的指令

```markdown
Task: Implement ML Correction System

1. Database:
```sql
CREATE TABLE transaction_corrections (...);
CREATE TABLE vendor_patterns (...);
```

2. Frontend:
- Highlight suspicious dates (yellow)
- Show AI confidence score
- Send correction feedback on save
- Show pattern detection dialog after 3 corrections

3. Backend:
- POST /api/corrections
- Record corrections
- Update vendor_patterns
- Apply learned patterns in future scans

Success Criteria:
□ Suspicious dates highlighted
□ Corrections recorded
□ Vendor patterns learned
□ Accuracy improves over time
```

---

**总结**:

✅ **数据库支持 ML** (Supabase + pgvector)

✅ **前端三大功能** (警告 + 反馈 + 模式)

✅ **后端学习循环** (记录 + 更新 + 应用)

✅ **本地商家适配** (温哥华护城河)

🧠 **让 AI 越用越聪明！**
