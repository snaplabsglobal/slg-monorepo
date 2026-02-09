# JSS Self-Rescue Mode 完整技术规格（CTO执行版）

> **文档类型：** 技术规格 + 实施清单 + 产品哲学  
> **关联文档：** 260207_JSS离线功能与SmartTrace完整技术规格_CTO执行版.md  
> **创建时间：** 2026-02-07  
> **优先级：** 🟡 P1 - 核心功能（Onboarding关键路径）  
> **执行人：** CTO + 前后端团队

---

## 📋 执行摘要

**产品定位：**
> Self-Rescue Mode不是"迁移工具"，而是"让contractor第一次把自己的人生数字资产整理清楚"的工具。

**核心原则：**
```
默认什么都不做
每一步都是"我自己点的"
处理的是"我自己的照片"
```

**不是什么：**
- ❌ 不是挖CompanyCam墙脚的工具
- ❌ 不是AI自动归档系统
- ❌ 不是迁移助手

**是什么：**
- ✅ 是contractor"拯救自己"的工具
- ✅ 是把bash脚本变成UI的升级版
- ✅ 是"秩序感上瘾"的起点

---

## 🎯 产品哲学与边界

### CEO的原始需求

**CEO原话：**
> "我只想整理相册，拯救自己。我自己也写过一些bash把照片根据GPS分类归档。"

**CPO判断：**
> 这不是"AI决定历史"，而是一个非常朴素、非常工程师、非常contractor的需求："我自己都快被这些照片搞疯了，我只是想把它们整理一下。"

---

### 正确定义（产品宪法）

**Self-Rescue Mode = Human-in-the-loop 的证据整理加速器**

**三条铁律：**

**🧠 铁律1：默认什么都不做**
```
进来只是：
- 扫描
- 看
- 理解

❌ 不自动改
❌ 不自动归档
❌ 不"系统帮你做主"
```

**👆 铁律2：每一步都是"我自己点的"**
```
分组是：建议分组
归档是：你点确认
改错是：你随时能撤

这和你跑bash脚本的心理状态是一模一样的
```

**📁 铁律3：它处理的是"我自己的照片"**
```
来源可以是：
- 手机相册
- 硬盘
- 旧项目导出

但语义永远是：
"我在整理我自己的东西"

而不是：
"JSS在帮我分析别人的系统"
```

---

### 为什么这个想法会赢

**CPO分析：**

**1. 抓到了被忽略10年的真实时刻**

```
大多数contractor的数字轨迹：

前几年：
手机拍、WhatsApp传、Dropbox丢

后几年：
用了CompanyCam/其他工具

现在：
相册 = 垃圾堆

他们最痛的那一刻不是"换软件"
而是某天突然意识到：
"我这十几年的工地照片，全乱了。"
```

**2. "秩序感上瘾"，不是工具粘性**

```
一个contractor真正会爱上的软件
不是因为功能多

而是因为某一天他发现：
"这个软件，让我第一次把事情理顺了。"

这是秩序感上瘾，不是工具粘性
```

**3. CEO原话（100%成立）：**
> "如果contractor一开始就用JSS把自己相册先拯救了，以后工作变很有调理，他一定会爱上我们的JSS"

**CPO确认：**
> 这不是销售转化，这是行为转化。

---

## 📐 完整UI流程（5步·人类主导版）

### 定位一句话

```
Self-Rescue Mode helps you organize your own photos
— nothing changes unless you confirm.
```

---

### Step 0｜入口（不是功能，是一种"模式"）

**入口位置（非常重要）：**

```
❌ 不要藏在Settings
❌ 不要写成Import Tool

✅ 放在onboarding/首页显眼位置：

"Rescue your photo library"
Get your past under control before starting fresh.
```

**心理暗示：**
> 这是你为自己做的一件事，不是"迁移工具"，不是"分析别人的系统"

---

### Step 1｜选择"我自己的照片来源"

**UI文案（一定要克制）：**

```
Where are your photos coming from?

☐ Phone / Camera Roll
☐ Local folder (zip / drag & drop)
☐ External drive
☐ Exported project folders

We don't connect to other apps.
You choose what to bring in.
```

**🔒 信任点：**

```
明确写：
"JSS never logs into other apps or systems."

这一步就把你和COO的
"CompanyCam腹地"彻底切开了
```

---

### Step 2｜只做一件事：扫描 & 看清

**画面结构：**

```
左边：进度条
右边：实时统计（非常爽）

Scanning your photos…

3,482 photos found
2,917 with GPS
565 without location
Date range: 2019 – 2025
```

**📌 重要规则：**

```
不出现任何：
- 项目名
- 归属判断
- "系统认为"

只是在回答一个问题：
"我到底有多少东西？"

这是第一层"秩序感"
```

---

### Step 3｜建议分组（但不叫"归档"）

**UI标题（关键）：**

```
Suggested groups (nothing applied yet)
```

**副标题一定要写清楚：**

```
These are suggestions based on location & time.
Review them before doing anything.
```

