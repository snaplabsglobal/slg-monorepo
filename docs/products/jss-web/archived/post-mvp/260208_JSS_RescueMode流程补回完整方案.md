# JSS Rescue Mode - 流程补回完整方案

> **文档类型：** 流程修复 + UI完整设计  
> **问题根源：** 缺失"扫描范围选择"步骤  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - 修复信任问题  
> **预计完成：** 1天

---

## 📋 问题诊断

### 用户反馈

```
"还是不能用啊"
"原来不是还问要扫描什么地方，现在怎么不见了？"
```

---

### 根本原因

**❌ 当前实现：**
```
用户点击Rescue Mode
  ↓
系统自动扫描全部历史未确认照片
  ↓
直接显示结果：3个建议job + 77张unknown
  ↓
用户困惑：
  - 什么时候让你扫2021-2022的？
  - 为什么不是最近的？
  - 你是不是只扫了一部分？
  - 这是完整结果吗？
```

**✅ 应该的流程：**
```
用户点击Rescue Mode
  ↓
系统询问：你想从哪里开始扫描？
  ↓
用户选择范围（默认：未归档照片）
  ↓
显示扫描预览：1,160张 / 2021-2022
  ↓
用户确认：Start scan
  ↓
显示结果 + 明确来源
```

---

## 🎯 核心问题

### 1. 用户失去控制感

```
没问我就扫了
→ 不知道扫的是什么
→ 不知道结果是否完整
→ 不敢点Apply
```

---

### 2. Rescue和Organizer边界被打穿

```
用户只是随便点进来
系统却当成：
"用户正在进行严肃的历史数据迁移"

→ 这在工地产品里非常危险
```

---

### 3. Apply & Exit变成"心理恐惧按钮"

```
用户不知道：
- Apply会动哪些照片？
- 是不是全部？
- 会不会把老数据搞乱？

→ 本能地不敢点
```

---

## 🔄 完整流程设计（补回版）

### Step 0：什么时候进Rescue？

**只有这两种情况：**
```
1. 拍照时没选Job（历史遗留）
2. 导入的旧照片没有明确Job归属
```

**⚠️ Rescue不是：**
```
❌ 日常整理工具
❌ 创建Job的主入口
❌ 常驻功能
```

**✅ Rescue是：**
```
修漏网之鱼的安全阀
只在需要时使用
```

---

### Step 1：Rescue Setup（新增页面）

**标题：**
```
Rescue your photo library
```

**副标题：**
```
Fix photos that need attention. 
Nothing will change unless you confirm.
```

---

#### 区块1：Scan Scope（核心）

**问题：**
```
What would you like to scan?
```

**默认选项（推荐）：**
```
✅ Unassigned photos (recommended)
   Photos that are not linked to any job yet
```

**高级选项（默认折叠）：**
```
Advanced options ▼

◯ All photos
   Scan all photos, including ones already in jobs

◯ Photos without location
   Useful for fixing missing addresses

◯ Date range
   Pick a specific time period
```

**⚠️ 注意：**
```
- 这是单选radio，不是多选
- 防止用户组合出复杂mental model
- 90%用户只会选默认 + 点Continue
```

---

#### 按钮：

```
[Continue]  (primary, blue)
[Cancel]    (secondary, gray)
```

---

### Step 2：Scan Preview（新增确认页）

**标题：**
```
Ready to scan
```

**正文（关键信息）：**
```
You're about to scan 1,160 photos
Date range: Jul 2021 – Nov 2022

This is based on your selected scope:
✓ Unassigned photos
```

**安心提示：**
```
💡 Nothing will be changed unless you review 
   and apply suggestions later.
```

**按钮：**
```
[Start scan]     (primary)
[Change scope]   (secondary)
```

---

### Step 3：Scan & Review（改造现有页面）

#### 顶部新增：Scope Strip（常驻）

```
┌─────────────────────────────────────┐
│ Scan scope: Unassigned photos       │
│ Jul 2021 – Nov 2022  [Change]       │
└─────────────────────────────────────┘
```

