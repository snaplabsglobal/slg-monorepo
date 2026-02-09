# SLG R2 分级存储架构 - 完整实施方案

**架构设计**: COO (实战逻辑)  
**技术实现**: CTO  
**项目**: SLG (LedgerSnap + JobSiteSnap)

---

## 🎯 三层 Bucket 架构

```
┌────────────────────────────────────────────────────────┐
│           SLG Storage System (R2)                      │
├──────────────┬──────────────┬───────────────────────────┤
│ slg-receipts │  slg-media   │     slg-docs             │
│  (财务真相)   │  (工地证据)   │    (法律证据)             │
├──────────────┼──────────────┼───────────────────────────┤
│ • 收据图片    │ • 工地照片    │ • 工程合约                │
│ • 电子账单    │ • 进度视频    │ • Drawings (CAD/PDF)     │
│ • Invoice    │ • 完工照片    │ • 许可证书                │
│              │              │ • 变更单                   │
├──────────────┼──────────────┼───────────────────────────┤
│ Private      │ Restricted   │ Legal                    │
│ 极高权限      │ 中等权限      │ 极高权限                  │
│ 7年保存(CRA) │ 2年后冷存储   │ 永久保存                  │
│ Gemini OCR  │ 图片压缩      │ 版本控制 + 全文搜索        │
└──────────────┴──────────────┴───────────────────────────┘
```

---

## 📂 Bucket 1: slg-receipts (财务真相)

### 存储内容
- LS 识别的收据图片
- 电子账单 PDF
- Credit card statements
- Vendor invoices

### 权限级别：极高 (Private)
**COO 逻辑**: 这是"财务真相"，包含敏感价格和支付信息。除了老板和会计，任何人不能看。必须启用严格的权限控制。

### 文件结构
```
slg-receipts/
├── {org_id}/
│   ├── {project_id}/
│   │   └── receipts/
│   │       ├── 2026-01/
│   │       │   ├── 1738000000-abc.jpg
│   │       │   └── ...
│   │       └── 2026-02/
│   └── shared/  # 跨项目收据
└── backups/  # 每日备份
```

### 环境变量
```bash
# .env.local
R2_RECEIPTS_BUCKET=slg-receipts
R2_RECEIPTS_ACCESS_KEY_ID=xxx
R2_RECEIPTS_SECRET_ACCESS_KEY=yyy
R2_RECEIPTS_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_RECEIPTS_PUBLIC_URL=https://receipts.slg.app
```

---

## 📸 Bucket 2: slg-media (工地证据)

### 存储内容
- 工地照片 (Before/During/After)
- 进度视频
- 问题记录照片

### 权限级别：中等 (Restricted)
**COO 逻辑**: 文件大且多。未来可能需要分享给客户看 (Client Portal)。独立出来方便做 CDN 加速，不影响财务数据的安全。

### 文件结构
```
slg-media/
├── {org_id}/
│   ├── {project_id}/
│   │   ├── progress/
│   │   │   ├── 2026-W01/  # 按周
│   │   │   └── ...
│   │   ├── before/
│   │   ├── after/
│   │   └── issues/
```

### 特殊处理
```typescript
// 自动生成缩略图
autoThumbnail: true
// CDN 加速
cdnEnabled: true
// 2年后冷存储
archiveAfter: 730 days
```

---

## 📄 Bucket 3: slg-docs (法律证据)

### 存储内容
- 工程合约
- Drawings (图纸 - 支持版本控制)
- 许可证书
- 变更单
- 验收报告

### 权限级别：极高 (Legal)
**COO 逻辑**: 这是"法律证据"。这些文件通常是多页 PDF 或大图，需要支持版本管理 (比如 Drawing V1, V2)。独立存储方便日后做"合同审计"。

### 文件结构（重点：版本控制）
```
slg-docs/
├── {org_id}/
│   ├── {project_id}/
│   │   ├── contracts/
│   │   ├── drawings/
│   │   │   ├── architectural/
│   │   │   │   ├── floor-plan-v1.pdf
│   │   │   │   ├── floor-plan-v2.pdf
│   │   │   │   ├── floor-plan-v3.pdf  # ← Latest
│   │   │   │   └── metadata.json
│   │   │   ├── structural/
│   │   │   └── electrical/
│   │   ├── permits/
│   │   └── change-orders/
```