**分组方式（和bash一模一样）：**

```
每一组显示为：

Group A
📍 West 41st Ave area
🕒 Jan–Mar 2023
📷 186 photos

【Preview】
```

**点Preview进去：**
- 照片时间线
- 地图小点（不是项目）
- 没有任何"这是某某项目"的强说法

**📌 这里系统只说事实：**
- 地点相近
- 时间连续
- 不命名、不下结论

---

### Step 4｜你来命名，你来决定

**这是灵魂步骤**

**UI文案：**

```
What do you want to do with this group?
```

**按钮只有三种：**

```
【Name this project】
【Keep unassigned for now】
【Skip this group】
```

**如果点Name this project：**
- 输入框（你打字）
- 可选：地址/客户名
- 系统不自动填

**🧠 心理变化发生在这里：**
> "哦，这是我自己在建立秩序。"

**这一步，是ownership的诞生点**

---

### Step 5｜确认执行（最后一道闸）

**最终确认页（一定要有）：**

**标题要非常直白：**

```
You're about to organize your photos
```

**列清楚：**

```
4 groups will be named as projects
1,240 photos will be organized
0 photos will be deleted
```

**底部一句话（必须写）：**

```
Nothing changes until you click Confirm.
```

**按钮：**
```
【Confirm & apply】
【Go back】
```

**📌 执行时给一个明显的动画/进度**
> 让用户"感受到这件事发生了"

---

### 整个流程的三条"护城河规则"

**🛑 Rule 1：任何一步都可以停**
```
- 关页面
- 下次再来
- 不会半自动完成
```

**🛑 Rule 2：系统永远不"替你命名"**
```
- 项目名 = 人类输入
- 地址 = 可选
- 系统不猜客户是谁
```

**🛑 Rule 3：这是一次"整理"，不是"迁移"**
```
- 不讲竞品
- 不讲搬家
- 不讲替换

你是在整理你的人生照片
不是在切换软件
```

---

## 🔧 地址反向解析预填名（COO建议的正确实现）

### COO的建议

**原文：**
> "手工起名的痛点优化：如果师傅手机里有5个工地，每次都要手打名字很痛苦。建议引入'地址反向解析'。效果：智踪算出坐标后，直接在起名处预填入'Burnaby - 4500 Kingsway'这样的地址。师傅如果觉得对，点一下就行；想改再手工改。"

---

### CPO定性

**✅ 可以做，而且是"人性化优化"**

**关键边界：**

```
地址反向解析 → 预填"建议名称"
✔️ 可以做
✔️ 而且是"人性化优化"
❌ 不是自动命名
❌ 不是系统决定

"系统不能替人下结论，只能降低人的操作成本"

地址预填是"降低输入成本"，不是"替你命名"
这和Smart Trace的"建议而非决定"是完全同一类行为
```

---

### UI实现（精细交互）

**UI标题（一定要这样写）：**

```
Name this group (suggestion below)
```

**副标题：**

```
This is just a suggestion based on location.
You can change it.
```

**输入框行为（重点）：**

```
[ Burnaby – 4500 Kingsway ]  ← 预填（可编辑）
```

**规则非常关键：**

**✅ 合法行为：**
- 系统预填地址字符串
- 用户：直接按Enter（接受）、修改部分、全删重写

**❌ 明确禁止：**
- 自动跳过命名
- 自动确认
- 没人类输入就进入下一步

---

### 交互状态机（命名单组）

```typescript
enum NamingState {
  EMPTY,              // 尚未处理
  SUGGESTED_SHOWN,    // 展示预填建议
  USER_EDITING,       // 用户修改中
  USER_CONFIRMED,     // 用户确认
  SKIPPED             // 用户选择跳过
}
```

**迁移逻辑：**

```
EMPTY
  → SUGGESTED_SHOWN
    → USER_CONFIRMED   (直接接受)
    → USER_EDITING → USER_CONFIRMED
    → SKIPPED
```

**📌 只有USER_CONFIRMED：**
- 才允许写userProjectName
- 才算这个group"完成"

---

## 💻 后端模块设计（GPS/时间聚类）

### 目标

```
把一堆照片按"地点相近 + 时间连续"分成若干组（groups）
只输出建议，不做任何归档决定
```

---

### 输入/输出契约

**输入（最小）：**

```typescript
type RescuePhoto = {
  photoId: string
  takenAtUtc: string  // ISO
  lat?: number
  lng?: number
  accuracyM?: number  // optional
}
```

**输出（建议分组）：**

```typescript
type PhotoGroupSuggestion = {
  groupId: string
  photoIds: string[]
  centroid: { lat: number; lng: number }
  dateRange: { start: string; end: string }
  stats: {
    count: number
    gpsCount: number
    noGpsCount: number
    spanMinutes: number
  }
  suggestedAddress?: {
    formatted: string
    source: "reverse_geocode"
    confidence: "low" | "medium"
  }
}
```

---

### 核心原则（CEO的bash精神）

