/**
 * PlanSnap 角度锁定系统 - 完整实现
 * 
 * 功能：统一终点计算，处理所有角度约束
 * 优先级：Typed Length → Explicit Lock → Shift Ortho → Inference → Smart Snap → Free
 * 
 * @version 1.0
 * @date 2026-02-03
 * @author CTO (根据CDO+CPO需求实现)
 */

// ============================================================================
// Types
// ============================================================================

type Vec2 = { x: number; y: number }
type Millimeter = number

type InferenceType = 
  | 'none' 
  | 'endpoint' 
  | 'midpoint' 
  | 'intersection' 
  | 'onSegment' 
  | 'grid'
  | 'parallel' 
  | 'perpendicular'

interface Inference {
  type: InferenceType
  point?: Vec2          // 吸附点（若有）
  direction?: Vec2      // 方向约束（单位向量），用于 parallel/perp
  refSegmentId?: string
  score?: number
}

type AngleSet = 'basic' | 'architectural' | 'advanced'
type UnitSystem = 'imperial' | 'metric'

interface Draft {
  start: Vec2
  end?: Vec2

  // Typing
  typing?: string                    // raw input buffer (e.g. "9'6")
  typedLenMm?: Millimeter | null    // parsed length in mm, null = invalid/empty

  // Locks
  shiftOrtho?: boolean
  explicitAngleDeg?: number | null  // explicit angle lock (e.g. 30/45/60/90), null = none
  angleSet?: AngleSet
}

interface Settings {
  angleSnapEnabled: boolean
  angleToleranceDeg: number        // e.g. 3
  angleSet: AngleSet              // default: 'architectural'
  gridSnapEnabled: boolean        // 注意：角度锁定时会被忽略
}

interface ComputeCtx {
  mouseWorld: Vec2
  hover: Inference
  draft: Draft
  settings: Settings
}

interface ComputeResult {
  end: Vec2
  debug: {
    rawDeg: number
    snappedDeg: number | null
    source: 'typed' | 'explicit' | 'shift' | 'inference' | 'smart' | 'free'
    isLocked: boolean  // true = 角度已锁定
  }
}

// ============================================================================
// Main Function: 统一终点计算
// ============================================================================

/**
 * 计算最终终点位置
 * 
 * 优先级顺序（铁律）：
 * 1. Typed Length（用户明确输入）
 * 2. Explicit Angle Lock（显式角度锁定）
 * 3. Shift Ortho（强制正交）
 * 4. Inference Direction（parallel/perpendicular）
 * 5. Smart Angle Snap（智能角度吸附）
 * 6. Free（自由绘制）
 * 
 * 关键规则：
 * - 一旦角度锁定（1-5任一命中），Grid snap禁用
 * - 每次只能有一个来源决定最终end point
 * - Inference点吸附（endpoint/midpoint等）优先于Grid，但低于角度约束
 * 
 * @param ctx - 计算上下文
 * @returns 最终终点和debug信息
 */
