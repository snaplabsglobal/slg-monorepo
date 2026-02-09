# PlanSnap Eraser工具和Smart Trim - 技术方案

> **文档类型：** 技术方案 - CTO执行版  
> **创建日期：** 2026-02-03  
> **优先级：** 🔴 P0-P1  
> **预计工作量：** 3-4天  
> **状态：** ⏳ 待开始

---

## 📋 执行摘要

### 核心决策

**三层设计：**
1. **默认不自动切断** - 安全第一
2. **橡皮工具E** - 明确删除意图
3. **Smart Trim** - 智能拆段，只删目标

**CPO明确要求：**
> "我们不做'线相交自动切断'。默认保持连续，避免误伤。提供橡皮工具（E），在删除时智能切段。这是专业CAD的通行做法。"

---

### Scope（本次做什么）

**✅ P0功能：**
```
Eraser工具基础（E键）
Hover高亮最近可删Segment
Intersection计算与Segment拆分
Smart Trim（只删hover子段）
Guide删除规则
```

**❌ 不做：**
```
Trim Tool（独立工具，未来）
批量删除
连续擦除（Drag模式）
```

---

## 🏗️ 技术架构

### 一、数据结构

#### 核心类型定义

```typescript
type Pt = { x: number; y: number }
type SegmentKind = 'wall' | 'line' | 'guide'

/**
 * Segment结构
 * 
 * 关键设计点：
 * - 支持被拆分（通过replacement实现）
 * - 不引入polyline（保持简单）
 * - locked字段防止误删
 */
type Segment = {
  id: string
  kind: SegmentKind
  a: Pt
  b: Pt
  
  // 可选字段
  locked?: boolean
  layerId?: string
  meta?: Record<string, any>
}
```

**为什么不用Polyline？**
```
1. 简化实现复杂度
2. 拆分逻辑更清晰
3. Undo/Redo更简单
4. 渲染性能更好
```

---

#### HoverTarget类型

```typescript
/**
 * Eraser hover目标类型
 * 
 * 关键：区分整段和子段
 */
type HoverTarget =
  | { type: 'none' }
  
  | { 
      type: 'segment'
      segId: string
      hitT: number      // 鼠标在segment上的参数t [0,1]
      distPx: number    // 距离（像素）
    }
  
  | { 
      type: 'subSegment'
      segId: string
      i0: number        // 子段起始索引
      i1: number        // 子段结束索引
      distPx: number
    }
```

---

#### EditOp类型（支持Undo/Redo）

```typescript
/**
 * 编辑操作类型
 * 
 * 用于事务管理和Undo/Redo
 */
type EditOp =
  | { 
      op: 'deleteSegment'
      segId: string
    }
  
  | { 
      op: 'replaceSegment'
      segId: string
      newSegments: Segment[]
    }
```

---

### 二、核心算法

#### 1. 几何工具函数

**1.1 点到线段距离**

```typescript
/**
 * 计算点到线段的最短距离
 * 
 * @param p - 点
 * @param s - 线段
 * @returns 距离、参数t、投影点
 */
function distPointToSegment(
  p: Pt, 
  s: Segment
): { dist: number; t: number; proj: Pt } {
  const dx = s.b.x - s.a.x
  const dy = s.b.y - s.a.y
  
  if (dx === 0 && dy === 0) {
    // 退化为点
    return {
      dist: Math.hypot(p.x - s.a.x, p.y - s.a.y),
      t: 0,
      proj: s.a
    }
  }
  
  // 投影参数t
  let t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))  // 限制在[0,1]
  
  const proj = {
    x: s.a.x + t * dx,
    y: s.a.y + t * dy
  }
  
  const dist = Math.hypot(p.x - proj.x, p.y - proj.y)
  
  return { dist, t, proj }
}
```

---

**1.2 线段相交检测**

