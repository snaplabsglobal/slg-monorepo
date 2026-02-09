# JSS Photo Organizer 数据问题诊断与UI改造方案

> **文档类型：** Bug诊断 + UI改造 + 完整代码  
> **触发原因：** CEO发现数据严重异常  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - 立即修复  
> **预计完成：** 2天

---

## 🚨 CEO发现的3个"不可能"

### 问题现象

```
1. 日期为何只有2021-2022？
2. 1000张照片怎么只有三个疑似地址？
3. 每个地址300多张，怎么可能？
```

**CEO判断：**
```
这不是"用户误解"
而是Organizer/Rescue统计口径或数据源有硬伤
```

---

## 🔍 根本原因诊断

### 问题1：日期只显示2021-2022

**可能原因（按概率排序）：**

**A. 取的是"有GPS的照片子集"（最可能）**
```
很多照片没有GPS：
- 室内拍摄
- 权限没开
- 从别处导入
- 截图/微信转存

先筛has_gps=true再算date range
→ date range被严重缩窄到少数有GPS的老照片
```

**B. 用错了字段**
```
用的是created_at（上传时间）
而不是taken_at（拍摄时间）
```

**C. EXIF解析失败**
```
EXIF DateTimeOriginal解析失败 → null
→ fallback到第一批成功解析的范围
→ 或者排序只在一页数据上做（分页bug）
```

---

### 问题2：只有3个地址

**根本原因：**
```
地址聚类只对"成功反查地址"的照片生效
其它照片被丢掉了
但UI没告诉用户"我们忽略了多少"
```

**常见场景：**

**A. 只有少量照片有GPS**
```
1000张照片：
- 只有320张有GPS
- 其中280张成功反查地址 → 形成3个地址
- 其它720-840张：
  * 没GPS
  * GPS精度太差
  * 在室内拍的
  * 权限没给
  * metadata被剥掉
```

**B. 反查地址API失败**
```
只成功反查了少量点
其它点失败后没重试、没入队
最后只剩3个地址"看起来像全量结果"
```

**C. 聚类阈值过大**
```
300m内算同一地址
→ 同一条路上的工地被合并
```

---

### 问题3：每个地址都是360张

**可能原因：**

**A. 抽样逻辑（最可能）**
```
"每个job候选最多取360张样本"
或"按月/按批次抽样"
→ 结果误当成总量展示
```

**B. Placeholder（UI bug）**
```
UI用了≈360的占位符
没读到真实count
```

---

## ✅ 正确的解决方案

### 核心原则

```
UI必须把"不确定/缺失数据"变成可见的桶
任何抽样/limit必须明示
不允许只给"结果"而不给"覆盖率"
```

---

### 修正1：Date range必须可解释

**❌ 错误显示：**
```
Date range: 2021 - 2022
```

**✅ 正确显示：**
```
Date range (photo time): Jul 2021 – Nov 2022
(based on photo metadata)

140 photos missing photo time (using upload time)
```

**规则：**
```
✅ 必须真实
✅ 必须完整（最早到最新）
✅ 必须可解释
✅ 必须标注missing数量
❌ 永远不能默默给一个"看起来很傻"的结果
```

---

### 修正2：显示完整的数据覆盖率

**必须添加"Coverage行"：**

```
Photos scanned: 1,160

Likely jobsite: 1,080

With date: 1,020 / 1,160

With GPS: 320 / 1,160

Address resolved: 280 / 320
```

**这5行是"防瞎编护栏"**
```
缺任何一行都容易被用户质疑
```

---

### 修正3：添加"缺失数据桶"

**必须显示的Bucket：**

```
✅ Vancouver – 5862 Cambie St (360)
✅ Burnaby – 8290 Kingsway (360)
✅ Burnaby – 4700 Kingsway (360)

⚠️ Unknown location (no GPS) (840)
⚠️ Address unresolved (GPS但反查失败) (40)
⚠️ Low accuracy location (±500m) (20)
⚠️ Likely personal (人物/宠物/旅游) (80)
⚠️ Unsure (需要review) (120)
```

**效果：**
```
"怎么只有3个地址？"
→ "哦，原来840张没GPS"
```

---

### 修正4：禁止模糊符号

**❌ 禁止：**
```
≈360 photos
```

**✅ 正确：**
```
如果是真实count：360 photos

如果是抽样：
360 sample photos (out of 1,160)
并加badge: "Sampled"
```

