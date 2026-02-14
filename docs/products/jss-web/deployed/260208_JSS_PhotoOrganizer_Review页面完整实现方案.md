# JSS Photo Organizer - Review页面完整实现方案

> **文档类型：** 完整实现方案 + 代码 + API  
> **关联文档：** Photo Organizer数据问题诊断与UI改造方案  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - 核心功能  
> **预计完成：** 3天

---

## 📋 一句话执行指令

```
Review页面让用户看到"被过滤照片"的原因
并可以批量修正：标记为工地/个人/分配到Job
实现透明的、可回滚的照片分类
```

---

## 🎯 核心目标

### 解决的问题

```
❌ 问题：过滤人物/动物/旅游是"黑箱"
✅ 方案：把所有bucket变成可见、可review、可修正

❌ 问题：用户质疑"照片去哪了"
✅ 方案：每个bucket显示原因tags + score

❌ 问题：误分类无法修正
✅ 方案：批量操作 + 立刻移出bucket
```

---

## 📐 页面结构

### 路由设计

```
/rescue/review/[bucket]

Bucket类型：
- unknownLocation    (没GPS)
- geocodeFailed      (有GPS但地址反查失败)
- lowAccuracy        (GPS精度低)
- likelyPersonal     (人物/宠物/旅游)
- unsure            (需要review)
```

---

### 页面组成

```
ReviewBucketPage
├─ ReviewHeader        (标题 + 返回 + 选择计数)
├─ PhotoGrid           (3列网格)
│  └─ PhotoTile × N    (缩略图 + reason tags)
├─ Load More Button    (cursor分页)
└─ BulkActionsBar      (批量操作)
   ├─ Assign to job
   ├─ Create new job
   ├─ Mark as jobsite
   └─ Mark as personal
```

---

## 💻 完整代码实现

### 1. 类型定义

```typescript
// app/rescue/review/_mock/reviewMock.ts

export type ReviewBucket =
  | "unknownLocation"
  | "geocodeFailed"
  | "lowAccuracy"
  | "likelyPersonal"
  | "unsure"

export type ReviewPhoto = {
  id: string
  thumbUrl: string
  takenAtISO?: string
  hasGps: boolean
  reasonTags: string[]  // 最多显示2个
  score?: number        // jobsite_score
}

export const bucketTitle: Record<ReviewBucket, string> = {
  unknownLocation: "Unknown location",
  geocodeFailed: "Address unresolved",
  lowAccuracy: "Low accuracy location",
  likelyPersonal: "Likely personal",
  unsure: "Unsure",
}

export const bucketSubtitle: Record<ReviewBucket, string> = {
  unknownLocation: 
    "Missing GPS. Review and assign to a job if needed.",
  geocodeFailed: 
    "GPS available but address lookup failed. Review or retry.",
  lowAccuracy: 
    "Location accuracy is low. Review before grouping.",
  likelyPersonal: 
    "Hidden by filter. You can keep them personal or re-include.",
  unsure: 
    "Needs a quick review. Confirm if these are jobsite photos.",
}
```

---

### 2. ReviewHeader组件

```typescript
// app/rescue/_components/ReviewHeader.tsx

export function ReviewHeader(props: {
  title: string
  subtitle: string
  count: number
  selectedCount: number
  onBack: () => void
}) {
  return (
    <header style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={props.onBack}
        style={{
          border: "1px solid #ddd",
          background: "#fff",
          borderRadius: 10,
          padding: "8px 10px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      <h1 style={{ 
        fontSize: 24, 
        margin: "10px 0 0", 
        fontWeight: 900 
      }}>
        {props.title}{" "}
        <span style={{ 
          color: "#666", 
          fontWeight: 800 
        }}>
          ({props.count})
        </span>
      </h1>

      <div style={{ color: "#666", marginTop: 6 }}>
        {props.subtitle}
      </div>

      <div style={{ 
        marginTop: 10, 
        color: "#666", 
        fontSize: 12 
      }}>
        Selected: <b style={{ color: "#111" }}>
          {props.selectedCount}
        </b>
      </div>
    </header>
  )
}
```

