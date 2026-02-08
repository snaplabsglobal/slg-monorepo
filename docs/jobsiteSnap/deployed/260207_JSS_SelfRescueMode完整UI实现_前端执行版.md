# JSS Self-Rescue Mode 完整UI实现（前端执行版）

> **文档类型：** 前端实施指南 + 完整代码  
> **关联文档：** 260207_JSS_SelfRescueMode完整技术规格_CTO执行版.md  
> **创建时间：** 2026-02-07  
> **优先级：** 🟡 P1 - 核心功能  
> **执行人：** 前端团队

---

## 📋 执行摘要

**交付内容：**
- ✅ 完整UI蓝图（6个页面）
- ✅ 12个前端Ticket拆分（含验收标准）
- ✅ Next.js + React完整代码（可直接运行）
- ✅ Dashboard入口卡片
- ✅ Mock数据生成器（压测用）

**技术栈：**
- Next.js (App Router)
- React
- Zustand (状态管理)
- Tailwind CSS

---

## 🎨 UI蓝图（全局概览）

### 全局导航位置（入口）

**位置：** Home / Dashboard 顶部卡片（不要藏在Settings）

```
Title: Rescue your photo library
Subtitle: Organize your past photos. Nothing changes unless you confirm.
Primary CTA: Start Rescue
Secondary: Learn how it works
```

---

### 页面结构（5步向导）

```
1. Source Picker       (/rescue/new)
   ↓
2. Scan               (/rescue/scan)
   ↓
3. Buckets List       (/rescue/buckets)
   ↓
4. Bucket Detail      (/rescue/buckets/[bucketId])
   ↓
5. Confirm & Apply    (/rescue/confirm)
```

---

## 📄 页面详细设计

### Page 1: Source Picker（选择来源）

**Route:** `/rescue/new`

**Layout:**
```
Header: Self-Rescue Mode
Progress: 1 / 5

Title: Where are your photos?

Options（cards）：
- Phone / Camera Roll (mobile)
- Folder upload (desktop)
- External drive / disk folder
- Exported folders

Footer:
  Primary: Continue
  Secondary: Exit
```

**文案（底部小字）:**
```
We don't connect to other apps. 
You choose what to bring in.
```

---

### Page 2: Scan（扫描与统计）

**Route:** `/rescue/scan`

**Layout:**
```
Progress: 2 / 5
Title: Scanning your photos…

Big progress bar

Live counters（右侧/下方）：
- Photos found: 3,482
- With GPS: 2,917
- No location: 565
- Date range: 2019 – 2025

Actions:
  Secondary: Stop scanning
  Primary: Review groups（scan完成后出现）
```

**注意：** 这一页不出现"项目/归档"，只出现事实统计

---

### Page 3: Buckets（楼/地块级分组预览）

**Route:** `/rescue/buckets`

**Layout:**
```
Progress: 3 / 5
Title: Suggested groups
Subtitle: Suggestions based on location & time. 
          Nothing applied yet.

Bucket List（卡片）：
  每个bucket卡片显示：
  - Bucket label: "Burnaby – 4500 Kingsway (Building)"
  - Meta: 1,240 photos · 12 sessions · Jan–Mar 2025
  - Preview thumbnails（3-5张）
  - CTA: Review & assign

系统bucket：
  - Unlocated (No GPS)
  - Noise / Scattered GPS
```

---

### Page 4: Bucket Detail（同楼多户 + sessions分配）

**Route:** `/rescue/buckets/[bucketId]`

**这是"同楼三户 + 串门"核心页**

#### 4.1 Bucket Header

```
Title: 4500 Kingsway (Building)
Meta: photo count / date range

Actions:
  - Define units（A/B/C）
  - Skip this bucket
  - Exit
```

#### 4.2 UnitsBar（顶栏）

```
Buttons: A / B / C / Unassigned

小字提示：
  Last used: A
  Sticky destination: B（仅Fix drawer内显示也行）
```

#### 4.3 Sessions List（主列表）

**每个SessionCard：**
```
Title: Session 10:00–11:30
Meta: 58 photos

Status pill:
  - A / B / C / Unassigned / Mixed

Right actions：
  - 一排小按钮：A B C U（点一下整段归属）
  - 若Mixed：Fix (5)
```