**作用：**
```
心理锚点
用户随时知道"这是基于什么算出来的"
没有它，用户永远不信下面的结果
```

---

#### Section A：Suggested Jobs（微调）

**标题：**
```
Suggested jobs
```

**副标题：**
```
Based on photo location and time patterns
```

**卡片状态反馈（新增）：**
```
点击"One job"后：
  ✔ Confirmed

底部小字：
  Nothing is applied yet
```

---

#### Section B：Needs Review

**标题：**
```
Needs review
```

**示例：**
```
77 photos
Unknown location

点进去后：
- 允许assign到已有job
- 或Skip for now（明确标记）
```

---

#### 进度显示（新增）

**顶部显示：**
```
Progress: 3/3 jobs confirmed · 77 photos need review

或

Remaining to review: 
  0 clusters + 77 photos
```

---

### Step 4：Apply & Exit（改造逻辑）

#### 当还有未处理项：

```
⚠️ You still have 77 photos that need review
   Please review or skip them before applying.

[Apply & Exit]  (disabled, gray)
```

---

#### 当全部确认/skip后：

```
✓ You're ready to apply your changes.

[Apply & Exit]  (enabled, blue)
[Go to Jobs]    (secondary)
```

---

## 💻 完整UI组件设计

### 页面1：Rescue Setup

```typescript
// app/rescue/setup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ScanScope = 
  | 'unassigned' 
  | 'all' 
  | 'no_location' 
  | 'date_range'

export default function RescueSetupPage() {
  const router = useRouter()
  const [scope, setScope] = useState<ScanScope>('unassigned')
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleContinue() {
    // 将scope传递到preview页面
    router.push(`/rescue/preview?scope=${scope}`)
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          Rescue your photo library
        </h1>
        <p className="text-sm text-gray-600">
          Fix photos that need attention. 
          Nothing will change unless you confirm.
        </p>
      </div>

      {/* Scan Scope */}
      <div className="space-y-4">
        <h2 className="font-semibold">
          What would you like to scan?
        </h2>

        {/* Default option */}
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-blue-500 bg-blue-50 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="unassigned"
            checked={scope === 'unassigned'}
            onChange={(e) => setScope(e.target.value as ScanScope)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold">
              Unassigned photos{' '}
              <span className="text-blue-600 text-sm">
                (recommended)
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Photos that are not linked to any job yet
            </div>
          </div>
        </label>

        {/* Advanced options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {showAdvanced ? '▼' : '▶'} Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-3 pl-6">
            <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === 'all'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">All photos</div>
                <div className="text-sm text-gray-600 mt-1">
                  Scan all photos, including ones already in jobs
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scope"
                value="no_location"
                checked={scope === 'no_location'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">
                  Photos without location
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Useful for fixing missing addresses
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scope"
                value="date_range"
                checked={scope === 'date_range'}
                onChange={(e) => setScope(e.target.value as ScanScope)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">Date range</div>
                <div className="text-sm text-gray-600 mt-1">
                  Pick a specific time period
                </div>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleContinue}
          className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Continue
        </button>
        <button
          onClick={() => router.push('/jobs')}
          className="py-3 px-4 rounded-xl border font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </main>
  )
}
```

---

### 页面2：Scan Preview

```typescript
// app/rescue/preview/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type PreviewData = {
  photo_count: number
  date_range: { min: string; max: string }
  scope_label: string
}

export default function RescuePreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scope = searchParams.get('scope') || 'unassigned'

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PreviewData | null>(null)

  useEffect(() => {
    // Fetch preview data
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/rescue/preview?scope=${scope}`
        )
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [scope])

  if (loading || !data) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  function handleStartScan() {
    // 开始扫描
    router.push(`/rescue/scan?scope=${scope}`)
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ready to scan</h1>
      </div>

      {/* Preview Info */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="text-lg">
          You're about to scan{' '}
          <b className="font-bold">{data.photo_count}</b> photos
        </div>

        <div className="text-sm text-gray-600">
          Date range:{' '}
          {new Date(data.date_range.min).toLocaleDateString()} –{' '}
          {new Date(data.date_range.max).toLocaleDateString()}
        </div>

        <div className="pt-3 border-t">
          <div className="text-sm text-gray-600">
            This is based on your selected scope:
          </div>
          <div className="font-semibold mt-1">
            ✓ {data.scope_label}
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="rounded-xl bg-blue-50 p-4">
        <div className="text-sm text-blue-900">
          💡 Nothing will be changed unless you review and 
          apply suggestions later.
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleStartScan}
          className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Start scan
        </button>
        <button
          onClick={() => router.push('/rescue/setup')}
          className="py-3 px-4 rounded-xl border font-semibold hover:bg-gray-50"
        >
          Change scope
        </button>
      </div>
    </main>
  )
}
```

---

### 页面3：Scan & Review（改造）

**关键改动点：**

#### 1. 添加Scope Strip

```typescript
// 在现有/rescue页面顶部添加