---

### 3. PhotoGrid组件

```typescript
// app/rescue/_components/PhotoGrid.tsx

import type { ReactNode } from "react"

export function PhotoGrid({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      {children}
    </div>
  )
}
```

---

### 4. PhotoTile组件（核心）

```typescript
// app/rescue/_components/PhotoTile.tsx

export function PhotoTile(props: {
  id: string
  thumbUrl: string
  selected: boolean
  takenAtLabel: string
  reasonTags: string[]    // 显示原因
  scoreLabel?: string
  onToggle: () => void
}) {
  const tags = props.reasonTags.slice(0, 2)

  return (
    <button
      type="button"
      onClick={props.onToggle}
      style={{
        border: "1px solid " + 
          (props.selected ? "#111" : "#e5e5e5"),
        background: "#fff",
        borderRadius: 12,
        padding: 8,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* 缩略图 */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
      >
        <img
          src={props.thumbUrl}
          alt=""
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover" 
          }}
        />
      </div>

      {/* 时间 + Score */}
      <div style={{ 
        marginTop: 8, 
        display: "flex", 
        justifyContent: "space-between", 
        gap: 8 
      }}>
        <div style={{ fontSize: 11, color: "#666" }}>
          {props.takenAtLabel}
        </div>
        {props.scoreLabel && (
          <div style={{ fontSize: 11, color: "#666" }}>
            {props.scoreLabel}
          </div>
        )}
      </div>

      {/* Reason Tags（关键：告诉用户为什么） */}
      <div style={{ 
        marginTop: 6, 
        display: "flex", 
        gap: 6, 
        flexWrap: "wrap" 
      }}>
        {tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 11,
              padding: "3px 6px",
              borderRadius: 999,
              border: "1px solid #eaeaea",
              background: "#fafafa",
              color: "#333",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  )
}
```

---

### 5. BulkActionsBar组件

```typescript
// app/rescue/_components/BulkActionsBar.tsx

export function BulkActionsBar(props: {
  selectedCount: number
  onAssignToSuggestedJob: () => void
  onCreateNewJob: () => void
  onMarkPersonal: () => void
  onMarkJobsite: () => void
}) {
  const disabled = props.selectedCount === 0

  return (
    <footer
      style={{
        position: "sticky",
        bottom: 0,
        background: "#fff",
        paddingTop: 14,
        marginTop: 18,
      }}
    >
      <div style={{ 
        borderTop: "1px solid #eee", 
        paddingTop: 12 
      }}>
        <div style={{ 
          color: "#666", 
          fontSize: 12, 
          marginBottom: 10 
        }}>
          Selected: <b style={{ color: "#111" }}>
            {props.selectedCount}
          </b>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: 10 
        }}>
          <button
            type="button"
            disabled={disabled}
            onClick={props.onAssignToSuggestedJob}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: disabled ? "#f5f5f5" : "#111",
              color: disabled ? "#999" : "#fff",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Assign to suggested job
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={props.onCreateNewJob}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: disabled ? "#999" : "#111",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Create new job
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={props.onMarkJobsite}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
              color: disabled ? "#999" : "#111",
            }}
          >
            Mark as jobsite
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={props.onMarkPersonal}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
              color: disabled ? "#999" : "#111",
            }}
          >
            Mark as personal
          </button>
        </div>

        <div style={{ 
          color: "#666", 
          fontSize: 12, 
          marginTop: 10 
        }}>
          Suggestions only. Nothing moves until you confirm.
        </div>
      </div>
    </footer>
  )
}
```

---

## 🔌 API实现

### 1. Session-based Auth Helper