**点击卡片主体：** 打开Timeline Drawer

---

#### 4.4 Drawer: Session Timeline（Fix / Split / Move）

**Component:** `SessionTimelineDrawer`

**Header:**
```
Session 10:00–11:30 · 58 photos
当前归属显示：Mixed
Close
```

**Auto-pick Minority（触发条件：多数派≥70%）:**

Banner:
```
We selected 5 photos that don't match 
the main group (A).
Nothing changes until you move them.

[Clear selection]
```

**Timeline strip（缩略图时间轴）:**
- 横向滚动
- 支持：点击多选、Shift range
- 也可提供"Select minority only"

**Toolbar（Move / Split）:**

按钮顺序应用Sticky destination:
```
Primary: Move selected to B（若lastFixDestination=B）
Secondary: Move to A / C / Unassigned
Divider
Create new session from selected（拆分）
（可选）Remove selected → Unassigned
```

**关键：** 任何按钮都必须是"用户点击才执行"，不自动

---

### Page 5: Confirm & Apply（最终确认）

**Route:** `/rescue/confirm`

**Layout:**
```
Progress: 5 / 5
Title: Review & confirm

Summary（必须清晰）：
  - Buckets: 3
  - Sessions assigned: 18
  - Photos organized: 3,120
  - Deleted: 0

Confirmation copy（必须出现）:
  Nothing changes until you click Confirm.
  You can undo for 24 hours.

Actions:
  Primary: Confirm & apply
  Secondary: Go back
```

**Apply完成页 / Banner:**

Apply后回到`/rescue/buckets`或Done页：
```
Banner:
  Rescue applied
  Undo available for 24 hours
  [Undo]
```

---

## 🎫 Implementation Tickets（12个前端Ticket）

### T1 — Rescue入口卡片（Dashboard）

**Scope:**
- Dashboard添加RescueEntryCard
- CTA：Start Rescue → /rescue/new

**Acceptance:**
- [ ] 卡片在首页可见（不在settings）
- [ ] 文案包含"Nothing changes unless you confirm."

---

### T2 — Wizard Layout（统一进度条 + Exit）

**Scope:**
- RescueWizardLayout：标题、进度条(1/5)、Exit按钮
- Exit弹窗：确认退出不丢进度（本地保存）

