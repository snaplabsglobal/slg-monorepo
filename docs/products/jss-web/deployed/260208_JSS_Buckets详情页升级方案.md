# JSS Photo Organizer - Buckets详情页升级方案（最终版）

> **文档类型：** 页面升级方案 + 完整代码  
> **关联文档：** Review页面完整实现方案  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - 核心功能  
> **预计完成：** 1小时

---

## 📋 一句话执行指令

```
升级/rescue/buckets/[bucketId]详情页
从"灰块占位"变成"真实缩略图 + Load more"
去掉≈符号，显示精确数量
不引入新store，完全符合现有架构
```

---

## 🎯 核心目标

### 解决的问题

```
❌ 问题1：显示灰块占位，不可信
❌ 问题2：1000张照片直接渲染卡死
❌ 问题3：≈360 photos让人怀疑系统编数据
❌ 问题4：无法滚动加载
❌ 问题5：bucket.photoIds明明有完整列表却不用
```

**✅ 解决方案：**
```
✓ 真实缩略图（thumbnail_url）
✓ 分批加载（60张一批，按bucket.photoIds切片）
✓ 精确数量（total = bucket.photoIds.length）
✓ Load more按钮 + 骨架屏
✓ Session-based auth（不需要URL传org_id）
```

---

## 📐 路由架构澄清（重要）

### 两条路由的职责区别

**路由1：/rescue/buckets/[bucketId]（本文档要升级的）**
```
职责：建议Job分组的确认页
来源：后端聚类算法生成的job建议
数据源：bucket.photoIds（明确的id列表）
用户操作：
  - 确认为一个job
  - 重命名job
  - 返回修改
数据结构：useRescueStore中的buckets数组
```

**路由2：/rescue/review/[bucket]（另一份文档）**
```
职责：过滤照片的复核页
类型：unknownLocation / geocodeFailed / likelyPersonal / unsure
数据源：动态查询（按effective classification过滤）
用户操作：
  - Mark as jobsite
  - Mark as personal
  - Assign to job
数据结构：直接查询数据库，不依赖store
```

### 关键区别

```
buckets路由 = 正向归类（这些照片属于同一个job）
review路由  = 负向过滤（这些照片需要人工复核）

buckets = 前端已知photoIds列表 → 切片fetch缩略图
review  = 后端cursor分页 → 动态查询过滤
```

---

## 💻 完整实施方案

### 1. 新增API：批量获取缩略图

```typescript
// apps/jss-web/app/api/rescue/buckets/photos/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

type Body = {
  photo_ids: string[]
}

export async function POST(req: Request) {
  const supabase = createClient()

  // Session-based auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    )
  }

  // Get org from membership
  const { data: membership, error: memErr } = 
    await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

  if (memErr || !membership?.organization_id) {
    return NextResponse.json(
      { error: 'No organization membership' },
      { status: 403 }
    )
  }

  // Parse body
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const ids = Array.isArray(body.photo_ids) 
    ? body.photo_ids 
    : []
    
  if (ids.length < 1 || ids.length > 200) {
    return NextResponse.json(
      { error: 'photo_ids must be 1..200' },
      { status: 400 }
    )
  }

  // Fetch photos
  const { data, error } = await supabase
    .from('job_photos')
    .select('id,thumbnail_url,file_url,taken_at,created_at')
    .eq('organization_id', membership.organization_id)
    .in('id', ids)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  // 保持与请求ids相同顺序
  const byId = new Map(
    (data ?? []).map((p: any) => [p.id, p])
  )
  
  const items = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      thumbnail_url: p.thumbnail_url ?? null,
      file_url: p.file_url,
      taken_at: p.taken_at,
      created_at: p.created_at,
    }))

  return NextResponse.json({ items })
}
```

---

### 2. 升级Buckets详情页