```typescript
// app/lib/auth/getOrganizationId.ts

import { createClient } from "@/app/lib/supabase/server"

export async function getOrganizationIdOrThrow() {
  const supabase = createClient()

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    throw new Error("Unauthorized")
  }

  const { data: membership, error: memErr } = 
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

  if (memErr || !membership?.organization_id) {
    throw new Error("No organization membership")
  }

  return { 
    supabase, 
    user, 
    organization_id: membership.organization_id 
  }
}
```

**说明：**
```
- 不需要URL/query传org_id
- 从session推导：user → organization_members
- 适配当前"单org用户"架构
- 未来多org再升级org picker
```

---

### 2. GET /api/rescue/review/list

```typescript
// app/api/rescue/review/list/route.ts

import { NextResponse } from "next/server"
import { getOrganizationIdOrThrow } from "@/app/lib/auth/getOrganizationId"

type Bucket =
  | "unknownLocation"
  | "geocodeFailed"
  | "lowAccuracy"
  | "likelyPersonal"
  | "unsure"

function isBucket(v: string | null): v is Bucket {
  return (
    v === "unknownLocation" ||
    v === "geocodeFailed" ||
    v === "lowAccuracy" ||
    v === "likelyPersonal" ||
    v === "unsure"
  )
}

function effectiveClass(p: any): 
  "jobsite" | "personal" | "unsure" {
  const uc = p.user_classification as string | null
  if (uc === "jobsite") return "jobsite"
  if (uc === "personal") return "personal"
  const ai = p.ai_classification as string | null
  if (ai === "jobsite") return "jobsite"
  if (ai === "personal") return "personal"
  return "unsure"
}

export async function GET(req: Request) {
  let supabase, organization_id
  
  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: any) {
    const msg = e?.message ?? "Unauthorized"
    const code = msg === "Unauthorized" ? 401 : 403
    return NextResponse.json(
      { error: msg }, 
      { status: code }
    )
  }

  const url = new URL(req.url)
  const bucketParam = url.searchParams.get("bucket")
  const limitParam = url.searchParams.get("limit") ?? "60"
  const cursor = url.searchParams.get("cursor")
  
  const limit = Math.max(1, Math.min(120, Number(limitParam) || 60))

  if (!bucketParam || !isBucket(bucketParam)) {
    return NextResponse.json(
      { 
        error: "bucket must be one of unknownLocation|geocodeFailed|lowAccuracy|likelyPersonal|unsure" 
      },
      { status: 400 }
    )
  }

  let q = supabase
    .from("job_photos")
    .select(
      [
        "id",
        "organization_id",
        "job_id",
        "thumbnail_url",
        "file_url",
        "taken_at",
        "created_at",
        "temp_lat",
        "temp_lng",
        "temp_accuracy_m",
        "jobsite_score",
        "jobsite_reasons",
        "ai_classification",
        "user_classification",
      ].join(",")
    )
    .eq("organization_id", organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  // Cursor pagination
  if (cursor) {
    q = q.lt("created_at", cursor)
  }

  // Bucket filters
  switch (bucketParam) {
    case "unknownLocation":
      // Missing GPS
      q = q.or("temp_lat.is.null,temp_lng.is.null")
      break

    case "lowAccuracy":
      // Has GPS but accuracy > 200m
      q = q
        .not("temp_lat", "is", null)
        .not("temp_lng", "is", null)
        .gt("temp_accuracy_m", 200)
      break

    case "geocodeFailed":
      // smart_trace_suggestion->geo->status === 'failed'
      q = q.contains("smart_trace_suggestion", 
        { geo: { status: "failed" } } as any
      )
      break

    case "likelyPersonal":
      q = q.or(
        "user_classification.eq.personal,and(user_classification.is.null,ai_classification.eq.personal)"
      )
      break

    case "unsure":
      q = q
        .is("user_classification", null)
        .or("ai_classification.is.null,ai_classification.eq.unsure")
      break
  }

  const { data, error } = await q
  
  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  const items =
    (data ?? []).map((p: any) => {
      const hasGps = p.temp_lat != null && p.temp_lng != null
      const reasonTags = Array.isArray(p.jobsite_reasons)
        ? p.jobsite_reasons
        : (p.jobsite_reasons?.tags ?? 
           p.jobsite_reasons ?? [])

      return {
        id: p.id,
        job_id: p.job_id,
        thumbnail_url: p.thumbnail_url ?? null,
        file_url: p.file_url,
        taken_at: p.taken_at,
        created_at: p.created_at,
        has_gps: hasGps,
        accuracy_m: p.temp_accuracy_m ?? null,
        score: p.jobsite_score ?? null,
        reason_tags: Array.isArray(reasonTags) 
          ? reasonTags.slice(0, 5) 
          : [],
      }
    }) ?? []

  const nextCursor = items.length > 0 
    ? items[items.length - 1].created_at 
    : null

  return NextResponse.json({
    bucket: bucketParam,
    limit,
    next_cursor: nextCursor,
    items,
  })
}
```