**Acceptance:**
- [ ] 所有/rescue/*页面统一布局
- [ ] Exit后回到Dashboard，session保留

---

### T3 — Source Picker页面

**Route:** `/rescue/new`

**Scope:**
- 来源选择cards（folder/camera roll/external/exported）
- Continue → /rescue/scan

**Acceptance:**
- [ ] 必须选一个来源才能继续
- [ ] UI不提任何竞品/导入其他app

---

### T4 — Scan页面（计数 + 进度）

**Route:** `/rescue/scan`

**Scope:**
- 扫描进度条 + counters
  - Photos found / With GPS / No location / Date range
- Stop scanning（可停止）
- 完成后显示"Review groups" → /rescue/buckets

**Acceptance:**
- [ ] Scan期间UI不卡死（可cancel）
- [ ] 只显示事实统计，不出现"项目/归档"

---

### T5 — Buckets List页面

**Route:** `/rescue/buckets`

**Scope:**
- BucketCard列表：label、photos、sessions、date range、thumbnails
- 系统bucket：Unlocated / Noise（先展示数量即可）

**Acceptance:**
- [ ] 每个bucket有"Review & assign"
- [ ] 未geocode也能显示fallback label（GPS_xxx）

---

### T6 — Bucket Detail页框架

**Route:** `/rescue/buckets/[bucketId]`

**Scope:**
- Header：bucket label + counts + actions（Define units / Skip）
- UnitsBar：A/B/C/Unassigned（支持重命名）
- SessionsList：SessionCard

**Acceptance:**
- [ ] Units可编辑保存（bucket scope）
- [ ] Skip bucket返回buckets list

---

### T7 — SessionCard一键分配

**Scope:**
- SessionCard显示：时间段、count、Assigned/Mixed/Unassigned
- Buttons：A/B/C/U一键assign（写入photoAssignment）

**Acceptance:**
- [ ] 点击unit后：该session内所有photoAssignment变更
- [ ] lastUsedUnitId更新
- [ ] Mixed状态实时刷新

---

### T8 — Mixed检测 + Fix(N)显示

**Scope:**
- compute majority/minority
- Mixed session显示Fix(N)，N=少数派数量（仅majority≥70%）

**Acceptance:**
- [ ] majority<70%不显示Fix(N)（可显示Review）
- [ ] N正确

---

### T9 — SessionTimelineDrawer（时间线 + 多选）

**Scope:**
- Drawer打开/关闭
- TimelineStrip支持click多选 + shift range
- Selection summary

**Acceptance:**
- [ ] 选中数量/时间范围展示正确
- [ ] Clear selection可用

---

### T10 — Auto-pick Minority（只选中，不执行）

**Scope:**
- 打开Fix时：若majority≥70%，默认选中非多数派
- Banner文案：Nothing changes until you move them

**Acceptance:**
- [ ] 只产生selection，不改变assignment
- [ ] Banner + Clear selection工作正常

---

### T11 — Sticky Destination（bucket scope）

**Scope:**
- lastFixDestination记录在bucket UI state
- MoveToolbar按钮排序：sticky unit放第一位并focus

**Acceptance:**
- [ ] 同bucket生效，跨bucket不继承
- [ ] 刷新页面（默认）sticky可重置（可选持久化后做）

---

### T12 — Move / Split操作 + Confirm & Apply

**Scope:**
- Move selected：仅改photoAssignment（不改membership）
- Split selected：新建session + 更新photoToSession + sessionsById
- Confirm页面：汇总counts + Confirm & apply
- Apply完成：显示Undo banner（24h）

**Acceptance:**
- [ ] INV-A：photoId不会存在于两个session
- [ ] Confirm前不落地最终结构
- [ ] Apply后出现Undo banner

---

## 💻 完整代码实现

### 目录结构

```
apps/jss-web/
  app/
    rescue/
      layout.tsx
      new/page.tsx
      scan/page.tsx
      buckets/page.tsx
      buckets/[bucketId]/page.tsx
      confirm/page.tsx
  components/rescue/
    RescueEntryCard.tsx
    RescueWizardLayout.tsx
    SourcePicker.tsx
    ScanProgress.tsx
    BucketList.tsx
    BucketCard.tsx
    BucketDetailHeader.tsx
    UnitsBar.tsx
    SessionsList.tsx
    SessionCard.tsx
    SessionTimelineDrawer.tsx
    TimelineStrip.tsx
    MoveToolbar.tsx
    ConfirmSummary.tsx
    UndoBanner.tsx
  lib/rescue/
    types.ts
    store.ts
    selectors.ts
    actions.ts
    mock.ts
```

---

### 核心Types（lib/rescue/types.ts）

```typescript
export type UnitId = "A" | "B" | "C" | null; // null = Unassigned

export type PhotoMeta = {
  photoId: string;
  localUri: string;
  takenAtUtc?: string;
  lat?: number;
  lng?: number;
  hasGps: boolean;
};

export type RescueSessionSegment = {
  sessionId: string;
  photoIds: string[];
  dateRange?: { start: string; end: string };
};

export type BuildingBucket = {
  bucketId: string;
  label: string; // suggested building label or fallback
  photoIds: string[];
  sessions: RescueSessionSegment[];
  units?: Array<{ 
    unitId: Exclude<UnitId, null>; 
    label: string 
  }>;
};

export type RescuePlan = {
  planId: string;
  sessionId: string;
  status: "draft" | "applied";
  actions: Array<{
    bucketId: string;
    sessionId: string;
    action: "assign" | "keep_unassigned" | "skip";
    unitId?: UnitId;
  }>;
};
```

---

### Zustand Store（lib/rescue/store.ts）

```typescript
import { create } from "zustand";
import type { BuildingBucket, PhotoMeta, UnitId } from "./types";

type BucketUIState = {
  lastUsedUnitId?: UnitId;
  lastFixDestination?: UnitId;
};

export type RescueState = {
  // session
  rescueSessionId?: string;
  sourceType?: "folder" | "camera_roll" | "external_drive" | "exported";

  // data
  photosById: Record<string, PhotoMeta>;
  bucketsById: Record<string, BuildingBucket>;

  // strong indices
  photoToSession: Record<string, string>;      // photoId -> sessionId
  photoAssignment: Record<string, UnitId>;     // photoId -> unitId

  // UI
  bucketUI: Record<string, BucketUIState>;
  activeBucketId?: string;
  activeSessionId?: string;

  // selection (drawer)
  selectedPhotoIds: string[];

  // actions
  setSource: (sourceType: RescueState["sourceType"]) => void;
  setScanResult: (photos: PhotoMeta[], buckets: BuildingBucket[]) => void;
  assignSession: (bucketId: string, sessionId: string, unitId: UnitId) => void;
  openSession: (bucketId: string, sessionId: string) => void;
  closeSession: () => void;
  setSelection: (photoIds: string[]) => void;
  clearSelection: () => void;
  moveSelectedToUnit: (bucketId: string, unitId: UnitId) => void;
  splitSelectedToNewSession: (bucketId: string) => void;
};

export const useRescueStore = create<RescueState>((set, get) => ({
  photosById: {},
  bucketsById: {},
  photoToSession: {},
  photoAssignment: {},
  bucketUI: {},
  selectedPhotoIds: [],

  setSource: (sourceType) => set({ sourceType }),

  setScanResult: (photos, buckets) => {
    const photosById: Record<string, PhotoMeta> = {};
    for (const p of photos) photosById[p.photoId] = p;

    const bucketsById: Record<string, BuildingBucket> = {};
    const photoToSession: Record<string, string> = {};

    for (const b of buckets) {
      bucketsById[b.bucketId] = b;
      for (const s of b.sessions) {
        for (const pid of s.photoIds) photoToSession[pid] = s.sessionId;
      }
    }

    set({ photosById, bucketsById, photoToSession });
  },

  assignSession: (bucketId, sessionId, unitId) => {
    const st = get();
    const bucket = st.bucketsById[bucketId];
    const session = bucket.sessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    set((prev) => {
      const nextAssign = { ...prev.photoAssignment };
      for (const pid of session.photoIds) nextAssign[pid] = unitId;

      const bucketUI = { 
        ...prev.bucketUI, 
        [bucketId]: { ...(prev.bucketUI[bucketId] ?? {}) } 
      };
      bucketUI[bucketId].lastUsedUnitId = unitId;

      return { photoAssignment: nextAssign, bucketUI };
    });
  },

  openSession: (bucketId, sessionId) => 
    set({ activeBucketId: bucketId, activeSessionId: sessionId }),

  closeSession: () => 
    set({ 
      activeBucketId: undefined, 
      activeSessionId: undefined, 
      selectedPhotoIds: [] 
    }),

  setSelection: (photoIds) => set({ selectedPhotoIds: photoIds }),

  clearSelection: () => set({ selectedPhotoIds: [] }),

  moveSelectedToUnit: (bucketId, unitId) => {
    const st = get();
    const selected = st.selectedPhotoIds;
    if (selected.length === 0) return;

    set((prev) => {
      const nextAssign = { ...prev.photoAssignment };
      for (const pid of selected) nextAssign[pid] = unitId;

      const bucketUI = { 
        ...prev.bucketUI, 
        [bucketId]: { ...(prev.bucketUI[bucketId] ?? {}) } 
      };
      bucketUI[bucketId].lastFixDestination = unitId;
      bucketUI[bucketId].lastUsedUnitId = unitId;

      return { photoAssignment: nextAssign, bucketUI };
    });
  },

  splitSelectedToNewSession: (bucketId) => {
    const st = get();
    const selected = st.selectedPhotoIds;
    const activeSessionId = st.activeSessionId;
    if (!activeSessionId || selected.length === 0) return;

    const bucket = st.bucketsById[bucketId];
    const srcIdx = bucket.sessions.findIndex(
      s => s.sessionId === activeSessionId
    );
    if (srcIdx < 0) return;

    const src = bucket.sessions[srcIdx];
    const selectedSet = new Set(selected);

    const remaining = src.photoIds.filter(pid => !selectedSet.has(pid));
    const moved = src.photoIds.filter(pid => selectedSet.has(pid));

    if (moved.length === 0) return;

    const newSessionId = 
      `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

    set((prev) => {
      const nextBucketsById = { ...prev.bucketsById };
      const nextBucket = { ...nextBucketsById[bucketId] };
      const nextSessions = [...nextBucket.sessions];

      nextSessions[srcIdx] = { ...src, photoIds: remaining };
      nextSessions.push({ sessionId: newSessionId, photoIds: moved });

      nextBucket.sessions = nextSessions.filter(s => s.photoIds.length > 0);
      nextBucketsById[bucketId] = nextBucket;

      const nextPhotoToSession = { ...prev.photoToSession };
      for (const pid of moved) nextPhotoToSession[pid] = newSessionId;

      return {
        bucketsById: nextBucketsById,
        photoToSession: nextPhotoToSession,
        selectedPhotoIds: [],
        activeSessionId: newSessionId,
      };
    });
  },
}));
```

---

### Selectors（lib/rescue/selectors.ts）

```typescript
import type { UnitId } from "./types";
import { useRescueStore } from "./store";

export function getSessionDistribution(
  photoIds: string[], 
  assignment: Record<string, UnitId>
) {
  const counts = new Map<UnitId, number>();
  for (const pid of photoIds) {
    const u = assignment[pid] ?? null;
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  return counts;
}

export function computeMajority(
  photoIds: string[], 
  assignment: Record<string, UnitId>
) {
  const counts = getSessionDistribution(photoIds, assignment);
  let maj: UnitId = null;
  let majCount = 0;
  for (const [u, c] of counts.entries()) {
    if (c > majCount) { maj = u; majCount = c; }
  }
  const total = photoIds.length || 1;
  const ratio = majCount / total;
  return { 
    counts, 
    majorityUnit: maj, 
    majorityCount: majCount, 
    majorityRatio: ratio 
  };
}

export function computeAutoPickMinority(
  photoIds: string[], 
  assignment: Record<string, UnitId>
) {
  const { majorityUnit, majorityRatio } = computeMajority(photoIds, assignment);
  
  if (majorityRatio < 0.7) {
    return { 
      autoPick: false, 
      selected: [] as string[], 
      majorityUnit, 
      majorityRatio 
    };
  }

  const selected = photoIds.filter(
    pid => (assignment[pid] ?? null) !== majorityUnit
  );
  
  return { autoPick: true, selected, majorityUnit, majorityRatio };
}

export function orderUnitButtons(base: UnitId[], sticky?: UnitId) {
  if (sticky == null) return base;
  const filtered = base.filter(u => u !== sticky);
  return [sticky, ...filtered];
}

export function useBucketUI(bucketId: string) {
  return useRescueStore(s => s.bucketUI[bucketId] ?? {});
}
```

---

### Mock数据生成器（lib/rescue/mock.ts）

```typescript
import type { BuildingBucket, PhotoMeta } from "./types";

type MockOptions = {
  seed?: number;
  buckets?: number;
  sessionsPerBucket?: number;
  photosPerSession?: number;
  noGpsPhotos?: number;
  noiseGpsPhotos?: number;
  majorityUnit?: "A" | "B" | "C";
  minorityChance?: number;
  minorityRatio?: number;
  sessionGapMinutes?: number;
  photoIntervalSeconds?: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function jitter(rnd: () => number, base: number, meters: number) {
  const deg = meters / 111_000;
  return base + (rnd() * 2 - 1) * deg;
}

function isoAddMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

function isoAddSeconds(iso: string, seconds: number) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

export function generateMockRescueData(opts: MockOptions = {}) {
  const {
    seed = 1337,
    buckets = 3,
    sessionsPerBucket = 12,
    photosPerSession = 80,
    noGpsPhotos = 200,
    noiseGpsPhotos = 0,
    majorityUnit = "A",
    minorityChance = 0.65,
    minorityRatio = 0.08,
    sessionGapMinutes = 120,
    photoIntervalSeconds = 45,
  } = opts;

  const rnd = mulberry32(seed);
  const photos: PhotoMeta[] = [];
  const bucketsOut: BuildingBucket[] = [];

  const unitLabels = [
    { unitId: "A" as const, label: "Unit A" },
    { unitId: "B" as const, label: "Unit B" },
    { unitId: "C" as const, label: "Unit C" },
  ];

  let t0 = "2025-07-23T18:00:00Z";

  // Generate building buckets
  for (let b = 0; b < buckets; b++) {
    const baseLat = 49.20 + rnd() * 0.10;
    const baseLng = -123.20 + rnd() * 0.30;

    const bucketId = `bucket_building_${b + 1}`;
    const label = `Building ${b + 1} – ${
      Math.round((1000 + rnd() * 9000) / 10) * 10
    } Example St`;

    const bucketPhotoIds: string[] = [];
    const sessions: Array<{ sessionId: string; photoIds: string[] }> = [];

    for (let s = 0; s < sessionsPerBucket; s++) {
      const sessionId = `sess_b${b + 1}_${s + 1}`;
      const sessionPhotoIds: string[] = [];

      const sessionStart = isoAddMinutes(
        t0, 
        (b * sessionsPerBucket + s) * sessionGapMinutes
      );

      const isMixed = rnd() < minorityChance;
      const otherUnits = (["A", "B", "C"] as const).filter(
        (u) => u !== majorityUnit
      );
      const minorityUnit = pick(rnd, otherUnits);

      const n = photosPerSession;
      const minorityCount = isMixed 
        ? Math.max(1, Math.floor(n * minorityRatio)) 
        : 0;

      const minorityStartIndex = isMixed 
        ? Math.floor(rnd() * (n - minorityCount)) 
        : -1;

      for (let i = 0; i < n; i++) {
        const pid = `p_${bucketId}_${sessionId}_${i}`;
        const takenAtUtc = isoAddSeconds(
          sessionStart, 
          i * photoIntervalSeconds + Math.floor(rnd() * 8)
        );

        const lat = jitter(rnd, baseLat, 40);
        const lng = jitter(rnd, baseLng, 40);

        photos.push({
          photoId: pid,
          localUri: "/placeholder.png",
          takenAtUtc,
          lat,
          lng,
          hasGps: true,
        });

        sessionPhotoIds.push(pid);
        bucketPhotoIds.push(pid);
      }

      sessions.push({ sessionId, photoIds: sessionPhotoIds });
    }

    bucketsOut.push({
      bucketId,
      label,
      photoIds: bucketPhotoIds,
      sessions,
      units: unitLabels,
    });
  }

  // NoGPS bucket
  if (noGpsPhotos > 0) {
    const noGpsIds: string[] = [];
    const sessionId = "sess_nogps";
    const sessionPhotoIds: string[] = [];
    const start = isoAddMinutes(
      t0, 
      buckets * sessionsPerBucket * sessionGapMinutes + 60
    );

    for (let i = 0; i < noGpsPhotos; i++) {
      const pid = `p_nogps_${i}`;
      const takenAtUtc = isoAddSeconds(
        start, 
        i * 30 + Math.floor(rnd() * 10)
      );
      
      photos.push({
        photoId: pid,
        localUri: "/placeholder.png",
        takenAtUtc,
        hasGps: false,
      });
      
      sessionPhotoIds.push(pid);
      noGpsIds.push(pid);
    }

    bucketsOut.push({
      bucketId: "bucket_unlocated",
      label: "Unlocated (No GPS)",
      photoIds: noGpsIds,
      sessions: [{ sessionId, photoIds: sessionPhotoIds }],
    });
  }

  // Optional noise GPS bucket
  if (noiseGpsPhotos > 0) {
    const noiseIds: string[] = [];
    const sessionId = "sess_noise";
    const sessionPhotoIds: string[] = [];
    const start = isoAddMinutes(
      t0, 
      buckets * sessionsPerBucket * sessionGapMinutes + 180
    );

    for (let i = 0; i < noiseGpsPhotos; i++) {
      const pid = `p_noise_${i}`;
      const takenAtUtc = isoAddSeconds(
        start, 
        i * 35 + Math.floor(rnd() * 10)
      );
      
      const lat = 49.10 + rnd() * 0.25;
      const lng = -123.40 + rnd() * 0.60;

      photos.push({
        photoId: pid,
        localUri: "/placeholder.png",
        takenAtUtc,
        lat,
        lng,
        hasGps: true,
      });
      
      sessionPhotoIds.push(pid);
      noiseIds.push(pid);
    }

    bucketsOut.push({
      bucketId: "bucket_noise",
      label: "Noise / Scattered GPS",
      photoIds: noiseIds,
      sessions: [{ sessionId, photoIds: sessionPhotoIds }],
    });
  }

  return { photos, buckets: bucketsOut };
}

/**
 * Convenience presets for UI performance testing.
 */