---

### 修正5：过滤规则必须透明

**添加Filter Chips：**
```
✅ Likely jobsite (默认)
   All photos
   Unsure
   Likely personal
```

**每张照片显示原因：**
```
Reason: selfie-heavy
Reason: outdoor scenery
Reason: tools + unfinished interior
```

---

## 📐 完整UI改造方案

### 改造目标

```
让3个"不可能"在UI上永远不再发生
即使后台分析还没跑完，也不会"看起来像瞎编"
```

---

### 页面1：Rescue入口页

#### A. Summary卡片新增Coverage行

```
Photos scanned: 1,160
Likely jobsite: 1,080
With date: 1,020 / 1,160
With GPS: 320 / 1,160
Address resolved: 280 / 320
```

---

#### B. Date range显示规则

```
Date range (photo time): Jul 2021 – Nov 2022
Missing photo time: 140 photos (using upload time)
```

**规则：**
```
missing_photo_time > 0 必须出现第二行
```

---

#### C. "100% complete"改造

**❌ 错误：**
```
100% complete
```

**✅ 正确：**
```
Scan complete ✅
Analysis coverage: 280/1,160 resolved (continues in background)
```

---

### 页面2：Job Suggestions列表

#### A. 顶部总进度改造

**❌ 错误：**
```
0 of 3 jobs confirmed
```

**✅ 正确：**
```
3 job suggestions (confirm to apply)
Based on: 280 photos with resolved address / 1,160 total
```

---

#### B. 每个Job卡片必须显示覆盖率

**三行结构：**
```
Job name（可rename）

Photo count: 360 photos（真实count）

Coverage hint:
  Location-based (GPS + address)
  Confidence: High/Medium/Low
```

**如果是抽样：**
```
360 sample photos (out of 1,160)
```

---

#### C. 新增缺失桶卡片（必须）

```
Unknown location
  880 photos · Missing GPS
  [Review]

Address lookup failed
  40 photos · GPS available, address unresolved
  [Review] [Retry]

Likely personal
  80 photos · Hidden by filter
  [View]

Unsure
  120 photos · Needs quick review
  [Review]
```

---

## 💻 完整代码实现

### 目录结构

```
app/rescue/
  page.tsx
  _mock/
    rescue.types.ts
    rescueMock.ts
  _components/
    RescueHeader.tsx
    RescueSummaryCard.tsx
    RescueFilterChips.tsx
    SuggestionCard.tsx
    BucketCard.tsx
    RescueFooterBar.tsx
```

---

### 1. Types定义

```typescript
// app/rescue/_mock/rescue.types.ts

export type RescueSummary = {
  totalPhotos: number
  likelyJobsite: number

  withTakenAt: number
  missingTakenAt: number
  takenAtRange?: { min: string; max: string } // ISO date

  withGps: number
  addressResolved: number
  addressLookupFailed?: number

  scanComplete: boolean
  analysisState: "none" | "partial" | "complete"
  analysisCoverage?: { done: number; total: number }
}

export type JobSuggestion = {
  id: string
  displayName: string
  photoCount: number
  dateRange?: { min: string; max: string }
  basedOn: "address" | "gps" | "time_cluster" | "mixed"
  confidence: "high" | "medium" | "low"

  isSampled?: boolean
  sampleSize?: number
  trueTotal?: number
}

export type RescueBuckets = {
  unknownLocation: { count: number }
  geocodeFailed?: { count: number }
  lowAccuracy?: { count: number }
  likelyPersonal?: { count: number }
  unsure?: { count: number }
}

export type RescueFilter = 
  | "likely_jobsite" 
  | "all" 
  | "unsure" 
  | "likely_personal"
```

---

### 2. Mock数据（对账解释）