---

### 3. POST /api/rescue/review/mark

```typescript
// app/api/rescue/review/mark/route.ts

import { NextResponse } from "next/server"
import { getOrganizationIdOrThrow } from "@/app/lib/auth/getOrganizationId"

type Body = {
  photo_ids: string[]
  user_classification: "jobsite" | "personal" | null
}

export async function POST(req: Request) {
  let supabase, organization_id
  
  try {
    const r = await getOrganizationIdOrThrow()
    supabase = r.supabase
    organization_id = r.organization_id
  } catch (e: any) {
    const msg = e?.message ?? "Unauthorized"
    const code = msg === "Unauthorized" ? 401 : 403
    return NextResponse.json(
      { error: msg }, 
      { status: code }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" }, 
      { status: 400 }
    )
  }

  const photoIds = Array.isArray(body.photo_ids) 
    ? body.photo_ids 
    : []
    
  if (photoIds.length < 1 || photoIds.length > 500) {
    return NextResponse.json(
      { error: "photo_ids must be 1..500" },
      { status: 400 }
    )
  }

  const uc = body.user_classification
  if (!(uc === null || uc === "jobsite" || uc === "personal")) {
    return NextResponse.json(
      { 
        error: "user_classification must be jobsite | personal | null" 
      },
      { status: 400 }
    )
  }

  // Update with org filter (RLS + where)
  const { data, error } = await supabase
    .from("job_photos")
    .update({ user_classification: uc })
    .eq("organization_id", organization_id)
    .in("id", photoIds)
    .select("id")

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null },
      { status: 500 }
    )
  }

  return NextResponse.json({
    updated: data?.length ?? 0,
    ids: data?.map((r) => r.id) ?? [],
  })
}
```

---

## 📱 完整页面实现