```typescript
/**
 * 计算两条线段的交点
 * 
 * @param s1 - 第一条线段
 * @param s2 - 第二条线段
 * @returns 是否相交、交点、参数t1和t2
 */
function segmentIntersection(
  s1: Segment, 
  s2: Segment
): { 
  hit: boolean
  t1: number      // s1上的参数
  t2: number      // s2上的参数
  p: Pt           // 交点
} {
  const dx1 = s1.b.x - s1.a.x
  const dy1 = s1.b.y - s1.a.y
  const dx2 = s2.b.x - s2.a.x
  const dy2 = s2.b.y - s2.a.y
  
  const cross = dx1 * dy2 - dy1 * dx2
  
  if (Math.abs(cross) < 1e-10) {
    // 平行或共线
    return { hit: false, t1: 0, t2: 0, p: s1.a }
  }
  
  const dx = s2.a.x - s1.a.x
  const dy = s2.a.y - s1.a.y
  
  const t1 = (dx * dy2 - dy * dx2) / cross
  const t2 = (dx * dy1 - dy * dx1) / cross
  
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    // 相交
    const p = {
      x: s1.a.x + t1 * dx1,
      y: s1.a.y + t1 * dy1
    }
    return { hit: true, t1, t2, p }
  }
  
  return { hit: false, t1, t2, p: s1.a }
}
```

---

**1.3 插值函数**

```typescript
/**
 * 线性插值
 * 
 * @param a - 起点
 * @param b - 终点
 * @param t - 参数 [0,1]
 * @returns 插值点
 */
function lerp(a: Pt, b: Pt, t: number): Pt {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y)
  }
}
```

---

#### 2. Hover检测算法

**2.1 findEraserHoverTarget**

```typescript
/**
 * 查找Eraser hover目标
 * 
 * 这是Eraser的核心：不仅找到最近的segment，
 * 还要确定如果这个segment有交点，用户hover的是哪一小段
 * 
 * @param mouseWorld - 鼠标世界坐标
 * @param segments - 所有线段
 * @param options - 选项
 * @returns Hover目标
 */
function findEraserHoverTarget(
  mouseWorld: Pt,
  segments: Segment[],
  options: {
    maxPickDistPx: number  // 最大拾取距离（像素）
    canEraseGuide: boolean // 是否可以删除guide
    viewScale: number      // world→px缩放比例
  }
): HoverTarget {
  let best: HoverTarget = { type: 'none' }
  let bestDist = Infinity

  for (const seg of segments) {
    // 1. 过滤不可删除的对象
    if (seg.locked) continue
    if (seg.kind === 'guide' && !options.canEraseGuide) continue

    // 2. 计算鼠标到segment的距离
    const { dist, t } = distPointToSegment(mouseWorld, seg)
    const distPx = dist * options.viewScale
    
    if (distPx > options.maxPickDistPx) continue
    if (distPx >= bestDist) continue

    // 3. 如果该segment有交点：判定鼠标落在哪个"交点区间"
    const split = computeSplitParams(seg, segments)
    
    if (split.params.length <= 2) {
      // 无交点（或只有端点）
      best = { 
        type: 'segment', 
        segId: seg.id, 
        hitT: t, 
        distPx 
      }
    } else {
      // 有交点：确定落在哪个子段
      const [i0, i1] = locateInterval(split.params, t)
      best = { 
        type: 'subSegment', 
        segId: seg.id, 
        i0, 
        i1, 
        distPx 
      }
    }
    
    bestDist = distPx
  }

  return best
}
```

---

**2.2 computeSplitParams**

```typescript
/**
 * 计算segment上的所有交点参数
 * 
 * 将segment与所有其他segments求交，
 * 返回排序后的参数列表（含0和1）
 * 
 * @param seg - 要拆分的线段
 * @param all - 所有线段
 * @returns 排序后的参数列表和交点
 */
function computeSplitParams(
  seg: Segment, 
  all: Segment[]
): { 
  params: number[]  // 排序后的参数列表
  points: Pt[]      // 对应的点（可选）
} {
  const ts: number[] = [0, 1]
  const pts: Pt[] = [seg.a, seg.b]

  for (const other of all) {
    if (other.id === seg.id) continue
    
    // Guide默认不参与交点拆分（可选策略）
    if (other.kind === 'guide') continue

    const hit = segmentIntersection(seg, other)
    if (!hit.hit) continue

    // 排除非常靠近端点的交点（避免数值噪音）
    if (hit.t1 < 1e-6 || hit.t1 > 1 - 1e-6) continue

    ts.push(hit.t1)
    pts.push(hit.p)
  }

  // 去重 + 排序
  const sorted = uniqueAndSortParams(ts)
  
  return { params: sorted, points: pts }
}
```

