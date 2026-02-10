# JSS Rescue Mode - 三态逻辑与产品改造方案

> **文档类型：** 产品改造 + 完整组件  
> **关联文档：** Photo Organizer数据问题诊断方案  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - 产品态度转变  
> **预计完成：** 2小时

---

## 📋 一句话执行指令

```
移除"Coming Soon"占位符
改名为"Rescue Mode"
实现三态逻辑：All good / Active / Resolved
从"功能介绍页"变成"状态感知的安全阀"
```

---

## 🎯 核心产品转变

### 从"功能"到"系统请求"

**❌ 之前的态度：**
```
页面名：Photo Organizer
文案：Organize and manage photos across all jobs
      Create Evidence Sets, apply bulk tags...
状态：Coming Soon（占位符）

→ 这是"我给你工具"
```

**✅ 现在的态度：**
```
页面名：Rescue Mode
文案：Fix photos that need attention
      Nothing changes unless you confirm.
状态：三态（Inactive / Active / Resolved）

→ 这是"系统请你帮忙"
```

---

### 产品哲学转变

```
不是：常驻的管理页面
而是：只在需要时出现的安全阀

不是：用户主动去"整理"
而是：系统发现问题，请求协助

不是：永远显示"Coming Soon"
而是：90%时间显示"All good"
```

---

## 🔄 三态逻辑设计

### State A：Inactive（无需处理）

**触发条件：**
```typescript
hasRescueItems === false

即：
- unknownLocation.count === 0
- geocodeFailed.count === 0
- lowAccuracy.count === 0
- likelyPersonal.count === 0
- unsure.count === 0
```

**UI显示：**
```
┌─────────────────────────────┐
│                             │
│      All good 👍            │
│                             │
│  No photos need attention   │
│  right now.                 │
│                             │
│  [Go to Jobs] [Go to Camera]│
│                             │
└─────────────────────────────┘
```

**预期：**
```
90%的时间应该处于这个状态
用户看到后立刻知道"没问题"
不需要进一步操作
```

---

### State B：Active（有需处理）

**触发条件：**
```typescript
hasRescueItems === true

即：任何bucket count > 0
```

**UI显示：**
```
┌─────────────────────────────┐
│ Needs review                │
│ 240 photos                  │
│                             │
│ ► Unknown location     (840)│
│ ► Geocode failed       (40) │
│ ► Low accuracy         (20) │
│ ► Likely personal      (80) │
│ ► Unsure              (120) │
│                             │
│ Finish                      │
│ When you're done reviewing, │
│ you can exit Rescue Mode.   │
│                             │
│ [Go to Jobs] [Apply & Exit] │
└─────────────────────────────┘
```

**预期：**
```
用户点击bucket进入review页面
处理1-2分钟
点击"Apply & Exit"
```

---

### State C：Resolved（刚处理完）

**触发条件：**
```typescript
resolvedFlash === true

即：用户刚点了"Apply & Exit"
```

**UI显示：**
```
┌─────────────────────────────┐
│                             │
│  Rescue completed ✓         │
│                             │
│  You're all set.            │
│                             │
│  [Go to Jobs] [Go to Camera]│
│                             │
└─────────────────────────────┘
```

**行为：**
```
显示900ms
自动refresh summary
回到Inactive或Active（取决于是否还有项）
```

---

## 💻 完整React组件实现

### 类型定义

```typescript
// apps/jss-web/app/organizer/page.tsx
// (或改名后的 /rescue 路由)

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RescueSummaryResponse = {
  sampled: boolean
  sample_limit: number
  summary: {
    total_photos_scanned: number
    likely_jobsite_count: number
    likely_personal_count: number
    unsure_count: number
    unknown_location_count: number
    low_accuracy_count: number
    geocode_failed_count: number
  }
  buckets: {
    unknownLocation: { count: number }
    geocodeFailed: { count: number }
    lowAccuracy: { count: number }
    likelyPersonal: { count: number }
    unsure: { count: number }
  }
  capabilities: {
    geocode_is_proxy: boolean
    suggestions_based_on_job_id: boolean
  }
}

type PageState = 'inactive' | 'active' | 'resolved'
```

---

### 主组件