```
✅ 不追求完美归类
   宁可多分几组，也别把不同工地混一起

✅ 人类主导
   组只是建议，用户命名确认才成立

✅ 稳定可解释
   每组能解释"为什么归在一起"
   （距离阈值/时间阈值）
```

---

### 聚类两阶段（推荐）

**Stage A：地点聚类（Location Clustering）**

**算法选择：** DBSCAN（地理距离）

**优点：**
- 不用预先知道有几个工地
- 对contractor的"几个工地"天然匹配

**参数建议：**
```
eps = 80m     // 室内漂移 + 同一物业范围
minPts = 6    // 少于6张的散点容易是路上/杂拍
```

**距离计算：** Haversine（球面距离）

---

**Stage B：时间切分（Temporal Segmentation）**

**规则：**
- 同一地点簇里，按时间"断层"切分成多个组
- 防止同一地址跨月拍摄被混在一起

**参数建议：**
```
gapMinutes = 12 * 60  // 12小时

同一天多次进出工地仍然会在一起
跨天/隔周的，很可能是不同阶段，拆开更好review
```

**输出：**
```
(locationClusterId + segmentIndex) => groupId
```

---

### 没有GPS的照片怎么办（别丢掉！）

**分三类处理：**

**1. noGPS but has takenAt：**
```
如果用户在某天只有一个主要cluster
且noGPS照片时间落在该cluster的时间窗附近（±30min）
可以标记为"可附加建议"

但仍然不要自动加入组，只做提示
```

**2. 完全无信息（无GPS、时间异常）：**
```
进入"Unlocated / Needs review"组
```

**3. GPS极不可信（accuracy很大/0,0/outlier）：**
```
当作noGPS
```

**这一步是"证据可信度"叙事的一部分：**
> 系统宁可说"不知道"

---

### Reverse Geocoding（地址预填名）

**只对每个group的centroid调一次反向解析（节省成本）：**

```typescript
返回formatted，例如：
"Burnaby – 4500 Kingsway"

confidence只能是low/medium
（Phase 1不要"high"，避免"替你决定"的语义）

严格缓存：
(roundedLatLng) -> address

rounded到5位小数（约1m级别）
或4位（约11m）
```

---

### API设计（最小3个接口）

**1) 创建rescue session**
```
POST /api/rescue/sessions
返回：sessionId
```

**2) 上传照片元数据/索引（不用先传图）**
```
POST /api/rescue/sessions/{sessionId}/photos
body: RescuePhoto[]
```

**3) 生成建议分组**
```
POST /api/rescue/sessions/{sessionId}/suggest-groups
returns: PhotoGroupSuggestion[]
```

**注意：**
> 这一步只处理metadata，不碰SnapEvidence的拍照上传管线，避免污染Phase 1核心

---

## 📝 完整TypeScript实现（可直接用）

### 文件：rescueClustering.ts