---

**2.3 uniqueAndSortParams**

```typescript
/**
 * 去重并排序参数列表
 * 
 * @param ts - 参数列表
 * @returns 去重排序后的参数列表
 */
function uniqueAndSortParams(ts: number[]): number[] {
  ts.sort((a, b) => a - b)
  
  const out: number[] = []
  for (const t of ts) {
    if (out.length === 0 || Math.abs(t - out[out.length - 1]) > 1e-5) {
      out.push(t)
    }
  }
  
  // 保证0和1在首尾
  out[0] = 0
  out[out.length - 1] = 1
  
  return out
}
```

---

**2.4 locateInterval**

```typescript
/**
 * 确定参数t落在哪个区间
 * 
 * @param params - 排序后的参数列表
 * @param t - 目标参数
 * @returns 区间索引[i0, i1]
 */
function locateInterval(
  params: number[], 
  t: number
): [number, number] {
  // 找到 params[k] <= t <= params[k+1]
  for (let k = 0; k < params.length - 1; k++) {
    if (t >= params[k] && t <= params[k+1]) {
      return [k, k + 1]
    }
  }
  
  return [0, 1]  // fallback
}
```

---

#### 3. Click删除算法

**3.1 eraseClick（核心逻辑）**

```typescript
/**
 * Eraser点击处理
 * 
 * 根据hover目标类型决定删除操作：
 * - 整段：直接删除
 * - 子段：拆分后只删除目标子段
 * 
 * @param hover - Hover目标
 * @param segments - 所有线段
 * @returns 编辑操作列表
 */
function eraseClick(
  hover: HoverTarget,
  segments: Segment[]
): EditOp[] {
  if (hover.type === 'none') return []

  if (hover.type === 'segment') {
    // 无交点（或不拆） => 删整段
    return [{ 
      op: 'deleteSegment', 
      segId: hover.segId 
    }]
  }

  // subSegment：要"拆 + 删中间一段"
  const seg = segments.find(s => s.id === hover.segId)
  if (!seg) return []

  const split = computeSplitParams(seg, segments)
  const params = split.params
  
  // 保留除了 [i0, i1] 之外的所有区间
  const keptSegments = keepAllIntervalsExcept(
    seg, 
    params, 
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

**3.2 keepAllIntervalsExcept**

```typescript
/**
 * 保留除指定区间外的所有子段
 * 
 * @param seg - 原始线段
 * @param params - 排序后的参数列表
 * @param deleteI0 - 要删除的区间起始索引
 * @param deleteI1 - 要删除的区间结束索引
 * @returns 保留的子段列表
 */
function keepAllIntervalsExcept(
  seg: Segment, 
  params: number[], 
  deleteI0: number, 
  deleteI1: number
): Segment[] {
  const out: Segment[] = []
  
  for (let k = 0; k < params.length - 1; k++) {
    // 跳过要删除的区间
    if (k === deleteI0 && k + 1 === deleteI1) continue
    
    const ta = params[k]
    const tb = params[k + 1]
    
    // 跳过过短的段（数值误差）
    if (tb - ta < 1e-6) continue
    
    out.push(makeSubSegment(seg, ta, tb, `K${k}`))
  }
  
  return out
}
```

---

**3.3 makeSubSegment**

```typescript
/**
 * 创建子段
 * 
 * @param base - 基础线段
 * @param ta - 起始参数
 * @param tb - 结束参数
 * @param suffix - ID后缀
 * @returns 新的子段
 */