```typescript
// app/rescue/review/[bucket]/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"

import { ReviewHeader } from "@/app/rescue/_components/ReviewHeader"
import { PhotoGrid } from "@/app/rescue/_components/PhotoGrid"
import { PhotoTile } from "@/app/rescue/_components/PhotoTile"
import { BulkActionsBar } from "@/app/rescue/_components/BulkActionsBar"

import {
  type ReviewBucket,
  bucketTitle,
  bucketSubtitle,
} from "@/app/rescue/review/_mock/reviewMock"

type ApiItem = {
  id: string
  thumbnail_url: string | null
  file_url: string
  taken_at: string
  created_at: string
  has_gps: boolean
  accuracy_m: number | null
  score: number | null
  reason_tags: string[]
}

function toBucket(raw: string | string[] | undefined): 
  ReviewBucket | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v) return null
  const allowed: ReviewBucket[] = [
    "unknownLocation",
    "geocodeFailed",
    "lowAccuracy",
    "likelyPersonal",
    "unsure"
  ]
  return allowed.includes(v as ReviewBucket) 
    ? (v as ReviewBucket) 
    : null
}

function fmtTakenAt(iso?: string): string {
  if (!iso) return "No photo time"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  })
}

async function fetchBucketPhotos(
  bucket: string, 
  cursor?: string | null
) {
  const qs = new URLSearchParams()
  qs.set("bucket", bucket)
  qs.set("limit", "60")
  if (cursor) qs.set("cursor", cursor)

  const res = await fetch(
    `/api/rescue/review/list?${qs.toString()}`,
    { method: "GET" }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ 
    items: ApiItem[]
    next_cursor: string | null 
  }>
}

async function markPhotos(
  photoIds: string[],
  user_classification: "jobsite" | "personal" | null
) {
  const res = await fetch("/api/rescue/review/mark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      photo_ids: photoIds, 
      user_classification 
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ 
    updated: number
    ids: string[] 
  }>
}

export default function ReviewBucketPage() {
  const router = useRouter()
  const params = useParams()
  const bucket = toBucket(params?.bucket as any)

  const [photos, setPhotos] = useState<ApiItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 初次加载
  useEffect(() => {
    if (!bucket) return
    
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setHasMore(true)
        setPhotos([])
        setNextCursor(null)

        const r = await fetchBucketPhotos(bucket, null)
        if (cancelled) return

        setPhotos(r.items)
        setNextCursor(r.next_cursor)
        setHasMore(!!r.next_cursor && r.items.length > 0)
      } catch (e: any) {
        if (!cancelled) alert(e?.message ?? "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    
    return () => {
      cancelled = true
    }
  }, [bucket])

  // Load more
  async function loadMore() {
    if (!hasMore || loadingMore || !bucket) return
    
    try {
      setLoadingMore(true)
      const r = await fetchBucketPhotos(bucket, nextCursor)
      
      // 去重
      setPhotos((prev) => {
        const seen = new Set(prev.map((x) => x.id))
        const merged = [...prev]
        for (const it of r.items) {
          if (!seen.has(it.id)) merged.push(it)
        }
        return merged
      })
      
      setNextCursor(r.next_cursor)
      setHasMore(!!r.next_cursor && r.items.length > 0)
    } catch (e: any) {
      alert(e?.message ?? "Failed to load more")
    } finally {
      setLoadingMore(false)
    }
  }

  // 移除照片（标记后）
  const removeByIds = (ids: string[]) => {
    if (!ids.length) return
    const set = new Set(ids)
    setPhotos((prev) => prev.filter((p) => !set.has(p.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!bucket) {
    return (
      <main style={{ 
        padding: 16, 
        maxWidth: 520, 
        margin: "0 auto" 
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          Invalid bucket
        </h1>
        <button
          type="button"
          onClick={() => router.push("/rescue")}
          style={{ 
            marginTop: 12, 
            padding: "10px 12px", 
            borderRadius: 10, 
            border: "1px solid #ddd" 
          }}
        >
          Back to Rescue
        </button>
      </main>
    )
  }

  const title = bucketTitle[bucket]
  const subtitle = bucketSubtitle[bucket]

  return (
    <main style={{ 
      padding: 16, 
      maxWidth: 520, 
      margin: "0 auto" 
    }}>
      <ReviewHeader
        title={title}
        subtitle={subtitle}
        count={photos.length}
        selectedCount={selected.size}
        onBack={() => router.push("/rescue")}
      />

      {loading ? (
        <div style={{ color: "#666", marginTop: 16 }}>
          Loading…
        </div>
      ) : (
        <>
          <PhotoGrid>
            {photos.map((p) => (
              <PhotoTile
                key={p.id}
                id={p.id}
                thumbUrl={p.thumbnail_url ?? p.file_url}
                selected={selected.has(p.id)}
                takenAtLabel={fmtTakenAt(p.taken_at)}
                reasonTags={p.reason_tags}
                scoreLabel={
                  typeof p.score === "number" 
                    ? `score ${p.score}` 
                    : undefined
                }
                onToggle={() => toggle(p.id)}
              />
            ))}
          </PhotoGrid>

          {/* Load More */}
          <div style={{ marginTop: 14 }}>
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: loadingMore 
                    ? "not-allowed" 
                    : "pointer",
                  color: "#111",
                }}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : photos.length > 0 ? (
              <div style={{ 
                color: "#666", 
                fontSize: 12, 
                textAlign: "center" 
              }}>
                No more photos
              </div>
            ) : null}
          </div>
        </>
      )}

      <BulkActionsBar
        selectedCount={selected.size}
        onAssignToSuggestedJob={() => {
          alert("Assign to suggested job (TODO UI)")
        }}
        onCreateNewJob={() => {
          alert("Create new job (TODO UI)")
        }}
        onMarkJobsite={async () => {
          const ids = Array.from(selected)
          if (!ids.length) return
          try {
            const r = await markPhotos(ids, "jobsite")
            removeByIds(r.ids)
          } catch (e: any) {
            alert(e?.message ?? "Failed")
          }
        }}
        onMarkPersonal={async () => {
          const ids = Array.from(selected)
          if (!ids.length) return
          try {
            const r = await markPhotos(ids, "personal")
            removeByIds(r.ids)
          } catch (e: any) {
            alert(e?.message ?? "Failed")
          }
        }}
      />
    </main>
  )
}
```