export const MockPresets = {
  small: () => generateMockRescueData({ 
    buckets: 2, 
    sessionsPerBucket: 6, 
    photosPerSession: 40, 
    noGpsPhotos: 40 
  }),
  
  medium1k: () => generateMockRescueData({ 
    buckets: 3, 
    sessionsPerBucket: 8, 
    photosPerSession: 45, 
    noGpsPhotos: 80 
  }),
  
  large5k: () => generateMockRescueData({ 
    buckets: 6, 
    sessionsPerBucket: 14, 
    photosPerSession: 55, 
    noGpsPhotos: 200, 
    noiseGpsPhotos: 200 
  }),
  
  huge20k: () => generateMockRescueData({ 
    buckets: 10, 
    sessionsPerBucket: 20, 
    photosPerSession: 90, 
    noGpsPhotos: 800, 
    noiseGpsPhotos: 800 
  }),
};
```

---

## 📱 页面代码实现

### 1) app/rescue/layout.tsx

```typescript
import React from "react";
import RescueWizardLayout from "@/components/rescue/RescueWizardLayout";

export default function RescueLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <RescueWizardLayout>{children}</RescueWizardLayout>;
}
```

---

### 2) components/rescue/RescueWizardLayout.tsx

```typescript
"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

function stepFromPath(path: string) {
  if (path.endsWith("/rescue/new")) return 1;
  if (path.endsWith("/rescue/scan")) return 2;
  if (path.endsWith("/rescue/buckets")) return 3;
  if (path.includes("/rescue/buckets/")) return 4;
  if (path.endsWith("/rescue/confirm")) return 5;
  return 0;
}