function makeSubSegment(
  base: Segment, 
  ta: number, 
  tb: number, 
  suffix: string
): Segment {
  return {
    ...base,
    id: `${base.id}_${suffix}_${Math.random().toString(16).slice(2, 8)}`,
    a: lerp(base.a, base.b, ta),
    b: lerp(base.a, base.b, tb)
  }
}
```

---

### 三、Undo/Redo实现

#### 事务模型

```typescript
/**
 * 编辑事务
 * 
 * 用于支持Undo/Redo
 */
type Transaction = {
  ops: EditOp[]
  before: Segment[]  // 受影响的原始segments
  after: Segment[]   // 操作后的segments
  timestamp: number
}
```

---

#### 应用事务

```typescript
/**
 * 应用编辑操作
 * 
 * @param segments - 当前segments
 * @param ops - 编辑操作
 * @returns 新的segments和事务记录
 */
function applyEditOps(
  segments: Segment[],
  ops: EditOp[]
): { 
  segments: Segment[]
  transaction: Transaction 
} {
  const before: Segment[] = []
  const after: Segment[] = []
  
  let result = [...segments]
  
  for (const op of ops) {
    if (op.op === 'deleteSegment') {
      const idx = result.findIndex(s => s.id === op.segId)
      if (idx >= 0) {
        before.push(result[idx])
        result.splice(idx, 1)
      }
    } else if (op.op === 'replaceSegment') {
      const idx = result.findIndex(s => s.id === op.segId)
      if (idx >= 0) {
        before.push(result[idx])
        result.splice(idx, 1, ...op.newSegments)
        after.push(...op.newSegments)
      }
    }
  }
  
  const transaction: Transaction = {
    ops,
    before,
    after,
    timestamp: Date.now()
  }
  
  return { segments: result, transaction }
}
```

---

#### Undo/Redo栈

```typescript
/**
 * Undo/Redo管理器
 */
class UndoManager {
  private undoStack: Transaction[] = []
  private redoStack: Transaction[] = []
  
  /**
   * 记录事务
   */
  record(transaction: Transaction) {
    this.undoStack.push(transaction)
    this.redoStack = []  // 清空redo栈
  }
  
  /**
   * Undo
   */
  undo(segments: Segment[]): Segment[] | null {
    const transaction = this.undoStack.pop()
    if (!transaction) return null
    
    this.redoStack.push(transaction)
    
    // 恢复before状态
    let result = [...segments]
    
    // 移除after segments
    for (const seg of transaction.after) {
      const idx = result.findIndex(s => s.id === seg.id)
      if (idx >= 0) result.splice(idx, 1)
    }
    
    // 添加before segments
    result.push(...transaction.before)
    
    return result
  }
  
  /**
   * Redo
   */
  redo(segments: Segment[]): Segment[] | null {
    const transaction = this.redoStack.pop()
    if (!transaction) return null
    
    this.undoStack.push(transaction)
    
    // 重新应用ops
    const { segments: result } = applyEditOps(segments, transaction.ops)
    return result
  }
}
```

---

## 🎨 渲染实现

### Hover高亮渲染

```typescript
/**
 * 渲染Eraser hover高亮
 * 
 * @param ctx - Canvas上下文
 * @param hover - Hover目标
 * @param segments - 所有线段
 */
