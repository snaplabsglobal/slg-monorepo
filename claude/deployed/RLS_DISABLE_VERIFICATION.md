# RLS 禁用验证和故障排除

**问题**: 仍然出现 `new row violates row-level security policy for table "organizations"` 错误

---

## 🔍 问题诊断

### 可能的原因

1. **应用连接的是本地数据库，但本地 RLS 未禁用**
   - `.env.local` 指向 `http://127.0.0.1:54321`
   - 迁移只应用到了远程数据库（JobSite-Snap-Dev）
   - 本地数据库的 RLS 仍然启用

2. **环境变量优先级问题**
   - Next.js 环境变量优先级：`.env.local` > `.env.development` > `.env.production`
   - 如果 `.env.local` 存在，会优先使用本地配置

3. **迁移未正确应用**
   - 迁移已推送到远程，但可能没有应用到正确的数据库

---

## ✅ 解决方案

### 方案 1: 在本地数据库也禁用 RLS（如果使用本地开发）

如果你在本地开发，需要在本地 Supabase 也禁用 RLS：

```bash
# 1. 启动本地 Supabase（如果未运行）
cd /home/pxjiang/slg-monorepo
supabase start

# 2. 在本地数据库执行禁用 RLS 的 SQL
supabase db reset  # 这会应用所有迁移，包括禁用 RLS 的迁移

# 或者手动执行：
supabase db execute "
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
"
```

### 方案 2: 使用远程数据库（推荐）

如果你想使用远程数据库（JobSite-Snap-Dev），需要：

1. **删除或重命名 `.env.local`**（临时）：
```bash
cd /home/pxjiang/slg-monorepo/apps/ls-web
mv .env.local .env.local.bak
```

2. **确保 `.env.development` 指向远程数据库**：
```bash
# 检查 .env.development
cat .env.development
# 应该显示: NEXT_PUBLIC_SUPABASE_URL=https://kojxysllasxnybahbggu.supabase.co
```

3. **重启开发服务器**：
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
pnpm dev
```

### 方案 3: 验证远程数据库的 RLS 状态

在 Supabase Dashboard SQL Editor 中执行：

```sql
-- 检查 RLS 状态
SELECT 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'organizations', 
  'organization_members', 
  'transactions', 
  'transaction_items'
)
ORDER BY tablename;
```

**预期结果**（RLS 已禁用）:
```
tablename              | rls_enabled
-----------------------+------------
organization_members   | f
organizations          | f
transaction_items      | f
transactions           | f
```

如果显示 `t` (true)，说明 RLS 仍然启用，需要重新执行迁移。

---

## 🔧 立即操作步骤

### 步骤 1: 确认应用连接的是哪个数据库

查看服务器端日志（运行 `pnpm dev` 的终端），查找 Supabase 连接信息。

或者检查环境变量：
```bash
cd /home/pxjiang/slg-monorepo/apps/ls-web
cat .env.local | grep SUPABASE_URL
cat .env.development | grep SUPABASE_URL
```

### 步骤 2: 根据结果选择方案

**如果使用本地数据库**:
- 执行方案 1（在本地禁用 RLS）

**如果使用远程数据库**:
- 执行方案 2（确保使用远程配置）
- 执行方案 3（验证远程 RLS 状态）

---

## 📋 快速修复命令

### 如果使用本地数据库：

```bash
# 启动本地 Supabase
cd /home/pxjiang/slg-monorepo
supabase start

# 应用迁移（包括禁用 RLS）
supabase db reset

# 或者手动禁用 RLS
supabase db execute "
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
"
```

### 如果使用远程数据库：

```bash
# 临时禁用本地配置
cd /home/pxjiang/slg-monorepo/apps/ls-web
mv .env.local .env.local.bak

# 重启开发服务器
# (停止当前服务器，然后重新运行 pnpm dev)
```

---

## 🎯 推荐方案

**推荐使用远程数据库（JobSite-Snap-Dev）**，因为：
- ✅ 迁移已经应用
- ✅ 数据是共享的（团队可以协作）
- ✅ 不需要本地 Supabase 运行

**操作**:
1. 临时重命名 `.env.local` 为 `.env.local.bak`
2. 重启开发服务器
3. 测试上传功能

---

**请告诉我你选择哪个方案，我可以帮你执行！** 🚀