```typescript
/* rescueClustering.ts
   Self-Rescue Mode: GPS/time clustering suggestions
   - Offline/online irrelevant: operates on metadata only
   - Outputs suggestions; does NOT auto-assign or name
*/

export type RescuePhoto = {
  photoId: string;
  takenAtUtc: string; // ISO string
  lat?: number;
  lng?: number;
  accuracyM?: number; // optional
};

export type ClusterConfig = {
  epsMeters: number;        // e.g. 80
  minPts: number;           // e.g. 6
  gapMinutes: number;       // e.g. 12*60
  maxAccuracyM?: number;    // optional: treat worse as "noGPS"
};

export type PhotoGroupSuggestion = {
  groupId: string;
  photoIds: string[];
  centroid: { lat: number; lng: number };
  dateRange: { start: string; end: string };
  stats: {
    count: number;
    gpsCount: number;
    noGpsCount: number;
    spanMinutes: number;
  };
};

type GeoPoint = { lat: number; lng: number };

// -------------------- utils --------------------

export function isValidLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  // Reject common bogus values
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function parseTimeMs(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error(`Invalid takenAtUtc: ${iso}`);
  return t;
}

export function minutesDiff(aIso: string, bIso: string): number {
  const a = parseTimeMs(aIso);
  const b = parseTimeMs(bIso);
  return Math.abs(b - a) / 60000;
}

export function spanMinutes(photos: RescuePhoto[]): number {
  if (photos.length <= 1) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const p of photos) {
    const t = parseTimeMs(p.takenAtUtc);
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return (max - min) / 60000;
}

export function dateRange(photos: RescuePhoto[]): { start: string; end: string } {
  let minT = Infinity;
  let maxT = -Infinity;
  let minIso = photos[0]?.takenAtUtc ?? new Date(0).toISOString();
  let maxIso = minIso;

  for (const p of photos) {
    const t = parseTimeMs(p.takenAtUtc);
    if (t < minT) {
      minT = t;
      minIso = p.takenAtUtc;
    }
    if (t > maxT) {
      maxT = t;
      maxIso = p.takenAtUtc;
    }
  }
  return { start: minIso, end: maxIso };
}

export function centroid(photos: RescuePhoto[]): GeoPoint {
  // mean of lat/lng (good enough at neighborhood scale)
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;

  for (const p of photos) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    sumLat += p.lat;
    sumLng += p.lng;
    n += 1;
  }
  if (n === 0) throw new Error("Cannot compute centroid: no GPS points");
  return { lat: sumLat / n, lng: sumLng / n };
}

// Haversine distance in meters
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// deterministic-ish id for groups (ok for suggestion IDs)
export function makeGroupId(prefix = "grp"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// -------------------- DBSCAN --------------------

type DbscanLabel = 0 | 1 | 2; // 0=unvisited, 1=noise, 2=clustered

function regionQuery(
  points: RescuePhoto[],
  idx: number,
  epsMeters: number
): number[] {
  const p = points[idx];
  const out: number[] = [];
  const a = { lat: p.lat as number, lng: p.lng as number };

  for (let j = 0; j < points.length; j++) {
    if (j === idx) continue;
    const q = points[j];
    const b = { lat: q.lat as number, lng: q.lng as number };
    const d = haversineMeters(a, b);
    if (d <= epsMeters) out.push(j);
  }
  return out;
}

/**
 * DBSCAN clustering for geo points.
 * Returns array of clusters, each cluster is array of indices into the 'points' array.
 * Noise points are excluded (returned as separate array via .noiseIndices)
 */
export function dbscanGeo(
  points: RescuePhoto[],
  cfg: { epsMeters: number; minPts: number }
): { clusters: number[][]; noiseIndices: number[] } {
  const { epsMeters, minPts } = cfg;

  const labels: DbscanLabel[] = new Array(points.length).fill(0);
  const clusterIdOf: number[] = new Array(points.length).fill(-1);
  const clusters: number[][] = [];

  let clusterId = 0;

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== 0) continue; // already processed
    labels[i] = 1; // mark as noise tentatively

    const neighbors = regionQuery(points, i, epsMeters);
    // In DBSCAN, minPts typically includes the point itself
    if (neighbors.length + 1 < minPts) {
      // remains noise
      continue;
    }

    // create new cluster
    clusters.push([]);
    const queue = [i, ...neighbors];
    labels[i] = 2;
    clusterIdOf[i] = clusterId;

    while (queue.length) {
      const curr = queue.shift() as number;

      if (labels[curr] === 1) {
        // previously noise, now becomes part of cluster
        labels[curr] = 2;
        clusterIdOf[curr] = clusterId;
      }
      if (labels[curr] !== 2) {
        labels[curr] = 2;
        clusterIdOf[curr] = clusterId;
      }

      const currNeighbors = regionQuery(points, curr, epsMeters);
      if (currNeighbors.length + 1 >= minPts) {
        for (const nIdx of currNeighbors) {
          if (labels[nIdx] === 0 || labels[nIdx] === 1) {
            queue.push(nIdx);
          }
        }
      }
    }

    // materialize cluster indices
    const clusterIndices: number[] = [];
    for (let k = 0; k < clusterIdOf.length; k++) {
      if (clusterIdOf[k] === clusterId) clusterIndices.push(k);
    }
    clusters[clusterId] = clusterIndices;
    clusterId++;
  }

  const noiseIndices: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) noiseIndices.push(i);
  }

  return { clusters, noiseIndices };
}

// -------------------- temporal split --------------------

/**
 * Split a set of photos (already close in location) into segments by time gaps.
 * - Sorts by takenAtUtc ascending
 * - Splits when gap between adjacent photos > gapMinutes
 */
export function temporalSplit(
  photos: RescuePhoto[],
  gapMinutes: number
): RescuePhoto[][] {
  if (photos.length === 0) return [];
  const sorted = [...photos].sort(
    (a, b) => parseTimeMs(a.takenAtUtc) - parseTimeMs(b.takenAtUtc)
  );

  const groups: RescuePhoto[][] = [];
  let current: RescuePhoto[] = [];

  for (const p of sorted) {
    if (current.length === 0) {
      current.push(p);
      continue;
    }
    const prev = current[current.length - 1];
    const gap = minutesDiff(prev.takenAtUtc, p.takenAtUtc);
    if (gap > gapMinutes) {
      groups.push(current);
      current = [p];
    } else {
      current.push(p);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

// -------------------- top-level suggestions --------------------

export function suggestGroups(
  allPhotos: RescuePhoto[],
  config: ClusterConfig
): {
  groups: PhotoGroupSuggestion[];
  unlocatedPhotoIds: string[];
  noiseGpsPhotoIds: string[];
} {
  const { epsMeters, minPts, gapMinutes, maxAccuracyM } = config;

  const gps: RescuePhoto[] = [];
  const unlocated: RescuePhoto[] = [];

  for (const p of allPhotos) {
    const hasGps =
      typeof p.lat === "number" &&
      typeof p.lng === "number" &&
      isValidLatLng(p.lat, p.lng) &&
      (typeof maxAccuracyM !== "number" ||
        typeof p.accuracyM !== "number" ||
        p.accuracyM <= maxAccuracyM);

    if (hasGps) gps.push(p);
    else unlocated.push(p);
  }

  const { clusters, noiseIndices } = dbscanGeo(gps, { epsMeters, minPts });

  // build groups: temporal split per cluster
  const groupSuggestions: PhotoGroupSuggestion[] = [];
  for (const clusterIdxs of clusters) {
    const clusterPhotos = clusterIdxs.map((i) => gps[i]);
    const segments = temporalSplit(clusterPhotos, gapMinutes);

    for (const seg of segments) {
      const c = centroid(seg);
      const dr = dateRange(seg);
      const stats = {
        count: seg.length,
        gpsCount: seg.length,
        noGpsCount: 0,
        spanMinutes: spanMinutes(seg),
      };

      groupSuggestions.push({
        groupId: makeGroupId("grp"),
        photoIds: seg.map((x) => x.photoId),
        centroid: c,
        dateRange: dr,
        stats,
      });
    }
  }

  const noiseGpsPhotoIds = noiseIndices.map((i) => gps[i].photoId);
  const unlocatedPhotoIds = unlocated.map((p) => p.photoId);

  return {
    groups: groupSuggestions,
    unlocatedPhotoIds,
    noiseGpsPhotoIds,
  };
}
```