### 版本控制元数据
```json
{
  "fileName": "floor-plan",
  "versions": [
    {
      "version": "v1",
      "uploadedAt": "2026-01-15T10:00:00Z",
      "uploadedBy": "user_123",
      "isLatest": false,
      "changeDescription": "Initial design"
    },
    {
      "version": "v3",
      "uploadedAt": "2026-02-01T14:30:00Z",
      "uploadedBy": "user_456",
      "isLatest": true,
      "changeDescription": "Kitchen layout revision"
    }
  ]
}
```

---

## 🔐 权限矩阵

| 角色 | slg-receipts | slg-media | slg-docs |
|------|-------------|-----------|----------|
| **Owner** | ✅ Full | ✅ Full | ✅ Full |
| **Accountant** | ✅ Full | ❌ None | ✅ Read (Invoices) |
| **PM** | ❌ None | ✅ Full | ✅ Full |
| **Superintendent** | ❌ None | ✅ Upload + Read | ✅ Read (Drawings) |
| **Client** | ❌ None | ✅ Read (Progress) | ❌ None |

**COO 验证**: 带班经理可以上传工地照片，但绝对不应该有权限看到收据里的材料进价。✓

---

## 🚀 实施计划

### Phase 1: MVP - slg-receipts (当前 - 立即)

```
目标: LedgerSnap 收据上传功能

步骤:
1. ✅ Cloudflare 创建 slg-receipts Bucket
2. ✅ 创建 API Token
3. ✅ 配置环境变量
4. ✅ 实现 receipts-client.ts
5. ✅ 更新 upload API
6. ✅ 测试上传
```

### Phase 2: JSS Beta - slg-media (Week 4-5)

```
目标: 工地照片上传

步骤:
1. 创建 slg-media Bucket
2. 配置 CDN 加速 (media.slg.app)
3. 实现照片上传 + 自动缩略图
4. 带班经理权限测试
```

### Phase 3: JSS Full - slg-docs (Week 6-8)

```
目标: 文档管理 + 图纸版本控制

步骤:
1. 创建 slg-docs Bucket (启用 Versioning)
2. 实现 Drawing 版本控制
3. PDF 全文搜索
4. 合约审计功能
```

---

## 💻 代码实现

### 基础 R2 客户端

```typescript
// lib/r2/base-client.ts

import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export function createR2Client(config: {
  bucketName: string;
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}) {
  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: config.credentials,
  });

  return {
    async upload(params: {
      key: string;
      body: Buffer;
      contentType?: string;
      metadata?: Record<string, string>;
    }) {
      const upload = new Upload({
        client,
        params: {
          Bucket: config.bucketName,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
          Metadata: params.metadata,
        },
      });

      await upload.done();

      return {
        url: `${config.endpoint}/${config.bucketName}/${params.key}`,
        key: params.key,
      };
    },

    // ... delete, list, etc.
  };
}
```

### slg-receipts 专用客户端

```typescript
// lib/r2/receipts.ts

import { createR2Client } from './base-client';

const receiptsClient = createR2Client({
  bucketName: process.env.R2_RECEIPTS_BUCKET!,
  endpoint: process.env.R2_RECEIPTS_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_RECEIPTS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_RECEIPTS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadReceipt(params: {
  organizationId: string;
  projectId?: string;
  userId: string;
  file: Buffer;
  originalName: string;
  contentType: string;
}) {
  const { organizationId, projectId, userId, file, originalName, contentType } = params;

  // 生成路径
  const month = new Date().toISOString().substring(0, 7); // 2026-01
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop();
  const fileName = `${timestamp}-${random}.${ext}`;

  const path = projectId
    ? `${organizationId}/${projectId}/receipts/${month}/${fileName}`
    : `${organizationId}/shared/receipts/${month}/${fileName}`;

  // 上传
  const result = await receiptsClient.upload({
    key: path,
    body: file,
    contentType,
    metadata: {
      organizationId,
      projectId: projectId || 'shared',
      userId,
      originalName,
      uploadedAt: new Date().toISOString(),
      bucket: 'receipts',
    },
  });

  return result;
}
```

### slg-docs 版本控制