```typescript
// app/rescue/_mock/rescueMock.ts

import type { 
  RescueSummary, 
  JobSuggestion, 
  RescueBuckets 
} from "./rescue.types"

export const rescueSummaryMock: RescueSummary = {
  totalPhotos: 1160,
  likelyJobsite: 1080,

  withTakenAt: 1020,
  missingTakenAt: 140,
  takenAtRange: { 
    min: "2021-07-01", 
    max: "2022-11-30" 
  },

  withGps: 320,
  addressResolved: 280,
  addressLookupFailed: 40,

  scanComplete: true,
  analysisState: "partial",
  analysisCoverage: { done: 280, total: 1160 },
}

export const jobSuggestionsMock: JobSuggestion[] = [
  {
    id: "sug_van_cambie_5862",
    displayName: "Vancouver – 5862 Cambie St",
    photoCount: 360,
    dateRange: { 
      min: "2021-07-01", 
      max: "2021-08-31" 
    },
    basedOn: "address",
    confidence: "high",
  },
  {
    id: "sug_bby_kingsway_8290",
    displayName: "Burnaby – 8290 Kingsway",
    photoCount: 360,
    dateRange: { 
      min: "2022-03-01", 
      max: "2022-04-30" 
    },
    basedOn: "address",
    confidence: "high",
  },
  {
    id: "sug_bby_kingsway_4700",
    displayName: "Burnaby – 4700 Kingsway",
    photoCount: 360,
    dateRange: { 
      min: "2022-11-01", 
      max: "2022-11-30" 
    },
    basedOn: "address",
    confidence: "medium",
  },
]

// 数字对账解释：
// 1160 total
// - 320 with GPS
//   - 280 resolved address → suggestions
//   - 40 failed → geocodeFailed
// - 840 missing GPS → unknownLocation
// 
// likely jobsite 1080 (过滤掉80张personal)
export const rescueBucketsMock: RescueBuckets = {
  unknownLocation: { count: 840 },
  geocodeFailed: { count: 40 },
  lowAccuracy: { count: 0 },
  likelyPersonal: { count: 80 },
  unsure: { count: 120 },
}
```

---

### 3. RescueSummaryCard组件

```typescript
// app/rescue/_components/RescueSummaryCard.tsx

import type { RescueSummary } from "../_mock/rescue.types"

function formatMonthRange(
  minISO?: string, 
  maxISO?: string
): string {
  if (!minISO || !maxISO) return "—"
  const min = new Date(minISO)
  const max = new Date(maxISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short" 
    })
  return `${fmt(min)} – ${fmt(max)}`
}

function ratioLine(label: string, a: number, b: number) {
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      gap: 12 
    }}>
      <div style={{ color: "#444" }}>{label}</div>
      <div style={{ color: "#111" }}>
        <b>{a}</b> / {b}
      </div>
    </div>
  )
}

export function RescueSummaryCard({ 
  data 
}: { 
  data: RescueSummary 
}) {
  const dateRangeText = formatMonthRange(
    data.takenAtRange?.min, 
    data.takenAtRange?.max
  )

  const analysisText =
    data.analysisState === "none"
      ? "Scan complete ✅"
      : data.analysisState === "complete"
        ? `Analysis complete ✅`
        : `Scan complete ✅ · Analysis coverage: ${data.analysisCoverage?.done ?? 0}/${data.analysisCoverage?.total ?? data.totalPhotos} (continues in background)`

  return (
    <section
      style={{
        border: "1px solid #eaeaea",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700 }}>
        {analysisText}
      </div>

      <div style={{ 
        marginTop: 12, 
        display: "grid", 
        gap: 8 
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          gap: 12 
        }}>
          <div style={{ color: "#444" }}>
            Photos scanned
          </div>
          <div style={{ color: "#111" }}>
            <b>{data.totalPhotos}</b>
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          gap: 12 
        }}>
          <div style={{ color: "#444" }}>
            Likely jobsite
          </div>
          <div style={{ color: "#111" }}>
            <b>{data.likelyJobsite}</b>
          </div>
        </div>

        {ratioLine(
          "With date", 
          data.withTakenAt, 
          data.totalPhotos
        )}
        {ratioLine(
          "With GPS", 
          data.withGps, 
          data.totalPhotos
        )}
        {ratioLine(
          "Address resolved", 
          data.addressResolved, 
          data.withGps
        )}
      </div>

      <div style={{ 
        marginTop: 14, 
        paddingTop: 12, 
        borderTop: "1px solid #f0f0f0" 
      }}>
        <div style={{ color: "#444" }}>
          Date range (photo time):{" "}
          <b style={{ color: "#111" }}>
            {dateRangeText}
          </b>
        </div>

        {data.missingTakenAt > 0 && (
          <div style={{ color: "#666", marginTop: 4 }}>
            {data.missingTakenAt} photos missing photo time 
            (using upload time)
          </div>
        )}

        {!!data.addressLookupFailed && 
         data.addressLookupFailed > 0 && (
          <div style={{ color: "#666", marginTop: 4 }}>
            {data.addressLookupFailed} photos have GPS 
            but address lookup failed
          </div>
        )}
      </div>
    </section>
  )
}
```