---

## 🏢 同楼多户+串门处理方案

### 真实场景（CEO原话）

> "我在一栋building同一层楼做了三户人家装修，GPS可能都归在一起，但是主要时间是不一样的。但有时候也回串，意思是我在给A装修的时候，B要我去他家estimate。"

---

### CPO分析

**先承认现实：GPS在同一栋楼里没法分户**

```
同层三户，GPS centroid几乎一样
室内定位漂移20–80m都正常

结论：
地理聚类只负责"楼/地块级"
不要试图"分户级"
```

---

### 正确策略：Building Bucket + Sessions + Quick Reassign

**把处理拆成三层，每层都很"人类友好"**

**Layer A：先聚到一个"Building Bucket"**

```
你会得到一个组：
"Burnaby – 4500 Kingsway (Building) / 1,200 photos"

这一步是正确的：
先把照片从"垃圾堆"救出来
至少归到"这栋楼"
```

**Layer B：在Bucket内做"时间切片"**

```
建议：在building bucket内生成work sessions：

规则：相邻照片间隔 > 45–90分钟 → 新session

每个session是一个时间段（比如10:00–11:30）

这不会解决"串门"
但会把整理工作变得像整理行程一样
```

**Layer C：让用户用"超轻确认"把session归到A/B/C**

```
关键交互不是让你命名每张图
而是让你对session做一次选择：

Session 10:00–11:30 / 58 photos
Suggested: Unit A (last used)
[A] [B] [C] [Unassigned]

你点一次，全session就归过去
```

**串门怎么处理？**

```
如果session里确实混了两户
（比如你去B估价只拍了5张）

你就需要一个"拆出来"的动作：

Split（拆分）
按时间轴拖动选区 / 或选5张
→ Move to Unit B

这才是"真实世界"的解法：
不是要求算法完美
而是把纠错成本压到很低
```

---

### 数据结构补丁

```typescript
export type BuildingBucket = {
  bucketId: string;
  centroid?: { lat: number; lng: number };
  suggestedLabel?: string;  // "Burnaby – 4500 Kingsway (Building)"
  photoIds: string[];
  
  // created by time slicing
  sessions: RescueSessionSegment[];
  
  // optional: user-defined unit list
  units?: Array<{ unitId: string; label: string }>; // e.g. A/B/C
};

export type RescueSessionSegment = {
  sessionId: string;
  photoIds: string[];
  dateRange: { start: string; end: string };
  count: number;
  
  // human decision
  assignment: {
    status: "unassigned" | "assigned";
    unitId?: string;  // A/B/C
  };
  
  // UX helper (NOT a decision)
  suggestion?: {
    type: "last_used_unit";
    unitId: string;
  };
};
```

---

### "Last Used Unit"作为默认（非常省事）

**逻辑（非常简单，但很爽）：**

```
维护一个lastUsedUnitId（bucket scope）

新session默认suggestion = lastUsedUnitId

用户点了B，lastUsedUnitId立即变成B

后面的session继续建议B
```

**这不是AI，这是"记住你刚才干了啥"**

---

## 🎯 Auto-pick Minority Photos（小核弹级体验）

### 目标

```
当一个session里出现"A为主，但混了少量B/C/Unassigned"
用户不想手动找那几张

我们要做到：
打开Review → 系统默认已经选好了那几张"异类"
→ 你点一次Move完成
```

**这不是自动归档，因为：**
- 系统只选中，不执行
- 你必须点Move/Split才会生效

---

### 触发条件（很保守）

**在SessionCard显示Mixed时，出现一个按钮：**

```
【Fix (5)】

括号数字 = "少数派张数"（例如5张）

点击进入Drawer后触发auto-pick
```

