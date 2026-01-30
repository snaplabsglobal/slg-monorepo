# RLS Policy 错误修复指南

**错误**: `new row violates row-level security policy for table "organizations"`

---

## 🔍 问题分析

### 错误原因
1. **RPC 函数调用失败**: `create_user_organization()` 函数可能不存在或不可用
2. **备用方法失败**: 直接 INSERT 被 RLS 策略阻止
3. **RLS 策略要求**: `auth.uid() = owner_id`，但可能在某些情况下不匹配

---

## ✅ 解决方案

### 方案 1: 确保 RPC 函数存在（推荐）

RPC 函数使用 `SECURITY DEFINER`，可以绕过 RLS 策略。

**检查函数是否存在**:
```sql
-- 在 Supabase Dashboard SQL Editor 中执行
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_user_organization';
```

**如果函数不存在，运行迁移**:
```bash
cd /home/pxjiang/slg-monorepo
supabase db push
```

**验证函数**:
```sql
-- 测试函数调用
SELECT create_user_organization(
  'YOUR_USER_ID_HERE'::uuid,
  'Test Company'
);
```

### 方案 2: 检查用户是否已有 Organization

由于我们已经为所有现有用户创建了 Organization，大多数情况下用户应该已经有 Organization。

**检查用户的 Organization**:
```sql
SELECT 
  u.email,
  u.id as user_id,
  o.id as org_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'YOUR_EMAIL@example.com';
```

### 方案 3: 修复 RLS 策略（如果需要）

如果 RLS 策略有问题，可以临时禁用或修改：

**检查当前策略**:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organizations';
```

**当前策略**:
```sql
CREATE POLICY "Users can create orgs" 
ON "public"."organizations" 
FOR INSERT 
WITH CHECK (("auth"."uid"() = "owner_id"));
```

这个策略应该是正确的。如果仍然失败，可能是：
- `auth.uid()` 返回 NULL（用户未正确认证）
- `owner_id` 不匹配

---

## 🔧 代码改进

我已经改进了代码，添加了：

1. ✅ **更好的错误处理**: 使用 `maybeSingle()` 避免不必要的错误
2. ✅ **详细的日志记录**: 记录 RPC 调用和直接插入的详细错误
3. ✅ **双重检查**: 先检查用户是否已有 Organization

---

## 🧪 测试步骤

1. **检查服务器日志**:
   - 查看控制台输出，确认使用的是哪种方法（RPC 或直接插入）
   - 查看详细的错误信息

2. **验证函数存在**:
   ```bash
   # 在 Supabase Dashboard SQL Editor 中
   SELECT create_user_organization('USER_ID', 'Test');
   ```

3. **检查用户 Organization**:
   ```sql
   SELECT * FROM organization_members WHERE user_id = 'YOUR_USER_ID';
   ```

4. **测试上传**:
   - 尝试上传收据
   - 查看详细的错误日志
   - 根据错误信息采取相应措施

---

## 📋 常见问题

### Q: RPC 函数调用失败，错误信息是什么？
A: 查看服务器控制台日志，应该会看到类似：
```
[Upload API] RPC call failed: { code: '42883', message: '...' }
```

### Q: 直接插入失败，RLS 策略错误
A: 这通常意味着：
1. RPC 函数不存在或不可用
2. 用户认证有问题（`auth.uid()` 返回 NULL）
3. `owner_id` 不匹配 `auth.uid()`

### Q: 如何确认用户已正确认证？
A: 检查 API 路由中的用户对象：
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
console.log('User:', user?.id, user?.email);
```

---

## 🎯 立即行动

1. **检查服务器日志**: 查看详细的错误信息
2. **验证 RPC 函数**: 确认 `create_user_organization()` 函数存在
3. **检查用户 Organization**: 确认用户是否已有 Organization
4. **如果用户已有 Organization**: 问题可能是查询逻辑，代码已改进

---

**代码已更新，现在会提供更详细的错误信息，帮助诊断问题。** ✅