```typescript
// apps/jss-web/app/rescue/buckets/[bucketId]/page.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'

type PhotoThumb = {
  id: string
  thumbnail_url: string | null
  file_url: string
  taken_at: string
}

async function fetchPhotoThumbs(photoIds: string[]) {
  const res = await fetch('/api/rescue/buckets/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_ids: photoIds }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ items: PhotoThumb[] }>
}

export default function BucketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bucketId = params.bucketId as string

  const buckets = useRescueStore((s) => s.buckets)
  const groupNames = useRescueStore((s) => s.groupNames)
  const bucket = buckets.find((b) => b.bucketId === bucketId)

  const displayName = useMemo(() => {
    if (!bucket) return ''
    return groupNames[bucketId] || 
           bucket.suggestedLabel || 
           `Job ${bucketId.slice(-4)}`
  }, [bucket, groupNames, bucketId])

  // Pagination (切片ids → fetch缩略图)
  const BATCH = 60
  const allIds = bucket?.photoIds ?? []
  const total = allIds.length

  const [loadedCount, setLoadedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PhotoThumb[]>([])
  const [err, setErr] = useState<string | null>(null)

  // Reset when bucket changes
  useEffect(() => {
    setLoadedCount(0)
    setItems([])
    setErr(null)
  }, [bucketId])

  const hasMore = loadedCount < total

  async function loadMore() {
    if (!bucket || loading) return
    if (!hasMore) return

    try {
      setLoading(true)
      setErr(null)

      const nextIds = allIds.slice(
        loadedCount, 
        loadedCount + BATCH
      )
      const r = await fetchPhotoThumbs(nextIds)

      // 合并并去重
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id))
        const merged = [...prev]
        for (const it of r.items) {
          if (!seen.has(it.id)) merged.push(it)
        }
        return merged
      })

      setLoadedCount((c) => c + nextIds.length)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (!bucket) return
    if (total === 0) return
    
    // 首屏自动拉一批
    if (loadedCount === 0 && 
        items.length === 0 && 
        !loading) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket?.bucketId, total])

  if (!bucket) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center text-gray-500">
          Job not found
        </div>
        <button
          className="rounded-xl border px-4 py-2"
          onClick={() => router.push('/rescue/buckets')}
        >
          Back to jobs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          {displayName}
        </h1>
        <div className="mt-1 text-sm text-gray-500">
          {total} photos
          <span className="mx-2">·</span>
          Loaded {items.length}
        </div>
        {err && (
          <div className="mt-2 text-sm text-red-600">
            {err}
          </div>
        )}
      </div>

      {/* Grid - 真实缩略图 */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {items.map((p) => {
          const src = p.thumbnail_url ?? p.file_url
          return (
            <div
              key={p.id}
              className="aspect-square overflow-hidden rounded-lg bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )
        })}

        {/* Skeletons while loading more */}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`sk_${i}`}
              className="aspect-square rounded-lg bg-gray-200"
            />
          ))}
      </div>

      {/* Load More */}
      <div>
        {hasMore ? (
          <button
            className="w-full rounded-xl border px-6 py-4 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          <div className="text-center text-xs text-gray-500">
            No more photos
          </div>
        )}
      </div>

      {/* Confirm buttons (保持原有流程) */}
      <button
        className="w-full rounded-xl bg-gray-900 px-6 py-4 text-white"
        onClick={() => {
          useRescueStore
            .getState()
            .setGroupNamingState(
              bucketId,
              NamingState.USER_CONFIRMED
            )
          router.push('/rescue/buckets')
        }}
      >
        ✓ Yes, this is one job
      </button>

      <button
        className="w-full rounded-xl border px-6 py-4"
        onClick={() => router.push('/rescue/buckets')}
      >
        Go back
      </button>
    </div>
  )
}
```

---

## 🔑 核心设计要点

### 1. 分页策略：切片 + 批量获取

```typescript
// 不是传统的offset/cursor
// 而是"前端已知全量ids，按需切片fetch"

const allIds = bucket.photoIds  // 例如1000个id
const BATCH = 60

// 第一批
const batch1 = allIds.slice(0, 60)
fetchPhotoThumbs(batch1)

// 第二批
const batch2 = allIds.slice(60, 120)
fetchPhotoThumbs(batch2)
```

**优势：**
```
✓ 不需要后端维护cursor
✓ 前端完全控制顺序
✓ 可以随机跳页（如果需要）
✓ 与现有bucket数据结构完美兼容
```

---

### 2. 去掉≈符号

**❌ 之前：**
```tsx
<div>≈ {bucket.photoIds.length} photos</div>
```

**✅ 现在：**
```tsx
<div>
  {total} photos
  <span className="mx-2">·</span>
  Loaded {items.length}
</div>
```

**效果：**
```
- 精确数量
- 明确已加载多少
- 不再有模糊符号
```

---

### 3. 真实缩略图渲染

**❌ 之前：**
```tsx
<div className="bg-gray-300" />  // 灰块占位
```

**✅ 现在：**
```tsx
<img
  src={thumbnail_url ?? file_url}
  alt=""
  className="h-full w-full object-cover"
/>
```

---

### 4. Loading骨架屏