---

### 少数派定义（算法很简单但很有效）

**对session内所有照片统计归属分布：**

```
A: 53
B: 5
Unassigned: 0

多数派 = 53张的A
少数派 = 5张的B
```

**选中规则（只选少数派）：**

```
如果存在明确多数派（占比≥70%）：
  自动选中所有"非多数派"的照片

如果没有明确多数派（例如A 20/B 18/C 15）：
  不自动选中任何
  
  Drawer顶部提示：
  "This session is truly mixed 
   — please select photos manually."
```

**✅ 这样就不会"装懂"，也不会误导**

---

### UI行为

**Drawer顶部提示条（必须有）：**

```
当auto-pick生效：

We selected 5 photos that don't match 
the main group (A).
Nothing will change until you move them.

按钮（右侧）：
【Clear selection】
```

**这句话把"边界"钉死：不越界、不暗改**

---

### 代码逻辑

```typescript
type UnitId = "A" | "B" | "C" | null; // null = Unassigned

function computeMajorityAndMinority(
  photoIds: string[], 
  photoAssignment: Record<string, UnitId>
) {
  const counts = new Map<UnitId, number>();
  for (const pid of photoIds) {
    const u = photoAssignment[pid] ?? null;
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }

  // find majority
  let majorityUnit: UnitId = null;
  let majorityCount = 0;
  let total = photoIds.length;

  for (const [u, c] of counts.entries()) {
    if (c > majorityCount) {
      majorityCount = c;
      majorityUnit = u;
    }
  }

  const majorityRatio = total === 0 ? 0 : majorityCount / total;

  // Only auto-pick if majority is strong
  if (majorityRatio < 0.7) {
    return { 
      majorityUnit, 
      majorityRatio, 
      autoPick: false, 
      selected: [] as string[], 
      counts 
    };
  }

  const selected = photoIds.filter(
    pid => (photoAssignment[pid] ?? null) !== majorityUnit
  );
  
  return { 
    majorityUnit, 
    majorityRatio, 
    autoPick: true, 
    selected, 
    counts 
  };
}
```

---

## 🔄 Sticky Destination（上次去哪，这次先放那）

### 一句话定义

```
当系统已经知道你刚刚把"少数派"移到了哪个unit
下一次再修Mixed，它就把那个unit放在第一位

不是自动移动，只是按钮顺序 + 默认焦点
```

---

### 它解决的真实痛点

**真实的操作节奏：**

```
Session 1：
在A干活 → 串去B估价 → Fix → Move to B

Session 2：
还是在A干活 → 又串去B估价 → Fix → 还得再点一次B
```

**Sticky destination的目的：**
> 第二次，你不用再找B了，它已经在你手指下面

---

### 规则非常克制

**Sticky只在这三种情况下生效：**
- 同一个Building Bucket内
- 你刚刚完成了一次明确的Move/Split操作
- 下一次进入Mixed Fix

**Sticky不会生效的情况：**
- 新bucket（新楼）
- 用户刷新页面（可选是否持久化）
- 多数派不足70%（系统已经选择"不自动选中"）

**也就是说：**
> 它是"顺着你的手走"，不是"系统自己想去哪"

---

### UX表现（非常低调）

**在Fix Drawer的MoveToolbar里：**

**原来按钮顺序：**
```
[A] [B] [C] [Unassigned]
```

**当Sticky destination = B时：**
```
[B] [A] [C] [Unassigned]
```

**并且：**
- 第一个按钮（B）有focus/highlight
- 但不会自动触发
- 你仍然可以点任何一个

---

### 状态存哪里（前端就够了）

```typescript
type BucketUIState = {
  bucketId: string;
  lastUsedUnitId?: UnitId;        // 用于session一键assign
  lastFixDestination?: UnitId;    // Sticky destination专用
};
```

**什么时候写入lastFixDestination：**

```typescript
function onMoveSelected(unitId: UnitId) {
  applyMove(unitId);
  bucketUI.lastFixDestination = unitId;
  bucketUI.lastUsedUnitId = unitId; // 顺便更新last used
}
```

---

## 📋 Implementation Checklist（工程验收清单）

### 0. Definitions & Invariants（Must-have）

**✅ Invariants：**

```
INV-A: 
一个photoId最多属于1个session
(photoToSession[photoId] is single-valued)

INV-B: 
一个photoId最多有1个unit assignment
(photoAssignment[photoId] single-valued, nullable)

INV-C: 
任何"suggestion"字段永远不会在没有明确用户动作的情况下
写入final fields
```

**✅ UX promises（copy必须存在于UI）：**

```
Display: "Nothing changes unless you confirm."
Display: "Suggestions only."

Confirm screen列出exactly what will change
（counts, groups）
```

---

### 1. Data Model & Store（Frontend）

**Core types：**

```
☐ 实现BuildingBucket, RescueSessionSegment, 
  RescuePlan, UndoToken

☐ Store tables:
  - sessionsById: Record<sessionId, {...}>
  - photoToSession: Record<photoId, sessionId>
  - photoAssignment: Record<photoId, unitId | null>
  - bucketUIState: { lastUsedUnitId?, lastFixDestination? }
```