---

### 4. SuggestionCard组件

```typescript
// app/rescue/_components/SuggestionCard.tsx

import type { JobSuggestion } from "../_mock/rescue.types"

function formatDateRange(
  minISO?: string, 
  maxISO?: string
): string {
  if (!minISO || !maxISO) return "—"
  const min = new Date(minISO)
  const max = new Date(maxISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    })
  return `${fmt(min)} – ${fmt(max)}`
}

function badge(text: string) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e5e5e5",
        color: "#333",
        background: "#fafafa",
      }}
    >
      {text}
    </span>
  )
}

export function SuggestionCard(props: {
  suggestion: JobSuggestion
  selected: boolean
  onToggleSelect: () => void
  onRename: () => void
  onSkip?: () => void
}) {
  const { suggestion: s, selected } = props
  const rangeText = formatDateRange(
    s.dateRange?.min, 
    s.dateRange?.max
  )

  // 关键：如果是抽样，必须明示
  const countLine = s.isSampled
    ? `${s.sampleSize ?? s.photoCount} sample photos (out of ${s.trueTotal ?? "—"})`
    : `${s.photoCount} photos`

  return (
    <div
      style={{
        border: "1px solid " + (selected ? "#111" : "#eaeaea"),
        borderRadius: 14,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        gap: 10 
      }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {s.displayName}
        </div>
        {selected ? badge("Selected") : null}
      </div>

      <div style={{ color: "#666", marginTop: 6 }}>
        <b style={{ color: "#111" }}>{countLine}</b> · {rangeText}
      </div>

      <div style={{ 
        display: "flex", 
        gap: 8, 
        flexWrap: "wrap", 
        marginTop: 10 
      }}>
        {badge(`Based on: ${s.basedOn}`)}
        {badge(`Confidence: ${s.confidence}`)}
        {s.isSampled ? badge("Sampled") : null}
      </div>

      <div style={{ 
        display: "flex", 
        gap: 10, 
        marginTop: 12 
      }}>
        <button
          type="button"
          onClick={props.onToggleSelect}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid " + (selected ? "#111" : "#ddd"),
            background: selected ? "#111" : "#fff",
            color: selected ? "#fff" : "#111",
            fontWeight: 800,
            cursor: "pointer",
            flex: 1,
          }}
        >
          {selected ? "Confirmed" : "Confirm as one job"}
        </button>

        <button
          type="button"
          onClick={props.onRename}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Rename
        </button>

        {props.onSkip && (
          <button
            type="button"
            onClick={props.onSkip}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #eee",
              background: "#fafafa",
              fontWeight: 700,
              cursor: "pointer",
              color: "#444",
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
```

---

### 5. BucketCard组件

```typescript
// app/rescue/_components/BucketCard.tsx

type BucketType =
  | "unknownLocation"
  | "geocodeFailed"
  | "lowAccuracy"
  | "likelyPersonal"
  | "unsure"

const bucketCopy: Record<
  BucketType,
  { 
    title: string
    subtitle: (count: number) => string
    cta: string 
  }
> = {
  unknownLocation: {
    title: "Unknown location",
    subtitle: (c) => `${c} photos · Missing GPS`,
    cta: "Review",
  },
  geocodeFailed: {
    title: "Address unresolved",
    subtitle: (c) => 
      `${c} photos · GPS available, address lookup failed`,
    cta: "Review",
  },
  lowAccuracy: {
    title: "Low accuracy location",
    subtitle: (c) => 
      `${c} photos · Location accuracy is low`,
    cta: "Review",
  },
  likelyPersonal: {
    title: "Likely personal",
    subtitle: (c) => 
      `${c} photos · Hidden by filter`,
    cta: "View",
  },
  unsure: {
    title: "Unsure",
    subtitle: (c) => 
      `${c} photos · Needs quick review`,
    cta: "Review",
  },
}

export function BucketCard(props: {
  type: BucketType
  count: number
  onOpen: () => void
  secondaryAction?: { 
    label: string
    onClick: () => void 
  }
}) {
  const copy = bucketCopy[props.type]
  if (props.count <= 0) return null

  return (
    <div
      style={{
        border: "1px dashed #d0d0d0",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 16 }}>
        {copy.title}
      </div>
      <div style={{ color: "#666", marginTop: 6 }}>
        {copy.subtitle(props.count)}
      </div>

      <div style={{ 
        display: "flex", 
        gap: 10, 
        marginTop: 12 
      }}>
        <button
          type="button"
          onClick={props.onOpen}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {copy.cta}
        </button>

        {props.secondaryAction && (
          <button
            type="button"
            onClick={props.secondaryAction.onClick}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #eee",
              background: "#fafafa",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {props.secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
```

