# R2 Storage Fallback 修复

**修复日期**: 2026-01-28  
**问题**: `Error: Cloudflare R2 credentials not configured`

---

## ✅ 已完成的修复

### 添加 Supabase Storage 备用方案

修改了 `apps/ls-web/app/api/receipts/upload/route.ts`，添加了自动备用机制：

1. **首选**: 尝试使用 Cloudflare R2
2. **备用**: 如果 R2 未配置，自动使用 Supabase Storage

### 代码逻辑

```typescript
try {
  // 尝试 R2
  const r2Result = await uploadToR2(...);
  fileUrl = r2Result.fileUrl;
} catch (r2Error) {
  // 如果 R2 未配置，使用 Supabase Storage
  if (r2Error.message.includes('Cloudflare R2 credentials not configured')) {
    // 上传到 Supabase Storage
    const { data } = await supabase.storage
      .from('receipt-images')
      .upload(storagePath, fileBuffer, ...);
    
    fileUrl = supabase.storage.from('receipt-images').getPublicUrl(storagePath);
  }
}
```

---

## 🔧 需要设置 Supabase Storage Bucket

### 方法 1: 通过 Supabase Dashboard（推荐）

1. **打开 Supabase Dashboard**
   - 本地: http://127.0.0.1:54323 (Storage)
   - 远程: https://supabase.com/dashboard/project/YOUR-PROJECT/storage

2. **创建 Bucket**
   - 点击 "Storage" → "New bucket"
   - Bucket 名称: `receipt-images`
   - Public bucket: ✅ **启用**（允许公开访问）
   - File size limit: 10MB（或根据需要）
   - Allowed MIME types: `image/*`（或留空允许所有）

3. **设置 RLS 策略**（如果需要）
   - 由于我们已经禁用了 RLS，这一步可以跳过
   - 如果需要启用 RLS，策略已经存在于迁移文件中

### 方法 2: 通过 SQL（如果 Dashboard 不可用）

```sql
-- 创建 Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  true,  -- Public bucket
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;
```

---

## 📋 验证步骤

### 1. 检查 Bucket 是否存在

**本地 Supabase**:
```bash
# 访问 Storage Dashboard
open http://127.0.0.1:54323
```

**远程 Supabase**:
- 访问 Supabase Dashboard → Storage
- 查看是否有 `receipt-images` bucket

### 2. 测试上传功能

1. 重启开发服务器（如果正在运行）
2. 尝试上传收据
3. 查看服务器日志，应该看到：
   - `[Upload API] R2 not configured, using Supabase Storage fallback`
   - `[Upload API] File uploaded to Supabase Storage: ...`

---

## 🎯 两种存储方案对比

### Cloudflare R2（生产推荐）
- ✅ 更低的成本
- ✅ 更好的性能
- ✅ CDN 集成
- ⚠️ 需要配置环境变量

### Supabase Storage（开发/备用）
- ✅ 无需额外配置
- ✅ 与 Supabase 集成
- ✅ 适合开发测试
- ⚠️ 有存储限制（取决于 Supabase 计划）

---

## 📝 环境变量配置（可选）

如果你想使用 R2（生产环境推荐），在 `.env.local` 或 `.env.development` 中添加：

```bash
# Cloudflare R2 配置
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-domain.com  # 可选
```

---

## ✅ 当前状态

- ✅ 代码已修复，支持自动备用
- ⏳ **需要创建 Storage bucket**: `receipt-images`
- ⏳ **需要重启开发服务器**

---

## 🚀 立即操作

### 创建 Storage Bucket

**本地 Supabase**:
1. 访问 http://127.0.0.1:54323
2. 创建 bucket: `receipt-images`
3. 设置为 Public

**或使用 SQL**:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', true)
ON CONFLICT (id) DO NOTHING;
```

### 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
cd apps/ls-web
pnpm dev
```

---

**修复完成！现在上传功能应该可以正常工作了（使用 Supabase Storage）。** ✅