**Derived display state：**

```
☐ sessionDisplayState(sessionId) returns:
  - Assigned(unitId) if all photos same assignment
  - Mixed if >1 assignment exists
  - Unassigned if all null
```

---

### 2. EXIF Ingestion & Metadata Normalization

**Extract fields：**

```
☐ 读取lat/lng为带符号的十进制（西经为负）

☐ 读取时间优先级：
  DateTimeOriginal → CreateDate → MediaCreateDate 
  → file mtime fallback

☐ 归一化为takenAtUtc
  （存储original offset如果可用；但比较必须work）
```

**Validations：**

```
☐ Reject invalid GPS (out of range / 0,0)

☐ Optional: 
  treat accuracyM > maxAccuracyM as noGPS
```

---

### 3. Bucketing（Geo Clustering）- Building/Parcel Level

**Backend或frontend worker：**

```
☐ 实现geo clustering
  （DBSCAN推荐in app；grid acceptable for bash/tool）

☐ 默认参数（config-driven）：
  - epsMeters = 60–100
  - minPts = 6

☐ 输出BuildingBucket with:
  - centroid
  - photoIds
```

**Reverse geocode（optional but recommended）：**

```
☐ Geocode bucket centroid only（不是per photo）

☐ Cache by rounded lat/lng

☐ 暴露为bucket.suggestedLabel 
  和/或 group.suggestedName（suggestion only）
```

---

### 4. Sessionization（Time Slicing Inside Bucket）

**Session split：**

```
☐ 对每个bucket，按时间排序photos
  并在gap > sessionGapMinutes时split

☐ 默认sessionGapMinutes = 60
  （config: 45/60/90）

☐ 创建RescueSessionSegment per session:
  - dateRange
  - count
  - photoIds
  - assignment.status = unassigned
```

**Edge cases：**

```
☐ Photos without time: 
  保留在"NoTime" session 或 Unassigned bucket section
```

---

### 5. Units（A/B/C）- User-defined

**Define units flow：**

```
☐ Optional step: 
  "This building looks like multiple units. Set units?"

☐ 默认units: A/B/C（editable labels）

☐ 存储units per bucket（bucket.units）
```

---

### 6. Session-level Assignment（One Tap）

**Actions：**

```
☐ assignSession(sessionId, unitId) must:
  - Set photoAssignment[pid] = unitId for all pid in session
  - Update bucketUIState.lastUsedUnitId = unitId
  - Recompute session display state immediately
```

**UI：**

```
☐ SessionCard shows:
  - time range + count
  - current state: Assigned/Mixed/Unassigned
  - one-tap buttons A/B/C/Unassigned
```

---

### 7. Mixed Detection & Fix Flow

**Mixed detection：**

```
☐ A session is Mixed if 
  assignments set contains >1 distinct value
```

**Fix entry：**

```
☐ SessionCard shows Fix (N) 
  where N = minorityCount if majority exists
```

---

### 8. Auto-pick Minority Photos（Selection Only）

**Majority logic（conservative）：**

```
☐ 计算session内assignments的分布

☐ 识别majority unit with max count

☐ Only auto-pick if majorityRatio >= 0.70

☐ If majority exists:
  - Auto-select all photos not in majority unit
  - Show banner: "Selected N photos that don't match 
    the main group. Nothing changes until you move them."

☐ If no strong majority:
  - Do not auto-select
  - Show message: "Truly mixed — select photos manually."
```

**Banner controls：**

```
☐ Button: "Clear selection"
```

---

### 9. Sticky Destination（Bucket-scoped）

**State：**

```
☐ bucketUIState.lastFixDestination stored per bucket
```

**Update rules：**

```
☐ On successful moveSelectedToUnit(unitId):
  - lastFixDestination = unitId
  - Also update lastUsedUnitId = unitId (optional but recommended)

☐ On splitCreateNewSession(..., unitId):
  - lastFixDestination = unitId
```

**UI behavior：**

```
☐ In Fix drawer toolbar:
  - Reorder unit buttons so lastFixDestination appears first
  - Focus/highlight first button
  - Never auto-trigger
```

**Scope & resets：**

```
☐ Sticky is per bucket（never cross-bucket）

☐ Optional: reset on page reload（safe default）
```

---

### 10. Split & Move Mechanics（Consistency-critical）

**Move selected（assignment only）：**

```
☐ moveSelectedToUnit(photoIds, unitId):
  - Update photoAssignment for selected
  - Do not change photoToSession membership
  - Session may become Mixed → OK
```

**Create new session from selected（membership change）：**

```
☐ splitToNewSession(sourceSessionId, selectedPhotoIds):
  - Remove selected from source session's photoIds
  - Create new session with selected
  - Update photoToSession for selected → new session id
  - Ensure no photo remains in both sessions
  - If source becomes empty → delete or hide source session
  - Optional: auto-assign new session to a chosen unit
    (explicit user click)
```