function ScopeStrip({ scope, onChangeScope }: {
  scope: string
  onChangeScope: () => void
}) {
  return (
    <div className="rounded-xl border bg-gray-50 p-3 flex items-center justify-between">
      <div className="text-sm">
        <span className="text-gray-600">Scan scope:</span>{' '}
        <span className="font-semibold">Unassigned photos</span>
        <span className="text-gray-600"> · </span>
        <span className="font-semibold">Jul 2021 – Nov 2022</span>
      </div>
      <button
        onClick={onChangeScope}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        Change
      </button>
    </div>
  )
}
```

---

#### 2. 添加进度显示

```typescript
function ProgressSummary({ 
  confirmedJobs, 
  totalJobs, 
  unreviewedPhotos 
}: {
  confirmedJobs: number
  totalJobs: number
  unreviewedPhotos: number
}) {
  const allConfirmed = confirmedJobs === totalJobs && 
                       unreviewedPhotos === 0

  return (
    <div className="rounded-xl border p-4">
      {allConfirmed ? (
        <div className="text-green-600 font-semibold">
          ✓ You're ready to apply your changes
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Remaining to review:
          </div>
          <div className="font-semibold">
            {totalJobs - confirmedJobs} clusters + 
            {unreviewedPhotos} photos
          </div>
        </div>
      )}
    </div>
  )
}
```

---

#### 3. Apply按钮逻辑

```typescript
function ApplyButton({ 
  canApply, 
  onApply 
}: {
  canApply: boolean
  onApply: () => void
}) {
  return (
    <div className="space-y-3">
      {!canApply && (
        <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">
          ⚠️ You still have items that need review. 
          Please review or skip them before applying.
        </div>
      )}
      
      <button
        onClick={onApply}
        disabled={!canApply}
        className={[
          'w-full py-3 px-4 rounded-xl font-semibold',
          canApply
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        ].join(' ')}
      >
        Apply & Exit
      </button>
    </div>
  )
}
```

---

## 🔌 API改造

### 新增：GET /api/rescue/preview

```typescript
// app/api/rescue/preview/route.ts

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/app/lib/auth/getOrganizationId'