export default function RescueWizardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const pathname = usePathname();
  const router = useRouter();
  const step = stepFromPath(pathname);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Self-Rescue Mode</div>
            <div className="text-lg font-semibold">
              Rescue your photo library
            </div>
          </div>

          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              const ok = confirm(
                "Exit Self-Rescue Mode? Your progress will be kept on this device."
              );
              if (ok) router.push("/");
            }}
          >
            Exit
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {step ? `${step} / 5` : ""}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-gray-900 transition-all"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500">
            Suggestions only. Nothing changes unless you confirm.
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

---

### 3) Dashboard入口卡片

**文件：** `components/rescue/RescueEntryCard.tsx`

```typescript
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function RescueEntryCard() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">
            Rescue your photo library
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Organize past photos by location & time.
            <span className="ml-2 text-gray-500">
              Nothing changes unless you confirm.
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="rounded-full border px-2 py-1">
              Offline-friendly
            </span>
            <span className="rounded-full border px-2 py-1">
              No silent changes
            </span>
            <span className="rounded-full border px-2 py-1">
              Undo available
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
            onClick={() => router.push("/rescue/new")}
          >
            Start Rescue
          </button>

          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              alert(
                [
                  "How Self-Rescue works:",
                  "1) Scan metadata (time & location)",
                  "2) Suggest building-level groups + work sessions",
                  "3) You assign / fix mixed sessions",
                  "4) Confirm to apply (undo available)",
                ].join("\n")
              );
            }}
          >
            Learn how
          </button>
        </div>
      </div>
    </div>
  );
}
```