**Guardrails：**

```
☐ All membership mutations are atomic
  （single reducer transaction）

☐ Add assertions in dev build: 
  no duplicate photoIds across sessions
```

---

### 11. Plan + Confirm + Apply

**Draft plan generation：**

```
☐ Build RescuePlan.actions from current session assignments:
  - For each session: 
    create_project (unit-labeled) OR keep unassigned
```

**Confirm screen must show：**

```
☐ number of buckets/sessions affected
☐ number of photos to be organized
☐ zero deletions（always）
```

**Apply behavior：**

```
☐ Apply writes organization structure only
  never mutates original files

☐ Return UndoToken（valid for 24h）
```

---

### 12. Undo（24h）

**Undo semantics：**

```
☐ Undo restores organization state to pre-apply
  （structure only）

☐ No file deletions. No photo loss.
```

**UI：**

```
☐ After apply, show banner:
  "Rescue applied. Undo available for 24 hours."
  
  Button: Undo
```

---

### 13. QA Test Matrix（Must Pass）

**Basic：**

```
☐ NoGPS photos go to "Unlocated" bucket

☐ Same building multi-unit results in 
  1 bucket + multiple sessions

☐ Session one-tap assign updates all photos
```

**Mixed + Fix：**

```
☐ Mixed session with majority≥70% 
  shows Fix(N) and auto-selects minority

☐ Mixed session with no strong majority 
  does NOT auto-select
```

**Sticky：**

```
☐ After moving minority to B, 
  next Fix shows B first（same bucket only）

☐ Sticky does not carry to another bucket
```

**Split：**

```
☐ After split, no photo exists in two sessions (INV-A)

☐ After move, assignment is updated only for selected
```

**Apply/Undo：**

```
☐ Confirm screen accurate counts

☐ Apply creates structure

☐ Undo restores structure; no deletions
```

---

### 14. Logging（Debug-only, no PII）

```
☐ Log counts: 
  number of buckets/sessions, minority selection size

☐ Log invariant checks in dev builds
  （duplicates / missing mappings）
```

---

## 📝 Onboarding文案

### Screen 1

**English:**
```
Rescue your photo library
Get your past under control — before you start fresh.
```

**中文:**
```
先把相册救回来
整理清楚过去，再开始新的项目。
```

---

### Screen 2

**English:**
```
Nothing changes unless you confirm
We only suggest groups based on location & time.
You name it. You decide.
```

**中文:**
```
你不点确认，什么都不会改
我们只按地点和时间建议分组。
命名和决定都由你来。
```

---

### Screen 3

**English:**
```
Stop anytime
Close the page and come back later.
Your progress is saved.
```

**中文:**
```
随时停，随时回来
关掉页面也没关系。
进度会保存。
```

**按钮文案：**
- Primary: Start Rescue
- Secondary: Not now

---

## 🎯 预期效果

### 技术指标

```
聚类请求数：从N张 → N/100个组（节省99%请求）
整理速度：从手动数小时 → 几分钟
串门纠错：从手动找照片 → 2秒完成
```

---

### 用户体验

**关键时刻：**

```
一个contractor，周六晚上
打开电脑，用JSS Self-Rescue Mode
把过去3年的照片第一次按项目、时间、地点理清楚

第二天他会发生什么？

他会开始：
- 给新项目建对的结构
- 拍照更自觉
- 证据更有意识

然后有一天他说一句话：
"算了，我以后就用JSS拍吧。"

这不是销售转化，这是行为转化
```

---

### 战略意义

**CPO总结：**

> JSS isn't just for managing job sites. It's for getting your past back under control.

**中文更狠的版本：**

> "先把你的人生相册救回来，再谈什么项目管理。"

---

## 💬 CPO最后的话

### 给CEO的总结

**你们现在这条路，是：**
> 把LedgerSnap的"账务严谨"，用在了"相机这种最容易出事故的东西上"。这是对的，而且很狠。

---

### 给CTO的关键提醒

**这套系统已经形成一个非常完整的"人类级"系统：**

```
没有AI
没有猜测
没有自动归档

但你已经把一个现实中最难整理的场景
（同楼多户 + 串门）
压缩成了"Fix → 点一次 → Done"

这正是contractor会觉得"这玩意懂我"的地方
```

---

### 给团队的产品哲学

**Self-Rescue Mode的目标：**

```
不是"整理得多快"
而是"让人第一次感觉：秩序是我自己建立的"

这是对"群众路线"的极致贯彻：
不要试图改变师傅的行为（让他们去填表）
而是要用技术去适应他们的行为
```

---

### 一句话验收标准

```
同楼三户contractor能在周六晚上
用JSS整理完过去3年的照片
周日开始主动用JSS拍新项目

这就是成功
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** CTO + 前后端团队  
**生效日期：** 2026-02-07  
**预计完成：** Phase 1 - 3-4周

---

先把你的人生相册救回来，再谈什么项目管理！🎯