---

### 6. 完整页面组装

```typescript
// app/rescue/page.tsx
"use client"

import { useMemo, useState } from "react"
import { RescueHeader } from "./_components/RescueHeader"
import { RescueSummaryCard } from "./_components/RescueSummaryCard"
import { RescueFilterChips } from "./_components/RescueFilterChips"
import { SuggestionCard } from "./_components/SuggestionCard"
import { BucketCard } from "./_components/BucketCard"
import { RescueFooterBar } from "./_components/RescueFooterBar"

import { 
  rescueSummaryMock, 
  jobSuggestionsMock, 
  rescueBucketsMock 
} from "./_mock/rescueMock"
import type { RescueFilter } from "./_mock/rescue.types"

export default function RescuePage() {
  const summary = rescueSummaryMock
  const buckets = rescueBucketsMock

  const [filter, setFilter] = useState<RescueFilter>(
    "likely_jobsite"
  )
  const [selected, setSelected] = useState<Set<string>>(
    new Set()
  )

  const countsForChips = useMemo(() => {
    return {
      likely_jobsite: summary.likelyJobsite,
      all: summary.totalPhotos,
      unsure: buckets.unsure?.count ?? 0,
      likely_personal: buckets.likelyPersonal?.count ?? 0,
    }
  }, [summary, buckets])

  const filteredSuggestions = useMemo(() => {
    if (filter === "likely_personal") return []
    if (filter === "unsure") return []
    return jobSuggestionsMock
  }, [filter])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main style={{ 
      padding: 16, 
      maxWidth: 520, 
      margin: "0 auto" 
    }}>
      <RescueHeader />
      <RescueSummaryCard data={summary} />

      <section style={{ marginTop: 18 }}>
        <h2 style={{ 
          fontSize: 20, 
          margin: "0 0 6px", 
          fontWeight: 900 
        }}>
          Job suggestions
        </h2>
        <div style={{ color: "#666" }}>
          Based on <b>{summary.addressResolved}</b> photos 
          with resolved address /{" "}
          <b>{summary.totalPhotos}</b> total
        </div>

        <RescueFilterChips 
          value={filter} 
          counts={countsForChips} 
          onChange={setFilter} 
        />

        <div style={{ 
          display: "grid", 
          gap: 12, 
          marginTop: 12 
        }}>
          {filteredSuggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              selected={selected.has(s.id)}
              onToggleSelect={() => toggleSelect(s.id)}
              onRename={() => 
                alert(`Rename: ${s.displayName}`)
              }
            />
          ))}

          {/* Buckets 永远显示（防胡扯护栏） */}
          <BucketCard
            type="unknownLocation"
            count={buckets.unknownLocation.count}
            onOpen={() => 
              alert("Open: Unknown location review")
            }
          />

          <BucketCard
            type="geocodeFailed"
            count={buckets.geocodeFailed?.count ?? 0}
            onOpen={() => 
              alert("Open: Address unresolved review")
            }
            secondaryAction={{
              label: "Retry lookup",
              onClick: () => alert("Retry geocode"),
            }}
          />

          <BucketCard
            type="likelyPersonal"
            count={buckets.likelyPersonal?.count ?? 0}
            onOpen={() => 
              alert("Open: Likely personal")
            }
          />

          <BucketCard
            type="unsure"
            count={buckets.unsure?.count ?? 0}
            onOpen={() => 
              alert("Open: Unsure review")
            }
          />
        </div>
      </section>

      <RescueFooterBar
        selectedCount={selected.size}
        onApplySelected={() => 
          alert(`Apply: ${Array.from(selected).join(", ")}`)
        }
        onApplyNothing={() => 
          alert("Apply nothing")
        }
      />
    </main>
  )
}
```