export function computeFinalEnd(ctx: ComputeCtx): ComputeResult {
  const { mouseWorld, hover, draft, settings } = ctx
  const start = draft.start

  // 0) 基础候选终点：优先吸附到 hover.point（endpoint/midpoint/intersection/onSegment）
  // 但注意：这只是候选，后面会被角度/长度约束改写
  let candidate = hover.point ?? mouseWorld

  // 1) 初始方向：start -> candidate
  let v = sub(candidate, start)
  let rawAngle = Math.atan2(v.y, v.x)
  let rawDeg = radToDeg(rawAngle)

  // 2) 获取约束参数
  const typedLenMm = draft.typedLenMm ?? null
  const explicitDeg = draft.explicitAngleDeg ?? null
  const shift = !!draft.shiftOrtho

  // Inference direction（parallel/perp）必须是单位向量
  const infDir = 
    (hover.type === 'parallel' || hover.type === 'perpendicular') 
    ? hover.direction 
    : undefined

  // 2.1 是否有有效的长度输入
  const hasTypedLen = typedLenMm != null && isFinite(typedLenMm) && typedLenMm > 0

  // ========================================================================
  // 优先级1: Explicit Angle Lock
  // ========================================================================
  if (explicitDeg != null && isFinite(explicitDeg)) {
    const theta = degToRad(normalizeDeg(explicitDeg))
    const end = computeEndWithOptionalLength(start, theta, v, typedLenMm)
    return { 
      end, 
      debug: { 
        rawDeg, 
        snappedDeg: explicitDeg, 
        source: hasTypedLen ? 'typed' : 'explicit',
        isLocked: true
      } 
    }
  }

  // ========================================================================
  // 优先级2: Shift Ortho（强制正交：0/90/180/270）
  // ========================================================================
  if (shift) {
    const theta = snapToOrtho(rawAngle)
    const end = computeEndWithOptionalLength(start, theta, v, typedLenMm)
    return { 
      end, 
      debug: { 
        rawDeg, 
        snappedDeg: radToDeg(theta), 
        source: hasTypedLen ? 'typed' : 'shift',
        isLocked: true
      } 
    }
  }

  // ========================================================================
  // 优先级3: Inference Direction（parallel/perpendicular）
  // ========================================================================
  if (infDir && isFinite(infDir.x) && isFinite(infDir.y)) {
    const theta = Math.atan2(infDir.y, infDir.x)
    const end = computeEndWithOptionalLength(start, theta, v, typedLenMm)
    return { 
      end, 
      debug: { 
        rawDeg, 
        snappedDeg: radToDeg(theta), 
        source: hasTypedLen ? 'typed' : 'inference',
        isLocked: true
      } 
    }
  }

  // ========================================================================
  // 优先级4: Smart Angle Snap（30/45/60/90…取决于angleSet）
  // ========================================================================
  if (settings.angleSnapEnabled) {
    const snapped = snapAngleSmart(
      rawAngle, 
      settings.angleSet, 
      settings.angleToleranceDeg
    )
    
    if (snapped != null) {
      const end = computeEndWithOptionalLength(start, snapped, v, typedLenMm)
      return { 
        end, 
        debug: { 
          rawDeg, 
          snappedDeg: radToDeg(snapped), 
          source: hasTypedLen ? 'typed' : 'smart',
          isLocked: true
        } 
      }
    }
  }

  // ========================================================================
  // 优先级5: Free（无角度锁）
  // ========================================================================
  
  // 如果有typed length，则沿当前rawAngle定长
  if (hasTypedLen) {
    const end = add(start, mul(unitOrFallback(v), typedLenMm!))
    return { 
      end, 
      debug: { 
        rawDeg, 
        snappedDeg: null, 
        source: 'typed',
        isLocked: false
      } 
    }
  }

  // 完全自由：使用candidate（可能是hover.point或mouseWorld）
  // 注意：这里Grid snap可以生效（如果enabled）
  let finalCandidate = candidate
  
  // Grid snap只在free模式且未锁定角度时生效
  if (settings.gridSnapEnabled && !hover.point) {
    // 这里可以添加snapToGrid逻辑
    // finalCandidate = snapToGrid(candidate)
  }

  return { 
    end: finalCandidate, 
    debug: { 
      rawDeg, 
      snappedDeg: null, 
      source: 'free',
      isLocked: false
    } 
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 纯正交吸附：只返回 0°/90°/180°/270°
 */
function snapToOrtho(theta: number): number {
  const ortho = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
  let best = ortho[0]
  let min = Infinity
  
  for (const a of ortho) {
    const d = angleDelta(theta, a)
    if (d < min) { 
      min = d
      best = a 
    }
  }
  
  return best
}

/**
 * 智能角度吸附
 * 
 * @param theta - 当前角度（弧度）
 * @param set - 角度集合类型
 * @param toleranceDeg - 容差（度数）
 * @returns 吸附后的角度（弧度），null表示不吸附
 */
function snapAngleSmart(
  theta: number, 
  set: AngleSet, 
  toleranceDeg: number
): number | null {
  const tol = degToRad(toleranceDeg)
  const baseAngles = getAngleSetRad(set)
  
  // 扩展到全圆（0-360°）
  const candidates: number[] = []
  for (const a of baseAngles) {
    // 0°基角
    candidates.push(a)
    // 镜像角
    if (a > 0) {
      candidates.push(-a)
      candidates.push(Math.PI - a)
      candidates.push(Math.PI + a)
    }
  }

  let best: number | null = null
  let minDistance = Infinity

  for (const snapAngle of candidates) {
    const d = angleDelta(theta, snapAngle)
    
    if (d < minDistance) {
      minDistance = d
      best = snapAngle
    }
  }

  // 只有在容差内才吸附
  if (best != null && minDistance <= tol) {
    return normalizeRad(best)
  }
  
  return null
}

/**
 * 获取角度集合的基础角度（弧度）
 * 只返回 0-90° 的基角，其他象限通过镜像生成
 */
function getAngleSetRad(set: AngleSet): number[] {
  switch (set) {
    case 'basic':
      // 只有水平和垂直
      return [0, Math.PI / 2]
    
    case 'advanced':
      // 包含 22.5°
      return [
        0,              // 0°
        Math.PI / 8,    // 22.5°
        Math.PI / 6,    // 30°
        Math.PI / 4,    // 45°
        Math.PI / 3,    // 60°
        Math.PI / 2     // 90°
      ]
    
    case 'architectural':
    default:
      // 默认：建筑常用角度（不含22.5°）
      return [
        0,              // 0°
        Math.PI / 6,    // 30°
        Math.PI / 4,    // 45°
        Math.PI / 3,    // 60°
        Math.PI / 2     // 90°
      ]
  }
}

/**
 * 根据角度和可选长度计算终点
 * 
 * @param start - 起点
 * @param theta - 角度（弧度）
 * @param v - 当前向量（用于提取长度）
 * @param typedLenMm - 用户输入的长度（mm），null表示使用v的长度
 * @returns 终点坐标
 */
function computeEndWithOptionalLength(
  start: Vec2, 
  theta: number, 
  v: Vec2, 
  typedLenMm: Millimeter | null | undefined
): Vec2 {
  const dir = { x: Math.cos(theta), y: Math.sin(theta) }
  const hasTyped = typedLenMm != null && isFinite(typedLenMm) && typedLenMm > 0
  const len = hasTyped ? typedLenMm! : length(v)
  
  return add(start, mul(dir, len))
}

/**
 * 计算两个角度之间的最小夹角
 * 考虑周期性（0° = 360°）
 */
function angleDelta(a: number, b: number): number {
  const d = normalizeRad(a - b)
  return Math.min(d, 2 * Math.PI - d)
}

/**
 * 归一化弧度到 [0, 2π)
 */
function normalizeRad(r: number): number {
  let x = r % (2 * Math.PI)
  if (x < 0) x += 2 * Math.PI
  return x
}

/**
 * 归一化角度到 [0, 360)
 */
function normalizeDeg(d: number): number {
  let x = d % 360
  if (x < 0) x += 360
  return x
}

/**
 * 弧度转角度
 */
function radToDeg(r: number): number { 
  return r * 180 / Math.PI 
}

/**
 * 角度转弧度
 */
function degToRad(d: number): number { 
  return d * Math.PI / 180 
}

// ============================================================================
// Vector Math
// ============================================================================

function add(a: Vec2, b: Vec2): Vec2 { 
  return { x: a.x + b.x, y: a.y + b.y } 
}

function sub(a: Vec2, b: Vec2): Vec2 { 
  return { x: a.x - b.x, y: a.y - b.y } 
}

function mul(v: Vec2, s: number): Vec2 { 
  return { x: v.x * s, y: v.y * s } 
}

function length(v: Vec2): number { 
  return Math.hypot(v.x, v.y) 
}

function unitOrFallback(v: Vec2): Vec2 {
  const len = length(v)
  if (len < 1e-9) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

// ============================================================================
// Integration: 如何在Reducer中使用
// ============================================================================

/**
 * 示例：在 POINTER_MOVE 中集成
 */
/*
case 'POINTER_MOVE': {
  const world = screenToWorld(action.payload)
  const hover = infer(state, world)
  
  if (state.draft.start) {
    // ✅ 使用统一的终点计算函数
    const { end, debug } = computeFinalEnd({
      mouseWorld: world,
      hover,
      draft: state.draft,
      settings: state.settings
    })
    
    return { 
      ...state, 
      hover,
      draft: { 
        ...state.draft, 
        end 
      },
      debug  // 传递给渲染层
    }
  }
  
  return { ...state, hover }
}
*/

// ============================================================================
// Debug Overlay Rendering
// ============================================================================

/**
 * 渲染Debug信息（可选）
 * 在Canvas渲染层调用
 */
export function renderDebugOverlay(
  ctx: CanvasRenderingContext2D, 
  debug: ComputeResult['debug'] | undefined, 
  mousePos: Vec2
): void {
  if (!debug) return
  
  const x = mousePos.x + 20
  const y = mousePos.y - 20
  
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.fillRect(x, y - 70, 160, 80)
  
  // 边框（锁定时显示绿色）
  if (debug.isLocked) {
    ctx.strokeStyle = '#0f0'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y - 70, 160, 80)
  }
  
  // 文字
  ctx.fillStyle = '#fff'
  ctx.font = '12px monospace'
  
  ctx.fillText(`Raw: ${debug.rawDeg.toFixed(1)}°`, x + 8, y - 48)
  
  const snapText = debug.snappedDeg !== null 
    ? `${debug.snappedDeg.toFixed(1)}°` 
    : 'null'
  ctx.fillText(`Snap: ${snapText}`, x + 8, y - 28)
  
  ctx.fillText(`Source: ${debug.source}`, x + 8, y - 8)
  
  // 锁定指示器
  if (debug.isLocked) {
    ctx.fillStyle = '#0f0'
    ctx.fillRect(x - 5, y - 70, 3, 80)
  }
}

// ============================================================================
// Unit Tests (可选，用Jest或Vitest)
// ============================================================================

/**
 * 单元测试示例
 */
/*
describe('computeFinalEnd', () => {
  test('Shift强制正交', () => {
    const result = computeFinalEnd({
      mouseWorld: { x: 100, y: 50 },
      hover: { type: 'none' },
      draft: { 
        start: { x: 0, y: 0 }, 
        shiftOrtho: true 
      },
      settings: { 
        angleSnapEnabled: true, 
        angleToleranceDeg: 3, 
        angleSet: 'architectural',
        gridSnapEnabled: false
      }
    })
    
    expect(result.debug.source).toBe('shift')
    expect(result.debug.snappedDeg).toBeCloseTo(0) // 或90，取决于最近
    expect(result.debug.isLocked).toBe(true)
  })
  
  test('Smart Snap到45°', () => {
    const result = computeFinalEnd({
      mouseWorld: { x: 100, y: 98 }, // 接近45°
      hover: { type: 'none' },
      draft: { start: { x: 0, y: 0 } },
      settings: { 
        angleSnapEnabled: true, 
        angleToleranceDeg: 3, 
        angleSet: 'architectural',
        gridSnapEnabled: false
      }
    })
    
    expect(result.debug.source).toBe('smart')
    expect(result.debug.snappedDeg).toBeCloseTo(45)
    expect(result.end.x).toBeCloseTo(result.end.y) // 45°时x=y
  })
  
  test('不误吸22.5°（architectural模式）', () => {
    const result = computeFinalEnd({
      mouseWorld: { x: 100, y: 41.4 }, // 约22.5°
      hover: { type: 'none' },
      draft: { start: { x: 0, y: 0 } },
      settings: { 
        angleSnapEnabled: true, 
        angleToleranceDeg: 3, 
        angleSet: 'architectural',  // 不含22.5°
        gridSnapEnabled: false
      }
    })
    
    expect(result.debug.source).toBe('free')
    expect(result.debug.snappedDeg).toBeNull()
  })
})
*/

// ============================================================================
// Export
// ============================================================================

export {
  // Main function
  computeFinalEnd,
  
  // Helper functions (可能需要单独导出用于测试)
  snapToOrtho,
  snapAngleSmart,
  getAngleSetRad,
  
  // Types
  type ComputeCtx,
  type ComputeResult,
  type AngleSet,
  type Inference,
  type Draft,
  type Settings
}