function renderEraserHover(
  ctx: CanvasRenderingContext2D,
  hover: HoverTarget,
  segments: Segment[]
) {
  if (hover.type === 'none') return
  
  const seg = segments.find(s => s.id === hover.segId)
  if (!seg) return
  
  ctx.save()
  
  // 高亮样式
  ctx.strokeStyle = '#FF0000'  // 红色
  ctx.lineWidth = seg.kind === 'wall' ? 3 : 2  // +20%
  ctx.setLineDash([])
  ctx.lineCap = 'round'
  
  if (hover.type === 'segment') {
    // 整段高亮
    ctx.beginPath()
    ctx.moveTo(seg.a.x, seg.a.y)
    ctx.lineTo(seg.b.x, seg.b.y)
    ctx.stroke()
  } else {
    // 子段高亮
    const split = computeSplitParams(seg, segments)
    const ta = split.params[hover.i0]
    const tb = split.params[hover.i1]
    
    const pa = lerp(seg.a, seg.b, ta)
    const pb = lerp(seg.a, seg.b, tb)
    
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  
  ctx.restore()
}
```

---

### Guide不可删除提示

```typescript
/**
 * 渲染Guide hover提示
 * 
 * @param ctx - Canvas上下文
 * @param seg - Guide线段
 * @param mousePos - 鼠标位置（屏幕坐标）
 */
function renderGuideTooltip(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  mousePos: { x: number; y: number }
) {
  if (seg.kind !== 'guide') return
  
  ctx.save()
  
  // Tooltip背景
  const text = 'Guide (not erasable)'
  const padding = 8
  const metrics = ctx.measureText(text)
  const width = metrics.width + padding * 2
  const height = 24
  
  const x = mousePos.x + 15
  const y = mousePos.y - 30
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(x, y, width, height)
  
  // Tooltip文字
  ctx.fillStyle = '#fff'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padding, y + height / 2)
  
  ctx.restore()
}
```

---

## 🛠️ 工具实现

### EraserTool类

```typescript
/**
 * Eraser工具实现
 */
class EraserTool implements Tool {
  private hoverTarget: HoverTarget = { type: 'none' }
  private canEraseGuide: boolean = false
  
  /**
   * 进入工具
   */
  onEnter() {
    console.log('Eraser tool activated')
    // 可选：修改光标样式
    document.body.style.cursor = 'url(eraser.cur), auto'
  }
  
  /**
   * 退出工具
   */
  onExit() {
    this.hoverTarget = { type: 'none' }
    document.body.style.cursor = 'default'
  }
  
  /**
   * 鼠标移动
   */
  onPointerMove(world: Pt, screen: Pt) {
    const segments = getSegments()
    
    this.hoverTarget = findEraserHoverTarget(world, segments, {
      maxPickDistPx: 10,
      canEraseGuide: this.canEraseGuide,
      viewScale: getViewScale()
    })
    
    // 触发重绘
    requestRender()
  }
  
  /**
   * 鼠标按下
   */
  onPointerDown(world: Pt, screen: Pt) {
    if (this.hoverTarget.type === 'none') return
    
    const segments = getSegments()
    const ops = eraseClick(this.hoverTarget, segments)
    
    if (ops.length > 0) {
      const { segments: newSegments, transaction } = applyEditOps(
        segments, 
        ops
      )
      
      // 更新segments
      setSegments(newSegments)
      
      // 记录到undo栈
      undoManager.record(transaction)
      
      // 重新计算hover（因为segments已变）
      this.hoverTarget = { type: 'none' }
      requestRender()
    }
  }
  