---

## 📊 数据对账解释

### 为什么只有3个地址？

```
总共1160张照片：
- 320张有GPS
  - 280张成功反查地址 → 形成3个job suggestions
  - 40张反查失败 → geocodeFailed bucket
- 840张没GPS → unknownLocation bucket
```

---

### 为什么日期只到2022？

```
taken_atRange来自"有可用拍摄时间的照片"
- 1020张有taken_at → Jul 2021 – Nov 2022
- 140张missing taken_at → UI明示
```

---

### 为什么每个地址都是360？

```
在mock里写死是真实count
如果未来真是抽样：
- 必须用isSampled标记
- 必须显示sampleSize和trueTotal
- UI必须明示"sample"
```

---

## ✅ 执行清单（2天完成）

### Day 1：UI改造（不等后端）

```
☐ 添加RescueSummaryCard的Coverage行
☐ 修改date range显示（加missing提示）
☐ 去掉所有≈符号
☐ 添加Unknown location bucket
☐ 添加其他bucket（geocodeFailed等）
☐ 修改"100% complete"文案
```

---

### Day 2：接口补齐

```
☐ 后端返回withTakenAt/missingTakenAt
☐ 后端返回withGps/addressResolved
☐ 后端返回真实count（不是抽样）
☐ 后端返回bucket counts
☐ 前端接入真实API
☐ 测试验收
```

---

## 🔒 硬性规则（必须遵守）

### 规则1：永远显示覆盖率

```
任何"结果"必须同时给"覆盖率"
否则用户会质疑数据真实性
```

---

### 规则2：缺失数据必须有桶

```
不允许：默默丢掉照片
必须：把缺失数据变成可见bucket
```

---

### 规则3：禁止模糊符号

```
❌ ≈360
❌ ~360
❌ 约360

✅ 360 photos
✅ 360 sample photos (out of 1,160)
```

---

### 规则4：抽样必须明示

```
如果是抽样：
- isSampled: true
- sampleSize: 360
- trueTotal: 1160
- UI显示badge: "Sampled"
```

---

### 规则5：Analysis状态必须准确

```
❌ 100% complete（容易误解）
✅ Scan complete
✅ Analysis coverage: X/Y
```

---

## 📝 API接口要求

### GET /api/rescue/summary

**必须返回：**

```typescript
{
  totalPhotos: number
  likelyJobsite: number
  
  withTakenAt: number
  missingTakenAt: number
  takenAtRange: { min: string; max: string }
  
  withGps: number
  addressResolved: number
  addressLookupFailed: number
  
  scanComplete: boolean
  analysisState: "none" | "partial" | "complete"
  analysisCoverage: { done: number; total: number }
}
```

---

### GET /api/rescue/suggestions

**必须返回：**

```typescript
{
  suggestions: [
    {
      id: string
      displayName: string
      photoCount: number  // 真实count
      dateRange: { min: string; max: string }
      basedOn: "address" | "gps" | ...
      confidence: "high" | "medium" | "low"
      
      // 如果是抽样，必须提供
      isSampled?: boolean
      sampleSize?: number
      trueTotal?: number
    }
  ],
  
  buckets: {
    unknownLocation: { count: number }
    geocodeFailed: { count: number }
    lowAccuracy: { count: number }
    likelyPersonal: { count: number }
    unsure: { count: number }
  }
}
```

---

## 💬 验收标准

### 功能验收

```
☐ 显示真实date range
☐ 显示missing taken_at数量
☐ 显示Coverage 5行
☐ 显示真实photo count（不是≈）
☐ 显示所有bucket
☐ Filter chips可切换
☐ Bucket可点击Review
```

---

### 数据验收

```
☐ 1160 = likelyJobsite + buckets总和
☐ 320 = addressResolved + addressLookupFailed
☐ 1160 = withTakenAt + missingTakenAt
☐ 每个数字都能对账
```

---

### UI验收

```
☐ 无≈符号
☐ 无"100% complete"误导文案
☐ Coverage行清晰可见
☐ Bucket卡片完整
☐ Mobile无横向滚动
```

---

**文档版本：** v1.0  
**创建人：** CPO（基于CEO质疑）  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 立即生效  
**预计完成：** 2天

---

**从"看起来像瞎编"到"数据可验证"！** 🎯