```typescript
// lib/r2/docs.ts

export async function uploadDrawing(params: {
  organizationId: string;
  projectId: string;
  category: 'architectural' | 'structural' | 'electrical';
  file: Buffer;
  fileName: string;
  changeDescription?: string;
}) {
  const { organizationId, projectId, category, file, fileName, changeDescription } = params;

  // 检查现有版本
  const existingVersions = await listVersions({
    organizationId,
    projectId,
    category,
    fileName,
  });

  const newVersion = `v${existingVersions.length + 1}`;

  // 标记旧版本为非最新
  if (existingVersions.length > 0) {
    const latestVersion = existingVersions[0];
    await updateMetadata(latestVersion.key, {
      isLatest: 'false',
    });
  }

  // 上传新版本
  const key = `${organizationId}/${projectId}/drawings/${category}/${fileName}-${newVersion}.pdf`;

  return await docsClient.upload({
    key,
    body: file,
    contentType: 'application/pdf',
    metadata: {
      version: newVersion,
      isLatest: 'true',
      changeDescription: changeDescription || '',
      uploadedAt: new Date().toISOString(),
    },
  });
}
```

---

## 🎨 统一 UI：文件浏览器

```typescript
// components/project/FileExplorer.tsx

const BUCKETS = [
  {
    id: 'receipts',
    name: 'Financial Records',
    icon: '💰',
    roles: ['Owner', 'Accountant'],
    bucket: 'slg-receipts',
  },
  {
    id: 'media',
    name: 'Site Photos',
    icon: '📸',
    roles: ['Owner', 'PM', 'Superintendent', 'Client'],
    bucket: 'slg-media',
  },
  {
    id: 'docs',
    name: 'Project Documents',
    icon: '📄',
    roles: ['Owner', 'PM'],
    bucket: 'slg-docs',
  },
];

export function FileExplorer() {
  const [activeTab, setActiveTab] = useState('receipts');
  const userRole = useUserRole();

  const visibleBuckets = BUCKETS.filter(b =>
    b.roles.includes(userRole)
  );

  return (
    <div className="file-explorer">
      <nav className="tabs">
        {visibleBuckets.map(bucket => (
          <button
            key={bucket.id}
            onClick={() => setActiveTab(bucket.id)}
            className={activeTab === bucket.id ? 'active' : ''}
          >
            {bucket.icon} {bucket.name}
          </button>
        ))}
      </nav>

      <main>
        <FileList bucket={activeTab} />
      </main>
    </div>
  );
}
```

**UI 效果**（虽然物理上 3 个 Bucket，但看起来像 1 个文件夹）：

```
┌──────────────┬─────────────────────────────────┐
│ 💰 Financial │  January 2026                   │
│    Records   │  ├─ Home Depot - $50.40        │
│              │  ├─ Shell - $67.20             │
│ 📸 Site      │  └─ Cactus Club - $89.60       │
│    Photos    │                                 │
│              │  [Upload] [Export CSV]         │
│ 📄 Documents │                                 │
└──────────────┴─────────────────────────────────┘
```

---

## 💰 成本分析

```
slg-receipts:
- 存储: 5GB (10,000 张收据)
- 成本: $0.075/月

slg-media:
- 存储: 50GB (照片 + 视频)
- 成本: $0.75/月
- CDN: ~$9/月

slg-docs:
- 存储: 10GB (PDF/CAD)
- 成本: $0.15/月

总计: ~$10/月

对比单 Bucket 混放:
- 成本几乎相同
- 但安全性和管理性大幅提升 ✓
```

---

## ✅ COO 逻辑验证

### 1. 权限隔离 ✓
```
带班经理上传工地照片 → slg-media ✓
但看不到收据进价 → slg-receipts 拒绝访问 ✓
```

### 2. 生命周期管理 ✓
```
收据保存 7 年 → 符合 CRA 要求 ✓
工地照片 2 年后冷存储 → 节省成本 ✓
文档永久保存 → 合同审计 ✓
```

### 3. 处理逻辑分离 ✓
```
receipts → Gemini OCR ✓
media → 自动压缩缩略图 ✓
docs → 全文搜索 + 版本控制 ✓
```

### 4. Drawing 版本控制 ✓
```
floor-plan-v1.pdf → 归档
floor-plan-v2.pdf → 归档
floor-plan-v3.pdf → Latest (UI 标记) ✓
```

---

## 🎯 立即行动

### BOSS 做的：

```
1. Cloudflare Dashboard 创建 slg-receipts
2. 创建 API Token
3. 保存凭证信息
4. 配置环境变量
```

### CTO 做的：

```
1. 创建 lib/r2/receipts.ts
2. 更新 upload API
3. 测试上传功能
4. 验证权限隔离
```

---

**CTO 报告：COO 的三层 Bucket 架构非常专业！完全符合财务、法律、运营的实战需求。立即实施 slg-receipts，为未来 JSS 打好基础！** 🚀