```typescript
async function fetchRescueSummary(): 
  Promise<RescueSummaryResponse> {
  const res = await fetch(
    '/api/rescue/summary', 
    { method: 'GET' }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function RescueModePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<RescueSummaryResponse | null>(null)

  // "刚处理完"的短暂态
  const [resolvedFlash, setResolvedFlash] = useState(false)

  // 初次加载
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const r = await fetchRescueSummary()
        if (!cancelled) setData(r)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 计算：是否有需要处理的项
  const hasRescueItems = useMemo(() => {
    if (!data) return false
    const b = data.buckets
    return (
      (b.unknownLocation?.count ?? 0) > 0 ||
      (b.geocodeFailed?.count ?? 0) > 0 ||
      (b.lowAccuracy?.count ?? 0) > 0 ||
      (b.likelyPersonal?.count ?? 0) > 0 ||
      (b.unsure?.count ?? 0) > 0
    )
  }, [data])

  // 页面状态
  const pageState: PageState = useMemo(() => {
    if (resolvedFlash) return 'resolved'
    return hasRescueItems ? 'active' : 'inactive'
  }, [resolvedFlash, hasRescueItems])

  // Apply & Exit 行为
  async function onApplyAndExit() {
    setResolvedFlash(true)
    
    // 可选：调用 /api/rescue/resolve 
    // 记录 last_resolved_at
    
    setTimeout(async () => {
      setResolvedFlash(false)
      try {
        setLoading(true)
        const r = await fetchRescueSummary()
        setData(r)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 900)
  }

  // Loading状态
  if (loading) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">
          Rescue Mode
        </h1>
        <div className="mt-2 text-sm text-gray-500">
          Loading…
        </div>
      </main>
    )
  }

  // Error状态
  if (err || !data) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">
          Rescue Mode
        </h1>
        <div className="text-sm text-red-600">
          {err ?? 'Failed'}
        </div>
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => location.reload()}
        >
          Retry
        </button>
      </main>
    )
  }

  const sampledNote = data.sampled 
    ? `Computed from latest ${data.sample_limit} photos` 
    : null
    
  const geocodeNote = data.capabilities.geocode_is_proxy
    ? 'Address status is estimated from available metadata.'
    : null

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          Rescue Mode
        </h1>
        <p className="text-sm text-gray-500">
          Fix photos that need attention. 
          Nothing changes unless you confirm.
        </p>

        {sampledNote && (
          <div className="text-xs text-gray-500">
            {sampledNote}
          </div>
        )}
        {geocodeNote && (
          <div className="text-xs text-gray-500">
            {geocodeNote}
          </div>
        )}
      </div>

      {/* State: RESOLVED */}
      {pageState === 'resolved' && (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <div className="text-lg font-semibold">
            Rescue completed ✓
          </div>
          <div className="mt-2 text-sm text-gray-500">
            You're all set.
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
              onClick={() => router.push('/jobs')}
            >
              Go to Jobs
            </button>
            <button
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
              onClick={() => router.push('/camera')}
            >
              Go to Camera
            </button>
          </div>
        </div>
      )}

      {/* State: INACTIVE */}
      {pageState === 'inactive' && (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <div className="text-lg font-semibold">
            All good 👍
          </div>
          <div className="mt-2 text-sm text-gray-500">
            No photos need attention right now.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
              onClick={() => router.push('/jobs')}
            >
              Go to Jobs
            </button>
            <button
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
              onClick={() => router.push('/camera')}
            >
              Go to Camera
            </button>
          </div>
        </div>
      )}

      {/* State: ACTIVE */}
      {pageState === 'active' && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-500">
              Needs review
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {data.buckets.unknownLocation.count +
                data.buckets.geocodeFailed.count +
                data.buckets.lowAccuracy.count +
                data.buckets.likelyPersonal.count +
                data.buckets.unsure.count}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <BucketRow
                label="Unknown location"
                count={data.buckets.unknownLocation.count}
                onClick={() => 
                  router.push('/rescue/review/unknownLocation')
                }
              />
              <BucketRow
                label="Geocode failed"
                count={data.buckets.geocodeFailed.count}
                onClick={() => 
                  router.push('/rescue/review/geocodeFailed')
                }
              />
              <BucketRow
                label="Low accuracy"
                count={data.buckets.lowAccuracy.count}
                onClick={() => 
                  router.push('/rescue/review/lowAccuracy')
                }
              />
              <BucketRow
                label="Likely personal"
                count={data.buckets.likelyPersonal.count}
                onClick={() => 
                  router.push('/rescue/review/likelyPersonal')
                }
              />
              <BucketRow
                label="Unsure"
                count={data.buckets.unsure.count}
                onClick={() => 
                  router.push('/rescue/review/unsure')
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-500">
              Finish
            </div>
            <div className="mt-2 text-sm text-gray-700">
              When you're done reviewing, 
              you can exit Rescue Mode.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                onClick={() => router.push('/jobs')}
              >
                Go to Jobs
              </button>
              <button
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
                onClick={onApplyAndExit}
              >
                Apply & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// Bucket行组件
function BucketRow({
  label,
  count,
  onClick,
}: {
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-sm text-gray-600">{count}</div>
    </button>
  )
}
```

