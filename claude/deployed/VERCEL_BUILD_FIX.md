# Vercel 部署错误诊断和修复

**错误**: Module not found: Can't resolve '@slo/snap-storage/server'

**原因**: 旧代码引用了不存在的 monorepo 包

---

## 🔍 错误分析

### 错误详情

```
Failed to compile.

./app/api/receipts/quick-upload/route.ts
Module not found: Can't resolve '@slo/snap-storage/server'

./app/api/receipts/upload/route.ts
Module not found: Can't resolve '@slo/snap-storage/server'

./app/api/transactions/[id]/replace/route.ts
Module not found: Can't resolve '@slo/snap-storage/server'

./app/api/upload/presigned/route.ts
Module not found: Can't resolve '@slo/snap-storage/server'

./app/api/upload/route.ts
Module not found: Can't resolve '@slo/snap-storage/server'
```

### 根本原因

```
问题:
@slo/snap-storage 包不存在或未构建

可能原因:
1. 包已删除但代码未更新 ❌
2. 包未在 build 命令中包含 ❌
3. 包路径配置错误 ❌
4. 这是旧代码遗留问题 ✅ (CEO 猜测正确！)
```

---

## 🛠️ 快速修复方案

### 方案 1: 检查包是否存在

```bash
# 检查 monorepo 结构
cd /vercel/path0
ls -la packages/

预期结构:
packages/
├── snap-auth/      ✅ (已存在)
├── snap-types/     ✅ (已存在)
└── snap-storage/   ❓ (可能不存在)
```

### 方案 2A: 如果包不存在 → 创建或移除引用

```bash
# 选项 A1: 创建 snap-storage 包
cd packages
mkdir snap-storage
cd snap-storage

# package.json
{
  "name": "@slo/snap-storage",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./server": {
      "types": "./dist/server/index.d.ts",
      "default": "./dist/server/index.js"
    }
  }
}

# tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  }
}

# src/server/index.ts
export * from './r2';
export * from './upload';
```

```bash
# 选项 A2: 移除所有引用（推荐 ✅）
# 找到所有引用并替换为本地实现

在这些文件中:
- app/api/receipts/quick-upload/route.ts
- app/api/receipts/upload/route.ts
- app/api/transactions/[id]/replace/route.ts
- app/api/upload/presigned/route.ts
- app/api/upload/route.ts

替换:
import { xxx } from '@slo/snap-storage/server';

为:
import { xxx } from '@/lib/storage/r2'; // 本地实现
```

### 方案 2B: 如果包存在但未构建

```bash
# 在 build 命令中添加
pnpm --filter @slo/snap-storage build

完整命令:
"cd ../.. && 
 pnpm --filter @slo/snap-auth build && 
 pnpm --filter @slo/snap-types build && 
 pnpm --filter @slo/snap-storage build && 
 cd apps/ls-web && 
 pnpm build"
```

---

## 🎯 推荐解决方案

### 最优方案: 本地化 + 清理

```typescript
// 1. 创建本地存储模块
// lib/storage/r2.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  file: File,
  key: string,
  bucket: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: await file.arrayBuffer(),
    ContentType: file.type,
  });
  
  await r2Client.send(command);
  
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(
  key: string,
  bucket: string
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  await r2Client.send(command);
}

export async function getPresignedUploadUrl(
  key: string,
  bucket: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await getSignedUrl(r2Client, command, { expiresIn });
}
```

```typescript
// 2. 更新所有 API 路由
// app/api/receipts/upload/route.ts

// ❌ 旧代码
import { uploadToR2 } from '@slo/snap-storage/server';

// ✅ 新代码
import { uploadToR2 } from '@/lib/storage/r2';

// 其他代码保持不变
export async function POST(request: Request) {
  // ...
  const url = await uploadToR2(file, key, 'receipts');
  // ...
}
```

---

## 🚀 给 Cursor 的修复指令

```markdown
## URGENT: Fix Vercel Build Error

### Error
Module not found: @slo/snap-storage/server

### Root Cause
Old code referencing non-existent package

### Fix Steps

1. **Create local storage module:**
   - Create `lib/storage/r2.ts`
   - Implement: uploadToR2, deleteFromR2, getPresignedUploadUrl
   - Use @aws-sdk/client-s3

2. **Update all API routes:**
   - app/api/receipts/quick-upload/route.ts
   - app/api/receipts/upload/route.ts
   - app/api/transactions/[id]/replace/route.ts
   - app/api/upload/presigned/route.ts
   - app/api/upload/route.ts
   
   Replace:
   ```typescript
   import { xxx } from '@slo/snap-storage/server';
   ```
   
   With:
   ```typescript
   import { xxx } from '@/lib/storage/r2';
   ```

3. **Remove package reference:**
   - Remove from pnpm-workspace.yaml if exists
   - Remove from tsconfig paths if exists

4. **Test build:**
   ```bash
   pnpm build
   ```

### Success Criteria
□ No @slo/snap-storage imports
□ All storage functions in lib/storage/r2.ts
□ Build succeeds locally
□ Vercel deployment succeeds
```

---

## 🔍 验证步骤

### 本地验证

```bash
# 1. 搜索所有引用
cd apps/ls-web
grep -r "@slo/snap-storage" .

# 2. 检查是否全部替换
# 应该返回 0 结果

# 3. 本地构建测试
pnpm build

# 4. 确认成功
# ✅ Build completed successfully
```

### Vercel 验证

```bash
# 推送到 dev 分支
git add .
git commit -m "fix: replace @slo/snap-storage with local implementation"
git push origin dev

# 检查 Vercel 部署
# ✅ Deployment succeeded
```

---

## 📋 完整清理清单

```
□ 创建 lib/storage/r2.ts
□ 实现 uploadToR2 函数
□ 实现 deleteFromR2 函数
□ 实现 getPresignedUploadUrl 函数
□ 更新 app/api/receipts/quick-upload/route.ts
□ 更新 app/api/receipts/upload/route.ts
□ 更新 app/api/transactions/[id]/replace/route.ts
□ 更新 app/api/upload/presigned/route.ts
□ 更新 app/api/upload/route.ts
□ 搜索确认无遗漏引用
□ 本地构建测试
□ 推送 Vercel 验证
```

---

## 💡 预防措施

### 未来避免此类问题

```
1. 使用本地模块优先
   ✅ lib/storage/r2.ts
   ❌ @slo/snap-storage/server

2. Monorepo 包只用于真正共享的代码
   ✅ @slo/snap-auth (多应用共享)
   ✅ @slo/snap-types (类型定义)
   ❌ @slo/snap-storage (单应用使用)

3. 部署前本地构建测试
   pnpm build

4. CI/CD 检查
   - 自动构建测试
   - 依赖检查
```

---

**快速总结**:

✅ **CEO 猜对了** - 这是旧代码遗留

✅ **根本原因** - 引用了不存在的包

✅ **修复方案** - 本地化存储模块

✅ **预防措施** - 优先使用本地模块

🚀 **立即修复，恢复部署！**