**用法：**

```typescript
// app/page.tsx (or dashboard component)
import RescueEntryCard from "@/components/rescue/RescueEntryCard";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <RescueEntryCard />
      {/* other dashboard cards... */}
    </main>
  );
}
```

---

## 🚀 开工建议

### MVP优先级

**必须有：**
- [ ] Source → Scan → Bucket List → Bucket Detail（sessions assign + Fix）→ Confirm
- [ ] Auto-pick minority + Sticky destination

**可以后放：**
- [ ] Unlocated的高级整理（先只放一个列表+数量）
- [ ] 更复杂的地图视图（先不做）
- [ ] 批量重命名/导出（先不做）

---

### 开工步骤

**Step 1: 按Tickets做T1–T6，把页面骨架跑起来**
```
预计：3-5天
```

**Step 2: T7–T11把"一键分配 + Fix体验"做成MVP亮点**
```
预计：3-4天
```

**Step 3: T12上Confirm/Apply/Undo（可先假实现，后接后端）**
```
预计：2-3天
```

---

### Mock → 真实实现的替换点

**1. mockScanResult()未来替换成：**
```
本地选取文件 → exif提取 → 送后端聚类 → 返回buckets/sessions
```

**2. alert("Mock apply")替换成：**
```
POST /api/rescue/apply → 返回UndoToken
```