---

## 📐 左侧导航改造

### 名字变更

**❌ 之前：**
```
Photo Organizer
```

**✅ 现在：**
```
Rescue Mode
```

---

### Badge逻辑

```typescript
// 在左侧导航组件中

const hasRescueItems = useMemo(() => {
  // 从summary API获取
  // 或从全局状态读取
  return rescueSummary?.hasItems ?? false
}, [rescueSummary])

// 渲染
<NavItem 
  label="Rescue Mode" 
  href="/organizer"
  badge={hasRescueItems ? '●' : null}
  badgeColor="orange"  // 低调一点
/>
```

**效果：**
```
当有需要处理的项：
  Rescue Mode ●

当没有需要处理的项：
  Rescue Mode
```

**关键：**
```
- 不要太刺眼（不用红色）
- 不显示具体数字
- 入口永远存在（不隐藏）
```

---

## 📊 测试期观察指标

### ✅ 好信号（成功）

```
1. 用户只在badge出现时点Rescue
   → 说明：用户理解了"按需使用"

2. 进去1-2分钟就处理完
   → 说明：问题明确，操作简单

3. 然后很久不再回来
   → 说明：系统稳定，不会反复出问题
```

**这是Rescue Mode的理想状态**

---

### ⚠️ 警惕信号（需要调整）

```
1. 用户反复点Rescue
   → 说明：用户不确定是否需要处理

2. 每次都有一堆问题
   → 说明：AI分类阈值需要调整

3. 永远"清不干净"
   → 说明：过滤规则太严格
   → 或者系统在制造问题而非解决问题
```

**这些是系统问题，不是UI问题**

---

### 观察方法

**记录这些指标：**
```sql
-- 进入次数
SELECT count(*) 
FROM rescue_mode_sessions
WHERE entered_at > now() - interval '7 days'

-- 平均停留时间
SELECT avg(duration_seconds)
FROM rescue_mode_sessions
WHERE completed_at IS NOT NULL

-- 问题数量趋势
SELECT date, avg(item_count)
FROM rescue_mode_sessions
GROUP BY date
ORDER BY date DESC
LIMIT 30
```

**预期值：**
```
进入次数：每周1-2次
平均停留：1-3分钟
问题数量：逐渐减少（系统学习）
```

---

## 🔑 关键设计原则

### 1. 不要主动"激活"Rescue Mode

**❌ 错误：**
```
页面顶部显示：
"You have 240 photos to review!"
[Start Rescue Mode]
```

**✅ 正确：**
```
左侧导航badge：●
用户主动点击进入
看到状态后决定是否处理
```

---

### 2. 不要让用户"关闭"Rescue Mode

**❌ 错误：**
```
[ ] Enable Rescue Mode
Settings > Turn off Rescue Mode
```

**✅ 正确：**
```
Rescue Mode永远存在
只是根据数据决定显示哪个状态
用户无需"开关"
```

---

### 3. 90%时间显示"All good"

**关键：**
```
Rescue Mode不是常驻功能
而是偶尔需要的安全阀

如果用户每次打开都看到一堆问题
→ 说明系统有问题，不是用户懒
```

---

## ⏱️ 实施步骤

### Step 1：改名（5分钟）

```
☐ 左侧导航：Photo Organizer → Rescue Mode
☐ 页面标题：同上
☐ 副标题：Fix photos that need attention
☐ 移除Coming Soon占位符
```

---

### Step 2：实现三态组件（45分钟）

```
☐ 复制上面的完整组件代码
☐ 放到 app/organizer/page.tsx
☐ 对齐import路径
☐ 测试三个状态切换
```

---

### Step 3：添加Badge逻辑（30分钟）

```
☐ 在导航组件读取summary
☐ 计算hasRescueItems
☐ 渲染badge（橙色圆点）
☐ 测试badge出现/消失
```

---

### Step 4：测试验收（30分钟）

```
☐ 无问题时显示"All good"
☐ 有问题时显示bucket列表
☐ 点击bucket进入review页
☐ Apply & Exit显示"Completed"
☐ 900ms后刷新状态
☐ Badge正确显示/隐藏
```

**总计：2小时**

---

## ✅ 验收标准

### 功能验收

```
☐ 页面名称改为Rescue Mode
☐ 副标题正确显示
☐ Inactive状态正常
☐ Active状态正常
☐ Resolved状态正常
☐ 状态切换流畅
☐ Badge正确显示
☐ bucket点击跳转正常
☐ Apply & Exit功能正常
```

---

### 产品验收