---

## 🗄️ 数据库Migration

### 1. 添加分类字段

```sql
-- supabase/migrations/202602080001_add_job_photo_classification.sql

alter table public.job_photos
  add column if not exists jobsite_score smallint,
  add column if not exists jobsite_reasons jsonb,
  add column if not exists ai_classification text,
  add column if not exists user_classification text;

alter table public.job_photos
  add constraint if not exists job_photos_jobsite_score_range
  check (
    jobsite_score is null or 
    (jobsite_score >= 0 and jobsite_score <= 100)
  );

alter table public.job_photos
  add constraint if not exists job_photos_ai_classification_check
  check (
    ai_classification is null or 
    ai_classification in ('jobsite','personal','unsure')
  );

alter table public.job_photos
  add constraint if not exists job_photos_user_classification_check
  check (
    user_classification is null or 
    user_classification in ('jobsite','personal')
  );

create index if not exists job_photos_org_idx
  on public.job_photos (organization_id);

create index if not exists job_photos_ai_classification_idx
  on public.job_photos (organization_id, ai_classification);

create index if not exists job_photos_user_classification_idx
  on public.job_photos (organization_id, user_classification);
```

---

### 2. RLS Policies

```sql
-- supabase/migrations/202602080002_job_photos_rls_policies.sql

alter table public.job_photos 
  enable row level security;

-- SELECT for org members
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'job_photos'
      and policyname = 'job_photos_select_org_members'
  ) then
    create policy job_photos_select_org_members
      on public.job_photos
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organization_members m
          where m.organization_id = job_photos.organization_id
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- UPDATE for org members
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'job_photos'
      and policyname = 'job_photos_update_org_members'
  ) then
    create policy job_photos_update_org_members
      on public.job_photos
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organization_members m
          where m.organization_id = job_photos.organization_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.organization_members m
          where m.organization_id = job_photos.organization_id
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 收紧update权限（只允许更新user_classification）
revoke update on table public.job_photos 
  from authenticated;
  
grant update (user_classification) 
  on table public.job_photos 
  to authenticated;
```

---

## 🔑 核心设计原则

### 1. Effective Classification

```typescript
// 优先级：user > ai > default
effective = user_classification 
  ?? ai_classification 
  ?? 'unsure'
```

**规则：**
```
- AI可以更新ai_classification
- AI永远不能覆盖user_classification
- user_classification = null才算"未手动覆盖"
```

---

### 2. Reason Tags原则

```
✅ 每张照片最多显示2个reason
✅ 用简短标签（不超过3词）
✅ 示例：
   - "selfie-heavy"
   - "tools-detected"
   - "unfinished-interior"
   - "outdoor-scenery"
   - "animal-detected"
```

---

### 3. 写回后立刻移除