**3. Drawer的"timeline strip"未来替换成：**
```
真缩略图（localUri / objectURL）
```

---

### 性能小提醒

当你上到large5k / huge20k，这两点会立刻变成瓶颈：

**1. SessionTimelineDrawer的缩略图网格不能一次渲染几千张**
```
→ 用slice(0, 48)只是临时
→ 后面要做虚拟列表（react-virtual / simple windowing）
```

**2. selectedPhotoIds.includes(pid)在大数组会慢**
```
→ selection用Set存
→ 渲染时用selectedSet.has(pid)
```

---

## 📊 UI组件清单

### 核心组件

- [ ] RescueEntryCard（Dashboard入口）
- [ ] RescueWizardLayout（带进度条）
- [ ] SourcePicker
- [ ] ScanProgress
- [ ] BucketList
- [ ] BucketCard
- [ ] BucketDetailHeader
- [ ] UnitsBar
- [ ] SessionsList
- [ ] SessionCard
- [ ] SessionTimelineDrawer
- [ ] TimelineStrip
- [ ] MoveToolbar
- [ ] ConfirmApplyPage
- [ ] UndoBanner

---

## 🧪 压测方案

### 使用Mock预设

```typescript
import { MockPresets } from "@/lib/rescue/mock";

// 在app/rescue/scan/page.tsx里：

// 小数据集（~240 photos）
const { photos, buckets } = MockPresets.small();

// 中等数据集（~1k photos）
const { photos, buckets } = MockPresets.medium1k();

// 大数据集（~5k photos）
const { photos, buckets } = MockPresets.large5k();

// 超大数据集（~20k photos）
const { photos, buckets } = MockPresets.huge20k();

setScanResult(photos, buckets);
router.push("/rescue/buckets");
```

