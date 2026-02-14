# Eraser/Trim工具 - 快速执行清单

> **CTO 5分钟速查卡**  
> **预计工作量：** 3-4天  
> **优先级：** 🔴 P0 - Critical

---

## ⚡ 一句话目标

**不自动切断 + 明确删除意图 + Smart Trim**

**CPO原话：**
> "这一步直接把 PlanSnap 从'画图工具'推进到'施工级编辑器'。"

---

## 🎯 三层设计

### 第一层：默认行为
```
画线相交 → 不自动切断
视觉上只是交叉
避免误伤
```

### 第二层：橡皮工具（E）
```
E进入工具
Hover高亮可删部分
Click删除（整段或子段）
```

### 第三层：Smart Trim
```
有交点 → 只删hover的那一段
无交点 → 删整段
拆段发生在删除时，不是画线时
```

---

## 🔧 核心代码（Copy & Paste）

### 1. 数据结构

```typescript
type Segment = {
  id: string
  a: Pt
  b: Pt
  kind: 'wall' | 'line' | 'guide'
  locked?: boolean
}

type HoverTarget =
  | { type: 'none' }
  | { type: 'segment'; segId: string }
  | { type: 'subSegment'; segId: string; i0: number; i1: number }
```

---

### 2. Hover检测（核心）

```typescript
function findEraserHoverTarget(
  mouseWorld: Pt,
  segments: Segment[],
  options: {
    maxPickDistPx: number
    canEraseGuide: boolean
    viewScale: number
  }
): HoverTarget {
  let best: HoverTarget = { type: 'none' }
  let bestDist = Infinity

  for (const seg of segments) {
    if (seg.locked) continue
    if (seg.kind === 'guide' && !options.canEraseGuide) continue

    const { dist, t } = distPointToSegment(mouseWorld, seg)
    const distPx = dist * options.viewScale
    if (distPx > options.maxPickDistPx) continue

    // 如果该seg有交点：判定鼠标落在哪个"交点区间"
    const split = computeSplitParams(seg, segments)
    if (split.params.length <= 2) {
      best = { type: 'segment', segId: seg.id }
    } else {
      const [i0, i1] = locateInterval(split.params, t)
      best = { type: 'subSegment', segId: seg.id, i0, i1 }
    }
    bestDist = distPx
  }

  return best
}
```

---

### 3. 计算拆分参数

```typescript
function computeSplitParams(
  seg: Segment, 
  all: Segment[]
): { params: number[] } {
  const ts: number[] = [0, 1]

  for (const other of all) {
    if (other.id === seg.id) continue
    if (other.kind === 'guide') continue // Guide不参与拆分

    const hit = segmentIntersection(seg, other)
    if (!hit.hit) continue
    if (hit.t1 < 1e-6 || hit.t1 > 1 - 1e-6) continue

    ts.push(hit.t1)
  }

  // 去重+排序
  return { params: uniqueAndSortParams(ts) }
}
```

---

### 4. Click删除（Smart Trim）

```typescript
function eraseClick(
  hover: HoverTarget,
  segments: Segment[]
): EditOp[] {
  if (hover.type === 'none') return []

  if (hover.type === 'segment') {
    // 删整段
    return [{ op: 'deleteSegment', segId: hover.segId }]
  }

  // Smart Trim：拆+删中间一段
  const seg = segments.find(s => s.id === hover.segId)
  if (!seg) return []

  const split = computeSplitParams(seg, segments)
  const keptSegments = keepAllIntervalsExcept(
    seg, 
    split.params, 
    hover.i0, 
    hover.i1
  )

  return [{ 
    op: 'replaceSegment', 
    segId: seg.id, 
    newSegments: keptSegments 
  }]
}
```

---

## 📋 4天计划

### Day 1: Eraser基础（6小时）

- [ ] EraserTool基础结构
- [ ] E键工具切换
- [ ] distPointToSegment算法
- [ ] 基础hover检测
- [ ] Hover高亮渲染
- [ ] 整段删除逻辑

