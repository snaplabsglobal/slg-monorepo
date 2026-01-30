# R2 文件上传 API 使用说明

## 概述

已创建 Cloudflare R2 文件上传 API，支持两种上传方式：
1. **服务器端上传** - 通过 API 路由上传（适合小文件）
2. **客户端直传** - 使用预签名 URL 直接上传到 R2（适合大文件）

## 环境变量配置

在 `apps/ls-web/.env.local` 或 Vercel 环境变量中添加：

```bash
# Cloudflare R2 配置
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-domain.com  # 可选，如果配置了自定义域名
```

## API 端点

### 1. POST /api/upload - 服务器端上传

通过服务器上传文件到 R2。

**请求：**
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'receipts')  // 可选
formData.append('transactionId', 'uuid')  // 可选

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})

const { url, path, size, contentType } = await response.json()
```

**响应：**
```json
{
  "success": true,
  "url": "https://...",
  "path": "receipts/org-123/transaction-456/1234567890-receipt.jpg",
  "size": 12345,
  "contentType": "image/jpeg"
}
```

### 2. GET /api/upload/presigned - 获取预签名 URL

获取预签名 URL 用于客户端直接上传。

**请求：**
```typescript
const params = new URLSearchParams({
  filename: 'receipt.jpg',
  contentType: 'image/jpeg',
  folder: 'receipts',
  transactionId: 'uuid',  // 可选
  expiresIn: '3600',  // 可选，默认 3600 秒
})

const response = await fetch(`/api/upload/presigned?${params}`)
const { presignedUrl, fileUrl, path, expiresIn } = await response.json()
```

**响应：**
```json
{
  "presignedUrl": "https://...",
  "fileUrl": "https://...",
  "path": "receipts/org-123/transaction-456/1234567890-receipt.jpg",
  "expiresIn": 3600
}
```

**使用预签名 URL 上传：**
```typescript
const uploadResponse = await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'image/jpeg',
  },
})
```

### 3. DELETE /api/upload - 删除文件

删除 R2 中的文件（仅限 Owner 和 Admin）。

**请求：**
```typescript
const response = await fetch(`/api/upload?path=${encodeURIComponent(filePath)}`, {
  method: 'DELETE',
})
```

## 客户端工具函数

已创建 `app/lib/storage/upload.ts` 提供便捷的上传函数：

### uploadFile() - 使用预签名 URL 上传

```typescript
import { uploadFile } from '@/app/lib/storage/upload'

const { url, path } = await uploadFile(file, {
  folder: 'receipts',
  transactionId: 'uuid',
  contentType: 'image/jpeg',
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`)
  },
})
```

### uploadFileViaAPI() - 通过 API 上传（支持进度）

```typescript
import { uploadFileViaAPI } from '@/app/lib/storage/upload'

const { url, path } = await uploadFileViaAPI(file, {
  folder: 'receipts',
  transactionId: 'uuid',
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`)
  },
})
```

### deleteFile() - 删除文件

```typescript
import { deleteFile } from '@/app/lib/storage/upload'

await deleteFile('receipts/org-123/transaction-456/file.jpg')
```

## 文件路径结构

文件按以下结构存储：
```
{folder}/{organizationId}/{transactionId}/{timestamp}-{filename}
```

例如：
```
receipts/org-123/transaction-456/1706342400000-receipt.jpg
```

## 安全特性

1. **身份验证** - 所有 API 都需要用户登录
2. **组织隔离** - 文件按组织 ID 隔离存储
3. **权限控制** - 只有 Owner 和 Admin 可以删除文件
4. **路径验证** - 删除时验证用户对文件路径的访问权限

## 安装依赖

已创建的 API 需要以下依赖：

```bash
cd apps/ls-web
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 使用示例

### React 组件中使用

```typescript
'use client'

import { useState } from 'react'
import { uploadFile } from '@/app/lib/storage/upload'

export function ReceiptUploader({ transactionId }: { transactionId: string }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const { url } = await uploadFile(file, {
        folder: 'receipts',
        transactionId,
        onProgress: setProgress,
      })
      setFileUrl(url)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <div>Uploading... {progress}%</div>}
      {fileUrl && <img src={fileUrl} alt="Uploaded receipt" />}
    </div>
  )
}
```

## 注意事项

1. **环境变量** - 确保在 Vercel 中配置了所有必需的 R2 环境变量
2. **CORS 配置** - 如果使用自定义域名，需要在 Cloudflare R2 中配置 CORS
3. **文件大小限制** - 建议大文件使用预签名 URL 方式上传
4. **错误处理** - 所有上传函数都会抛出错误，需要适当的错误处理