```tsx
{loading &&
  Array.from({ length: 12 }).map((_, i) => (
    <div
      key={`sk_${i}`}
      className="aspect-square rounded-lg bg-gray-200"
    />
  ))}
```

**效果：**
```
- 用户知道"正在加载更多"
- 不会突然跳变
- 保持网格对齐
```

---

## 🔒 数据安全保证

### Session-based权限

```
用户请求
  ↓
auth.getUser() → user.id
  ↓
organization_members → org_id
  ↓
job_photos.where(org_id) + RLS
  ↓
只返回该org的照片
```

---

### 顺序保证

```typescript
// API保持与请求ids相同顺序
const byId = new Map(data.map(p => [p.id, p]))
const items = ids
  .map(id => byId.get(id))
  .filter(Boolean)
  .map(p => ({ ... }))
```

**效果：**
```
前端切片顺序 = bucket.photoIds顺序
不会乱序
```

---

## ⏱️ 实施步骤（1小时完成）

### Step 1：新增批量获取API（15分钟）

```
☐ 创建 app/api/rescue/buckets/photos/route.ts
☐ 实现session-based auth（不需要org参数）
☐ 批量查询job_photos（最多200个id）
☐ 保持与请求ids相同顺序返回
```

**⚠️ 关键点：路径对齐**
```typescript
// 最常见错误：createClient路径不对
// 检查你们项目的实际路径

// 可能的正确路径：
import { createClient } from '@/app/lib/supabase/server'
// 或
import { createClient } from '@/lib/supabase/server'
// 或相对路径
import { createClient } from '../../../../lib/supabase/server'
```

---

### Step 2：升级页面组件（30分钟）

```
☐ 修改 app/rescue/buckets/[bucketId]/page.tsx
☐ 添加fetchPhotoThumbs函数
☐ 添加分页state（loadedCount/items/hasMore）
☐ 实现loadMore逻辑（按bucket.photoIds切片）
☐ 替换灰块为真实<img>
☐ 添加骨架屏（loading时显示）
☐ 去掉≈符号
☐ 保持原有store流程（NamingState等）
```

**⚠️ 关键点：import对齐**
```typescript
// 检查你们项目的实际结构
import { useRescueStore } from '@/lib/rescue'
import { NamingState } from '@/lib/rescue/types'

// 如果@/lib不通，改用相对路径
import { useRescueStore } from '../../../../lib/rescue'
```

---

### Step 3：测试验收（15分钟）

```
☐ 打开任意bucket详情页
☐ 验证首屏自动加载60张
☐ 验证显示真实缩略图
☐ 点击Load more
☐ 验证不重复加载
☐ 验证顺序与bucket.photoIds一致
☐ 验证加载完显示"No more photos"
☐ 验证"Yes, this is one job"按钮功能正常
☐ 验证精确数量显示（无≈）
```

**常见报错排查：**
```
❌ Cannot find module '@/app/lib/supabase/server'
→ 检查tsconfig.json的paths配置
→ 或改用相对路径

❌ Cannot find module '@/lib/rescue'
→ 检查实际文件位置
→ 或改用相对路径

❌ RLS policy denied
→ 检查organization_members表
→ 确认user有对应org membership
```

**总计：1小时**

---

## ✅ 验收标准

### 功能验收

```
☐ 首屏自动加载60张
☐ 显示真实缩略图（不是灰块）
☐ Load more按钮正常
☐ 不重复加载
☐ 顺序与bucket.photoIds一致
☐ 加载完显示"No more photos"
☐ 错误时显示错误信息
☐ 确认按钮功能正常
```

---

### UI验收

```
☐ 缩略图清晰可见
☐ 网格对齐
☐ 骨架屏流畅
☐ 无横向滚动
☐ Mobile友好
☐ 数量显示精确（无≈）
```

---

### 性能验收

```
☐ 1000张照片不卡顿
☐ Load more响应<500ms
☐ 内存占用合理
☐ 图片懒加载（可选）
```

---

## 🚫 常见错误避免

### 错误1：忘记去重

**❌ 错误：**
```typescript
setItems(prev => [...prev, ...r.items])
```

**✅ 正确：**
```typescript
setItems(prev => {
  const seen = new Set(prev.map(x => x.id))
  const merged = [...prev]
  for (const it of r.items) {
    if (!seen.has(it.id)) merged.push(it)
  }
  return merged
})
```

---

### 错误2：不保持顺序

**❌ 错误：**
```typescript
// 直接返回DB查询结果（可能乱序）
return NextResponse.json({ items: data })
```