**验收：** E进入，hover高亮，click删除

---

### Day 2: Intersection和拆分（6小时）

- [ ] segmentIntersection算法
- [ ] computeSplitParams实现
- [ ] locateInterval实现
- [ ] 子段hover高亮渲染
- [ ] 测试多交点情况

**验收：** 子段hover正确，参数排序稳定

---

### Day 3: Smart Trim（6小时）

- [ ] keepAllIntervalsExcept实现
- [ ] eraseClick完整逻辑
- [ ] applyEditOps实现
- [ ] UndoManager集成
- [ ] 测试删除中间段

**验收：** Smart Trim功能完整，不误删

---

### Day 4: 完善和测试（4小时）

- [ ] Guide删除规则（Alt+E）
- [ ] Tooltip渲染
- [ ] Epic级回归测试
- [ ] 文档更新

**验收：** 所有DoD通过

---

## ✅ 验收清单

### 功能验收

- [ ] **E进入橡皮**
- [ ] **Hover高亮可删部分**
  - 整段或子段明确
- [ ] **Click删除**
  - 有交点：只删子段
  - 无交点：删整段
- [ ] **Undo/Redo可用**

---

### 安全验收

- [ ] **画线相交不自动切断**
- [ ] **Guide默认不可删**
  - 低对比高亮
  - Tooltip提示

---

### 体验验收

- [ ] **点之前能看懂会删哪段**
- [ ] **删除不需要确认框**
- [ ] **流畅操作**

---

## 🧪 快速测试用例

### TC-1: 基础删除
```
操作：E → hover线段 → click
期望：线段被删除，可Undo
```

### TC-2: 子段删除
```
操作：创建十字线 → E → hover中心区 → click
期望：只删hover的那一段，其他3段保留
```

### TC-3: Guide不可删
```
操作：E → hover guide
期望：低对比高亮，Tooltip提示，click无效
```

---

## 🚨 关键接线点（必须改）

### 1. 工具注册

**文件：** `src/tools/tool-manager.ts`

**添加：**
```typescript
import { EraserTool } from './eraser-tool'

const tools = {
  select: new SelectTool(),
  line: new LineTool(),
  tape: new TapeTool(),
  eraser: new EraserTool(),  // 新增
}
```

---

### 2. 快捷键绑定

**文件：** `src/app/keydown-handler.ts`

**添加：**
```typescript
if (e.key === 'e' || e.key === 'E') {
  setCurrentTool('eraser')
}
```

---

### 3. Intersection集成

**文件：** `src/geometry/intersection.ts`

**复用：**
```typescript
// 已有的intersection函数
export function segmentIntersection(...)
```

---

## 💬 CPO关键引用

### 关于产品跃迁
> "这一步直接把 PlanSnap 从'画图工具'推进到'施工级编辑器'。"

### 关于实现原则
> "拆段发生在'删除时'，不是'画线时'。"

### 关于用户体验
> "在你点下去之前，我就告诉你会删什么。"

---

## 📊 白名单速查

### ❌ 永远不自动拆

```
画线相交
guide穿过墙线
snap到endpoint
```

### ✅ 只在删除时拆

```
E删除有交点线 ✅
X/Trim工具 ✅
批量删除 ❌
```

### ❌ 永不拆的对象

```
Guide（默认）
Dimension标注
Locked对象
```

---

## 🎨 Hover样式速查

| 状态 | 线条颜色 | 线宽 | 光标 |
|------|---------|------|------|
| 整段 | 红色 | +20% | 🧽 |
| 子段 | 红色 | +20% | 🧽 |
| Guide | 灰色虚线 | 正常 | 🧽 + Tooltip |
| 空白 | - | - | 🧽 |

---

## 📞 有问题？

- 算法细节 → 看完整文档 "核心算法" 章节
- 数据结构 → 看完整文档 "数据结构" 章节
- 测试用例 → 看完整文档 "测试用例" 章节

---

**开始干活！** 🚀

完整文档：`2026-02-03_技术方案_Eraser和Trim_CTO执行版.md`