```
☐ 90%时间显示"All good"
☐ 文案无"organize/manage"等词
☐ 用户理解"按需使用"
☐ 不会误以为是常驻功能
☐ Badge不刺眼（不用红色）
```

---

### 测试期验收

```
☐ 用户只在badge时点击
☐ 平均停留1-3分钟
☐ 处理完后不频繁返回
☐ 问题数量逐渐减少
```

---

## 🚫 常见错误避免

### 错误1：把Rescue Mode当常驻功能

**❌ 错误思维：**
```
"用户可以随时用Rescue Mode整理照片"
→ 设计成复杂的管理界面
→ 添加各种筛选器
→ 成为第二个Jobs页面
```

**✅ 正确思维：**
```
"Rescue Mode是安全阀"
→ 只在系统检测到问题时激活
→ 处理完立刻退出
→ 不是用户的主工作流
```

---

### 错误2：永远显示"有问题"

**❌ 错误：**
```
AI阈值设置太严格
→ 用户每次进来都看到上百个问题
→ 用户放弃使用
```

**✅ 正确：**
```
阈值设置保守
→ 只标记"明显有问题"的
→ 大部分时间显示"All good"
→ 偶尔需要处理10-20张
```

---

### 错误3：Badge太刺眼

**❌ 错误：**
```
[ Rescue Mode ] 240 ⚠️
```

**✅ 正确：**
```
Rescue Mode ●
```

**原因：**
```
- 不是紧急警告
- 不需要立刻处理
- 只是提示"有空可以看看"
```

---

## 💬 用户心理模型

### 理想的用户理解

```
"Rescue Mode是什么？"
→ 系统帮我检查照片的地方

"什么时候用？"
→ 看到badge亮了就进去看看

"要做什么？"
→ 快速扫一眼，标记几张照片

"多久用一次？"
→ 可能一周一次，也可能几周一次

"不用会怎样？"
→ 不会怎样，照片还在，只是可能分类不准
```

**这是成功的产品教育**

---

### 避免的误解

```
❌ "Rescue Mode是整理照片的工具"
→ 应该是"系统请求协助"

❌ "我需要经常使用它"
→ 应该是"偶尔用一次"

❌ "不用就会丢照片"
→ 应该是"不用也没事，只是建议看看"
```

---

## 📝 文案对照表

### 页面标题

| 位置 | ❌ 之前 | ✅ 现在 |
|------|--------|--------|
| 导航 | Photo Organizer | Rescue Mode |
| H1 | Photo Organizer | Rescue Mode |
| 副标题 | Organize and manage photos... | Fix photos that need attention |

---

### 状态文案

| 状态 | 文案 |
|------|------|
| Inactive | All good 👍<br>No photos need attention right now. |
| Active | Needs review<br>240 photos |
| Resolved | Rescue completed ✓<br>You're all set. |

---

### 按钮文案

| 位置 | 文案 |
|------|------|
| Inactive | Go to Jobs / Go to Camera |
| Active bucket | Review按钮文案即bucket名 |
| Active finish | Go to Jobs / Apply & Exit |
| Resolved | Go to Jobs / Go to Camera |

---

## 🎨 UI细节规范

### 配色

```
Badge：橙色或黄色（不用红色）
  - 不刺眼
  - 表示"建议看看"而非"紧急"

背景：白色卡片
  - 干净
  - 不喧宾夺主

主按钮：黑色
  - 统一风格
```

---

### 间距

```
页面padding：24px (p-6)
卡片padding：20px (p-5)
按钮padding：12px 16px (px-4 py-3)
卡片间距：16px (space-y-4)
```

---

### 圆角

```
卡片：16px (rounded-2xl)
按钮：12px (rounded-xl)
Badge：圆形 (rounded-full)
```

---

## 🔗 依赖路由

### 必须存在的路由

```
✓ /api/rescue/summary
  → 返回buckets count
  → Session-based auth

✓ /rescue/review/[bucket]
  → 五个bucket类型
  → 显示照片+reason tags

✓ /jobs
  → 用户主工作流

✓ /camera
  → 拍照入口
```

---

## 📊 成功指标（3个月后）

### 定量指标

```
✓ 平均进入频率：≤ 2次/周
✓ 平均停留时间：1-3分钟
✓ 完成率：> 80%
✓ 问题数量趋势：逐月下降
```

---

### 定性指标

```
✓ 用户理解"按需使用"
✓ 不会抱怨"又要整理照片"
✓ 认为Rescue Mode"有用但不打扰"
✓ 大部分时间看到"All good"
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** 前端团队  
**生效日期：** 立即生效  
**预计完成：** 2小时

---

**从"功能页面"到"系统安全阀"！** 🎯