export async function GET(req: Request) {
  let supabase, organization_id
  
  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Unauthorized' },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'unassigned'

  // 根据scope构建查询
  let query = supabase
    .from('job_photos')
    .select('taken_at', { count: 'exact' })
    .eq('organization_id', organization_id)
    .is('deleted_at', null)

  switch (scope) {
    case 'unassigned':
      query = query.is('job_id', null)
      break
    case 'all':
      // 不加过滤
      break
    case 'no_location':
      query = query.or('temp_lat.is.null,temp_lng.is.null')
      break
    // date_range需要额外参数
  }

  const { count, data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // 计算date range
  const dates = (data ?? [])
    .map(p => p.taken_at)
    .filter(Boolean)
    .sort()

  const scopeLabels = {
    unassigned: 'Unassigned photos',
    all: 'All photos',
    no_location: 'Photos without location',
    date_range: 'Custom date range'
  }

  return NextResponse.json({
    photo_count: count ?? 0,
    date_range: {
      min: dates[0] || null,
      max: dates[dates.length - 1] || null
    },
    scope_label: scopeLabels[scope as keyof typeof scopeLabels],
    scope
  })
}
```

---

## 📝 关键文案规范

### 必须反复出现的4句话

**在不同位置重复这些"信任建立器"：**

```
1. "Nothing will change unless you confirm"
   → Setup页、Preview页、Review页

2. "Suggestions only"
   → Review页的每个section

3. "Based on selected scan scope"
   → Review页顶部

4. "You can skip and come back later"
   → Review页底部
```

---

### 状态文案

| 状态 | 文案 |
|------|------|
| 未开始 | Ready to scan 1,160 photos |
| 扫描中 | Scanning... |
| 有未处理项 | You still have 77 photos that need review |
| 可以Apply | You're ready to apply your changes |
| Apply完成 | Rescue completed ✓ |

---

## ⏱️ 实施步骤

### Phase 1：最小可上线版（1天）

```
☐ 新建Setup页面（只有默认选项）
☐ 新建Preview页面
☐ 添加Scope Strip到Review页
☐ 添加进度显示
☐ 改造Apply按钮逻辑
☐ 添加/api/rescue/preview
```

---

### Phase 2：高级选项（可选）

```
☐ 添加All photos选项
☐ 添加Photos without location选项
☐ 添加Date range picker
☐ 记忆用户上次选择
```

---

## ✅ 验收标准

### 功能验收

```
☐ Setup页面正常显示
☐ 默认选中"Unassigned photos"
☐ Continue跳转到Preview
☐ Preview显示正确数量和日期
☐ Start scan开始扫描
☐ Review页顶部显示Scope Strip
☐ Change按钮返回Setup
☐ 进度正确计算
☐ Apply按钮状态正确
☐ 有未处理项时Apply disabled
```

---

### 用户体验验收

```
☐ 用户知道"正在扫描什么"
☐ 用户知道"扫描范围"
☐ 用户知道"结果来源"
☐ 用户不怕点Apply
☐ 用户能理解进度
☐ 用户能随时改变scope
```

---

### 文案验收

```
☐ 无"自动"、"AI决定"等词
☐ 每页都有"Nothing changes unless..."
☐ Apply前有明确确认
☐ 错误信息友好
```

---

## 🚫 常见错误避免

### 错误1：Setup页太复杂

**❌ 错误：**
```
添加10个选项
添加多选
添加保存配置
```

**✅ 正确：**
```
只有1个默认选项
高级选项默认折叠
不记忆配置（每次都问）
```

---

### 错误2：Preview页可跳过

**❌ 错误：**
```
Setup → 直接跳到Review
用户不知道扫了什么
```

**✅ 正确：**
```
Setup → Preview → Review
Preview不可跳过
给用户最后确认机会
```

---

### 错误3：Scope Strip太小

**❌ 错误：**
```
把scope信息藏在设置里
或者只在hover时显示
```

**✅ 正确：**
```
常驻在Review页顶部
清晰可见
随时可以Change
```

---

## 💬 用户心理模型

### 理想的用户理解

```
"我选了扫哪些照片"
→ 系统扫了这些
→ 给了我建议
→ 我confirm了一些
→ 我skip了一些
→ 我点Apply
→ 系统只动了我confirm的那些
```

**这是完整的、可信的心理模型**

---

### 避免的误解

```
❌ "系统自己决定扫什么"
❌ "不知道Apply会动哪些"
❌ "可能会搞乱我的数据"
❌ "Rescue是个黑箱"
```

---

## 📊 成功指标

### 定量指标

```
✓ Setup → Preview完成率 > 90%
✓ Preview → Scan完成率 > 85%
✓ Scan → Apply完成率 > 70%
✓ 平均完成时间 < 5分钟
```

---

### 定性指标

```
✓ 用户不再问"为什么只有这些"
✓ 用户不再怕点Apply
✓ 用户理解scope概念
✓ 用户能独立完成流程
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** 前端 + 后端团队  
**生效日期：** 立即生效  
**预计完成：** 1天（MVP）

---

**从"黑箱自动扫描"到"用户主导的救援流程"！** 🎯