**✅ 正确：**
```typescript
// 按请求ids顺序返回
const byId = new Map(data.map(p => [p.id, p]))
const items = ids.map(id => byId.get(id)).filter(Boolean)
return NextResponse.json({ items })
```

---

### 错误3：首屏不自动加载

**❌ 错误：**
```typescript
// 需要用户手动点Load more
```

**✅ 正确：**
```typescript
// 首屏自动加载
useEffect(() => {
  if (loadedCount === 0 && items.length === 0) {
    loadMore()
  }
}, [bucket?.bucketId, total])
```

---

## 📊 效果对比

### 之前

```
❌ 显示灰块占位
❌ ≈360 photos（模糊）
❌ 滚动到底就没了
❌ 1000张直接卡死
```

---

### 现在

```
✅ 真实缩略图
✅ 360 photos · Loaded 60（精确）
✅ Load more按钮
✅ 60张一批流畅加载
```

---

## 🎨 可选增强（不阻塞上线）

### 增强1：日期范围显示

```tsx
<div className="text-sm text-gray-500">
  {total} photos · {dateRange}
</div>
```

**需要：**
```
- API返回min/max taken_at
- 或前端从items计算
```

---

### 增强2：图片懒加载

```tsx
<img
  src={src}
  loading="lazy"
  alt=""
  className="..."
/>
```

**效果：**
```
- 节省带宽
- 提升性能
- 浏览器原生支持
```

---

### 增强3：虚拟滚动

```
使用react-window或react-virtual
在1万+照片时仍然流畅
```

**当前不需要：**
```
- 单个bucket通常<500张
- 分批加载已足够流畅
```

---

## 💬 路径问题排查

### 如果遇到import错误

**问题：**
```
Cannot find module '@/app/lib/supabase/server'
```

**解决：**
```typescript
// 检查tsconfig.json的paths配置
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}

// 或使用相对路径
import { createClient } from '../../../../lib/supabase/server'
```

---

### 如果遇到useRescueStore错误

**问题：**
```
Cannot find module '@/lib/rescue'
```

**解决：**
```typescript
// 查看实际路径
apps/jss-web/lib/rescue/index.ts

// 修改import
import { useRescueStore } from '@/lib/rescue'
// 或
import { useRescueStore } from '../../../../lib/rescue'
```

---

## 📝 最后检查清单

### 文件清单

```
☐ app/api/rescue/buckets/photos/route.ts (新建)
☐ app/rescue/buckets/[bucketId]/page.tsx (修改)
```

---

### 代码清单

```
☐ POST /api/rescue/buckets/photos 实现
☐ fetchPhotoThumbs 函数
☐ 分页state和逻辑
☐ 真实缩略图渲染
☐ Load more按钮
☐ 骨架屏
☐ 去掉≈符号
```

---

### 测试清单

```
☐ 打开任意bucket详情页
☐ 验证真实缩略图
☐ 验证Load more
☐ 验证精确数量
☐ 验证confirm功能
```

---

## 🔗 与Review页面的关系

### 两个页面并行存在，解决不同问题

**Buckets详情页（本文档）：**
```
路由：/rescue/buckets/[bucketId]
目的：确认"这些照片是同一个job"
数据：bucket.photoIds（后端聚类生成）
流程：预览照片 → 确认/重命名 → 创建job
特点：前端已知完整id列表
```

**Review详情页（另一份文档）：**
```
路由：/rescue/review/[bucket]
目的：复核"被过滤的照片"
类型：unknownLocation / likelyPersonal / unsure
流程：查看照片+原因 → Mark分类 → 写回数据库
特点：后端动态查询，cursor分页
```

### 用户旅程

```
1. Rescue首页
   ↓
2. 看到job suggestions（来自buckets）
   → 点击进入 /rescue/buckets/[id]
   → 确认或重命名
   
3. 看到review buckets（unknownLocation等）
   → 点击进入 /rescue/review/unknownLocation
   → 标记personal或jobsite
```

### 技术对比

| 维度 | Buckets详情页 | Review详情页 |
|------|--------------|-------------|
| 数据源 | useRescueStore | API直接查询 |
| 分页方式 | 切片photoIds | cursor分页 |
| 用户操作 | 确认job | 标记分类 |
| 写回 | store状态 | POST /mark |
| ID来源 | 前端已知 | 后端过滤 |

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CTO  
**执行人：** 前端团队  
**生效日期：** 立即生效  
**预计完成：** 1小时

---

**从"灰块占位"到"真实可信"！** 🎯
