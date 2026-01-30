# LedgerSnap 数据库初始化脚本

**目的**: 解决 "No organization" 错误 + 预设 GIFI 代码表

---

## 问题诊断

### 错误 1: 接口 404
```
前端: POST :3000/api/receipts/upload
后端: 路由未挂载
```

**解决方案**: 创建 `app/api/receipts/upload/route.ts`

---

### 错误 2: No organization found
```
业务逻辑: 用户上传收据时必须关联到 Organization
当前问题: 用户登录后没有自动创建 Organization
```

**解决方案**: API 自动创建默认 Organization

---

### 错误 3: GIFI 代码映射表缺失
```
Gemini 返回 GIFI 代码: "8320"
数据库查询: 找不到对应的科目说明
```

**解决方案**: 预设 BC 省建筑行业 GIFI 代码表

---

## 🚀 立即执行：数据库初始化

### Step 1: 创建 GIFI 代码表 (如果不存在)

```sql
-- ========================================
-- GIFI Codes 参考表
-- ========================================

-- 检查表是否存在
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'gifi_codes'
  ) THEN
    CREATE TABLE gifi_codes (
      code TEXT PRIMARY KEY CHECK (code ~ '^\d{4}$'),
      name TEXT NOT NULL,
      description TEXT,
      category_type TEXT CHECK (category_type IN ('expense', 'revenue', 'asset', 'liability')),
      is_common BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    COMMENT ON TABLE gifi_codes IS 'Canadian GIFI (General Index of Financial Information) tax codes';
  END IF;
END $$;

-- 插入 BC 省建筑行业常用 GIFI 代码
INSERT INTO gifi_codes (code, name, description, category_type, is_common) VALUES
  -- 建材和用品
  ('8320', 'Materials/Supplies', 'Construction materials, supplies, and inventory', 'expense', true),
  
  -- 车辆费用
  ('9281', 'Fuel Costs', 'Gas, diesel, and other vehicle fuel', 'expense', true),
  ('9282', 'Vehicle Repairs & Maintenance', 'Vehicle servicing and repairs', 'expense', true),
  ('9283', 'Vehicle Licenses & Insurance', 'Vehicle registration and insurance', 'expense', true),
  
  -- 办公和行政
  ('8810', 'Office Supplies', 'Stationery, paper, office equipment', 'expense', true),
  ('8860', 'Advertising & Promotion', 'Marketing and advertising expenses', 'expense', false),
  ('8862', 'Professional Services', 'Legal, accounting, consulting fees', 'expense', true),
  
  -- 餐饮娱乐
  ('8523', 'Meals & Entertainment', 'Business meals (50% deductible)', 'expense', true),
  
  -- 公用事业
  ('9220', 'Utilities', 'Electricity, gas, water', 'expense', true),
  ('9225', 'Telephone & Internet', 'Phone bills and internet service', 'expense', true),
  
  -- 租金和物业
  ('9200', 'Rent', 'Office or warehouse rent', 'expense', false),
  ('9180', 'Property Taxes', 'Municipal property taxes', 'expense', false),
  
  -- 保险
  ('9804', 'Business Insurance', 'General liability insurance', 'expense', true),
  
  -- 设备和工具
  ('8690', 'Tools < $500', 'Small tools and equipment', 'expense', true),
  ('8670', 'Equipment Rental', 'Rental of construction equipment', 'expense', true),
  
  -- 其他
  ('8760', 'Other Expenses', 'Miscellaneous business expenses', 'expense', true),
  ('9270', 'Bank Charges', 'Banking fees and service charges', 'expense', false)
ON CONFLICT (code) DO NOTHING;

-- 验证插入
SELECT COUNT(*) as gifi_codes_count FROM gifi_codes;
```

---

### Step 2: 为当前用户创建 Organization

```sql
-- ========================================
-- 为测试用户创建 Organization
-- ========================================

-- 替换 YOUR_USER_ID 为你的实际用户 ID
-- 可以通过 Supabase Dashboard -> Authentication -> Users 查看

DO $$ 
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- 替换这里！
  v_user_email TEXT;
  v_org_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  -- 检查用户是否存在
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_id;
  END IF;
  
  RAISE NOTICE 'Found user: %', v_user_email;
  
  -- 检查是否已有 Organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id
  ) INTO v_org_exists;
  
  IF v_org_exists THEN
    RAISE NOTICE 'User already has an organization';
  ELSE
    -- 创建新 Organization
    INSERT INTO organizations (name, owner_id, plan, usage_metadata)
    VALUES (
      v_user_email || '''s Company',
      v_user_id,
      'Free',
      jsonb_build_object(
        'project_limit', 1,
        'receipt_count', 0
      )
    )
    RETURNING id INTO v_org_id;
    
    RAISE NOTICE 'Created organization: %', v_org_id;
    
    -- 添加用户为 Owner
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'Owner');
    
    RAISE NOTICE 'User added as Owner';
  END IF;
  
  -- 显示结果
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Setup complete!';
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;
  RAISE NOTICE '=================================';
END $$;
```

---

### Step 3: 验证设置

```sql
-- ========================================
-- 验证 Organization 绑定
-- ========================================

-- 查看你的 Organization
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.plan,
  om.role,
  u.email as owner_email
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users u ON om.user_id = u.id
WHERE u.email = 'YOUR_EMAIL@example.com'; -- 替换你的邮箱

-- 查看 GIFI 代码
SELECT 
  code,
  name,
  description,
  is_common
FROM gifi_codes
WHERE is_common = true
ORDER BY code;
```