---

### 压测验收标准

**Buckets list：**
- [ ] 10个bucket是否卡顿
- [ ] 滚动性能

**Bucket detail：**
- [ ] 20 sessions是否顺畅
- [ ] 一键分配响应速度

**Drawer：**
- [ ] 多选性能
- [ ] Auto-pick响应速度

---

## 💬 实施建议

### 给前端团队的关键提醒

**1. 状态管理核心原则：**
```
photoToSession = 唯一真相源（membership）
photoAssignment = 唯一真相源（unit归属）
session.assignment = 派生状态（用于显示）
```

**2. 不变量验证：**
```
INV-A: 一个photoId不能在两个session
INV-B: 一个photoId不能有两个assignment
INV-C: suggestion字段永远不能写入final字段
```

**3. 性能关键点：**
```
- 使用Set存储selection（不用Array）
- 虚拟列表处理大量缩略图
- 避免在render内做复杂计算（用useMemo）
```

---

## 📝 一句话验收标准

```
同楼三户contractor能在UI里：
1. 看到buckets自动聚类
2. 用Fix按钮2秒解决串门
3. Confirm前清楚知道会发生什么
4. Apply后能Undo

这就是成功
```

---

**文档版本：** v1.0  
**创建人：** CPO + 前端团队  
**审核人：** CTO  
**执行人：** 前端团队  
**生效日期：** 2026-02-07  
**预计完成：** 8-12天

---

Self-Rescue Mode：让contractor第一次把自己的人生相册救回来！🎯