  /**
   * 键盘按下
   */
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt') {
      this.canEraseGuide = true
    }
  }
  
  /**
   * 键盘释放
   */
  onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt') {
      this.canEraseGuide = false
    }
  }
  
  /**
   * 渲染overlay
   */
  drawOverlay(ctx: CanvasRenderingContext2D) {
    const segments = getSegments()
    renderEraserHover(ctx, this.hoverTarget, segments)
    
    // 如果hover到guide且不可删除，显示tooltip
    if (this.hoverTarget.type !== 'none' && !this.canEraseGuide) {
      const seg = segments.find(s => s.id === this.hoverTarget.segId)
      if (seg && seg.kind === 'guide') {
        const mousePos = getMouseScreenPos()
        renderGuideTooltip(ctx, seg, mousePos)
      }
    }
  }
}
```

---

## 📋 实施计划

### Day 1: Eraser基础（6小时）

**任务：**
- [ ] 实现EraserTool基础结构（1小时）
- [ ] E键工具切换（0.5小时）
- [ ] distPointToSegment算法（1小时）
- [ ] 基础hover检测（findEraserHoverTarget简化版）（1.5小时）
- [ ] Hover高亮渲染（1小时）
- [ ] 整段删除逻辑（1小时）

**交付物：**
- E进入工具
- Hover高亮最近segment
- Click删除整段

**验收：**
```bash
npm run test:eraser-basic
```

---

### Day 2: Intersection和拆分（6小时）

**任务：**
- [ ] segmentIntersection算法（1.5小时）
- [ ] computeSplitParams实现（2小时）
- [ ] locateInterval实现（0.5小时）
- [ ] 子段高亮渲染（1小时）
- [ ] 测试多交点情况（1小时）

**交付物：**
- Intersection计算正确
- 子段hover高亮
- 参数排序稳定

**验收：**
```bash
npm run test:intersection
```

---

### Day 3: Smart Trim（6小时）

**任务：**
- [ ] keepAllIntervalsExcept实现（2小时）
- [ ] eraseClick完整逻辑（1.5小时）
- [ ] applyEditOps实现（1小时）
- [ ] UndoManager集成（1小时）
- [ ] 测试删除中间段（0.5小时）

**交付物：**
- Smart Trim功能完整
- Undo/Redo可用
- 不误删其他段

**验收：**
```bash
npm run test:smart-trim
```

---

### Day 4: 完善和测试（4小时）

**任务：**
- [ ] Guide删除规则（Alt+E）（1小时）
- [ ] Tooltip渲染（0.5小时）
- [ ] Guide不可删除提示（0.5小时）
- [ ] Epic级回归测试（1小时）
- [ ] 文档更新（1小时）

**交付物：**
- Guide规则完整
- 所有DoD通过
- 文档齐全

**验收：**
```bash
npm run test:epic-eraser
```

---

## ✅ 完成定义（DoD）

### A. 功能DoD

- [ ] **E进入橡皮工具**
  - E键切换
  - 光标变化
  - 状态正确

- [ ] **Hover高亮可删部分**
  - 整段高亮
  - 子段高亮
  - 精度稳定

- [ ] **Click删除**
  - 整段删除
  - 子段删除（Smart Trim）
  - 不误删

- [ ] **Undo/Redo支持**
  - 可回退
  - 可重做
  - 事务完整

---

### B. 安全规则DoD

- [ ] **画线相交不自动切断**
  - 默认保持连续
  - 只在删除时拆分

- [ ] **Guide默认不可删除**
  - 低对比高亮
  - Tooltip提示
  - Alt+E才可删（可选）

- [ ] **Locked对象不可删除**
  - 过滤locked segments
  - 不显示hover

---

### C. 体验DoD

- [ ] **点之前能看懂会删哪段**
  - Hover高亮清晰
  - 子段边界明确
  - 颜色对比明显

- [ ] **删除不需要弹窗确认**
  - 流畅操作
  - Undo可恢复
  - 无打断

---

## 🧪 测试用例

### TC-E001: 基础删除
```
步骤：
1. E进入Eraser
2. Hover普通线段
3. Click

期望：
- 线段被删除
- 可Undo恢复
```

### TC-E002: 子段删除
```
步骤：
1. 创建十字交叉线（4段）
2. E进入Eraser
3. Hover中心区域某一段
4. Click

期望：
- 只删除hover的那一段
- 其他3段保留
- 形成"T"字型
```

### TC-E003: 多交点
```
步骤：
1. 创建密集交叉线（6个交点）
2. E进入Eraser
3. Hover任意子段
4. Click

期望：
- 只删除目标子段
- 其他子段不受影响
```

### TC-E004: Guide不可删
```
步骤：
1. E进入Eraser
2. Hover Guide线段

期望：
- 低对比高亮
- Tooltip显示"Guide (not erasable)"
- Click无效
```

### TC-E005: Alt+E删Guide
```
步骤：
1. E进入Eraser
2. 按住Alt
3. Hover Guide
4. Click

期望：
- Guide被删除（如果启用此功能）
```

---

## 💬 CPO关键引用

### 关于产品定位
> "有没有'Trim / Erase with intent'是区分'玩具画图'和'施工画图'的关键。"

### 关于实现原则
> "拆段发生在'删除时'，不是'画线时'。"

### 关于用户体验
> "在你点下去之前，我就告诉你会删什么。"

---

**文档维护者：** CDO  
**最后更新：** 2026-02-03  
**版本：** v1.0  
**状态：** ✅ Ready for Implementation