---

## 🔧 前端修复：UploadReceipt.tsx

### 问题代码 (第 96 行)
```typescript
if (!organizationId) {
  throw new Error('No organization found');
}
```

### 修复方案 1: 前端自动创建 (不推荐)
前端不应该负责创建 Organization，这是后端职责。

### 修复方案 2: 后端自动创建 (推荐) ✅
已在 `receipts-upload-api-complete.ts` 中实现：

```typescript
// API 会自动检查并创建 Organization
if (!existingMembership) {
  // 创建默认 Organization
  const newOrg = await supabase.from('organizations').insert({...})
  // 添加用户为 Owner
  await supabase.from('organization_members').insert({...})
}
```

### 修复方案 3: 前端更友好的错误提示
```typescript
// components/receipts/UploadReceipt.tsx (第 90-100 行)

// 获取 Organization
const { data: membership } = await supabase
  .from('organization_members')
  .select('organization_id')
  .eq('user_id', user.id)
  .single();

if (!membership?.organization_id) {
  setError(
    'Organization setup incomplete. ' +
    'Please contact support or refresh the page to create your workspace.'
  );
  setUploading(false);
  return;
}
```

---

## 🎯 完整流程验证

### 测试步骤

#### 1. 初始化数据库
```bash
# 在 Supabase Dashboard -> SQL Editor 执行
# 1. 创建 GIFI 代码表
# 2. 为用户创建 Organization
```

#### 2. 部署新的 Upload API
```bash
# 创建文件
mkdir -p app/api/receipts/upload
touch app/api/receipts/upload/route.ts

# 复制代码从 receipts-upload-api-complete.ts

# 重启开发服务器
pnpm run dev
```

#### 3. 测试上传
```bash
# 方法 1: 前端 UI
http://localhost:3000/upload

# 方法 2: curl 测试
curl -X POST http://localhost:3000/api/receipts/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-receipt.jpg"
```

---

## 📊 数据库检查清单

### ✅ 必须存在的表
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'organizations',
  'organization_members',
  'transactions',
  'transaction_items',
  'gifi_codes',
  'profiles'
)
ORDER BY table_name;
```

### ✅ 必须存在的字段
```sql
-- transactions 表
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions'
AND column_name IN (
  'organization_id',
  'vendor_name',
  'total_amount',
  'tax_details',
  'raw_data',
  'ai_confidence',
  'needs_review'
)
ORDER BY column_name;
```

### ✅ 用户 Organization 绑定
```sql
-- 检查当前用户
SELECT 
  u.email,
  u.id as user_id,
  o.id as org_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'YOUR_EMAIL'; -- 替换你的邮箱
```

---

## 🚨 COO 的实战逻辑提醒

### 多租户架构已生效 ✅

```
好处:
✅ 数据隔离 - 你的公司 vs 老婆的公司
✅ 权限分离 - Owner vs Member
✅ 独立计费 - 每个 Org 独立配额

当前坑:
⚠️ 需要手动绑定用户到 Organization
⚠️ GIFI 代码表需要预设
⚠️ 前端需要正确传递 organizationId
```

### 数据流验证

```
拍照 → 上传
  ↓
检查 Organization (自动创建)
  ↓
调用 Gemini 解析
  ↓
提取 GIFI 代码
  ↓
存入 transactions 表
  ↓
关联到 Organization
  ↓
显示在 Dashboard
```

---

## 🎯 立即行动清单

### BOSS 要做的：

```
1. ✅ 获取你的 User ID
   - Supabase Dashboard -> Authentication -> Users
   - 复制 UUID

2. ✅ 运行 SQL 初始化脚本
   - SQL Editor -> 粘贴 Step 1 (GIFI 代码)
   - SQL Editor -> 粘贴 Step 2 (Organization)
   - 替换 YOUR_USER_ID

3. ✅ 验证设置
   - 运行 Step 3 SQL
   - 确认有 Organization

4. ✅ 重新测试上传
```

### CTO 要做的：

```
1. ✅ 创建 API Route
   app/api/receipts/upload/route.ts

2. ✅ 复制完整代码
   从 receipts-upload-api-complete.ts

3. ✅ 测试 API
   GET /api/receipts/upload (检查状态)
   POST /api/receipts/upload (上传测试)

4. ✅ 修复前端错误提示
   UploadReceipt.tsx 第 96 行
```

---

## 📞 排查问题的命令

```sql
-- 1. 检查 GIFI 代码
SELECT COUNT(*) FROM gifi_codes;
-- 应该返回 17

-- 2. 检查你的 Organization
SELECT * FROM organizations WHERE owner_id = 'YOUR_USER_ID';

-- 3. 检查成员关系
SELECT * FROM organization_members WHERE user_id = 'YOUR_USER_ID';

-- 4. 检查 transactions 表
SELECT COUNT(*) FROM transactions WHERE organization_id = 'YOUR_ORG_ID';
```

---

## ✅ 成功标志

完成后你应该看到：

```
✅ GIFI 代码表有 17 条记录
✅ 你有一个 Organization
✅ 你是这个 Organization 的 Owner
✅ 上传接口返回 200
✅ Transaction 成功保存
✅ Dashboard 显示新上传的收据
```

---

**CTO，数据库 GIFI 科目表预设完成！现在立即执行 SQL 初始化脚本！** 🚀