```typescript
// Mark成功后
removeByIds(r.ids)

// 效果：
// - 用户立刻看到结果
// - bucket count实时更新
// - 不需要刷新页面
```

---

## ⏱️ 实施时间表

### Day 1：组件 + Mock

```
☐ ReviewHeader组件
☐ PhotoGrid组件
☐ PhotoTile组件
☐ BulkActionsBar组件
☐ Mock数据
☐ 路由骨架
```

---

### Day 2：API + Migration

```
☐ getOrganizationIdOrThrow helper
☐ GET /api/rescue/review/list
☐ POST /api/rescue/review/mark
☐ Migration（字段 + RLS）
☐ 运行migration
```

---

### Day 3：集成 + 测试

```
☐ Review页面接真实API
☐ Pagination (cursor)
☐ Mark写回 + 移除
☐ 错误处理
☐ 测试验收
```

---

## ✅ 验收标准

### 功能验收

```
☐ 所有5个bucket可访问
☐ 照片正确按bucket过滤
☐ Reason tags显示正确
☐ 多选照片功能正常
☐ Mark as jobsite写回成功
☐ Mark as personal写回成功
☐ 写回后照片立刻移除
☐ Load more正常工作
☐ 返回Rescue页面正常
```

---

### UI验收

```
☐ 3列网格布局
☐ 缩略图正确显示
☐ Reason tags清晰可读
☐ 选中状态明显
☐ 按钮disabled状态正确
☐ Mobile无横向滚动
☐ Load more不闪烁
```

---

### 数据验收

```
☐ user_classification正确写入
☐ RLS正确拦截跨org
☐ cursor分页无重复
☐ 写回后bucket count正确
☐ effective classification计算正确
```

---

## 🚫 常见错误避免

### 错误1：AI覆盖用户决定

**❌ 错误：**
```typescript
// AI分析时直接写user_classification
await supabase
  .from("job_photos")
  .update({ 
    ai_classification: "personal",
    user_classification: "personal"  // 错误！
  })
```

**✅ 正确：**
```typescript
// AI只写ai_classification
// 只在user_classification IS NULL时才生效
await supabase
  .from("job_photos")
  .update({ 
    ai_classification: "personal"
    // 不触碰user_classification
  })
```

---

### 错误2：分页重复数据

**❌ 错误：**
```typescript
// 用offset分页
.range(offset, offset + limit)
```

**✅ 正确：**
```typescript
// 用cursor分页
.lt("created_at", cursor)
.order("created_at", { ascending: false })
```

---

### 错误3：不清空selection

**❌ 错误：**
```typescript
// Mark后不清空
await markPhotos(ids, "personal")
removeByIds(ids)
// selected仍然包含已删除的id
```

**✅ 正确：**
```typescript
// removeByIds内部清空selection
setSelected((prev) => {
  const next = new Set(prev)
  for (const id of ids) next.delete(id)
  return next
})
```

---

## 💬 最终效果

### 用户体验

```
1. 点击bucket → 立刻看到照片网格
2. 每张照片显示reason tags → 理解为什么被分类
3. 多选照片 → 批量操作
4. Mark as personal → 立刻从列表移除
5. 返回Rescue首页 → bucket count已更新
```

---

### 数据流

```
Review页面
├─ 请求 /api/rescue/review/list
│  └─ session → org_id
│  └─ 按bucket过滤
│  └─ 返回photos + reason_tags
│
├─ 用户选择 + Mark
│  └─ POST /api/rescue/review/mark
│  └─ 写入user_classification
│  └─ 返回updated ids
│
└─ 前端移除
   └─ removeByIds(r.ids)
   └─ bucket count -N
```

---

**文档版本：** v1.0  
**创建人：** CPO + 前端团队  
**审核人：** CTO  
**执行人：** 前后端团队  
**生效日期：** 立即生效  
**预计完成：** 3天

---

**从"黑箱过滤"到"透明可修正"！** 🎯
