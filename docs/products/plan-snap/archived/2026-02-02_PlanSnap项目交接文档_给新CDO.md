# PlanSnap 项目交接文档

> **交接时间：** 2026-02-02  
> **交接人：** CDO (JSS项目对话框)  
> **接收人：** CDO (PlanSnap项目新对话框)  
> **项目代号：** PlanSnap (PS)

---

## 🎯 项目概述

### 产品定位

**PlanSnap 是一个按比例、基于网格、用"线"画的 2D Floor Plan 工具。**

- **目标用户：** General Contractor / Renovation Contractor
- **核心场景：** 给客户解释 layout、Permit 前方案讨论、现场快速改图
- **平台：** Web (Desktop-first) + iPad PWA
- **阶段：** MVP (Sprint 2-3)

---

### 产品边界（非常重要）

**PlanSnap 只做：**
```
✅ 2D 平面图
✅ 按比例绘制
✅ 基于网格和吸附
✅ 快速表达 layout
```

**PlanSnap 不做：**
```
❌ Isometric / 3D
❌ 管道系统
❌ Code 检查
❌ 材料清单
❌ 自动生成墙体
❌ 智能房间识别
```

---

### 与其他产品的关系

```
PlanSnap (2D Floor Plan)
    ↓ 为后续提供前置工具
IsoSnap (30° Isometric Plumbing)
    ↓ 数据对接
JSS (Job Site Snapshot - AI 辅助系统)
```

**关键：** 三个产品独立，但共享技术栈和数据结构

---

## 📚 已完成的关键文档

### 1. 产品定位和设计（CPO主导）

**文档位置：**
- `/mnt/user-data/outputs/products/plansnap/2026-02-02_PlanSnap_产品设计蓝图_CDO版.md`
- `/mnt/user-data/outputs/products/plansnap/2026-02-02_PlanSnap_快速参考卡.md`

**核心内容：**
- ✅ 产品定位和设计哲学（四条铁律）
- ✅ Figma 页面结构（11个页面）
- ✅ Line Drawing Flow（7个状态帧详解）
- ✅ 目标用户和使用场景
- ✅ 明确禁止清单

**关键原则：**
```
1. 线优先（Line-first）
2. 网格磁力优先（Grid + Snap）
3. 比例真实（Scaled Drawing）
4. 快于 CAD，准于手画（10分钟出图）
```

---

### 2. CAD风格改进（CEO + CTO会议）

**文档位置：**
- `/mnt/user-data/outputs/meetings/2026-02-02_会议纪要_PlanSnap-CAD风格改进_CTO执行版.md`
- `/mnt/user-data/outputs/meetings/2026-02-02_CAD风格改进_快速参考卡.md`

**三个核心改进：**
1. **线宽系统** - AutoCAD风格（1px细线，不是magicplan粗线）
2. **Inference Engine** - SketchUp式推断（endpoint/midpoint/parallel/perpendicular）
3. **键盘数字输入** - 拉线时直接输入"9'6"

**预计工作量：** 7天

**关键实现：**
- InferenceEngine 完整代码
- SpatialHash 空间索引
- parseLengthToMM 输入解析
- 完整的验收标准

---

### 3. 单位系统架构（CEO + CPO + COO决策）

**文档位置：**
- `/mnt/user-data/outputs/architecture/2026-02-02_单位系统技术规范_CTO执行版.md`
- `/mnt/user-data/outputs/architecture/2026-02-02_单位系统_快速执行清单.md`

**核心决策：**
```
底层数据统一用 mm
UI 层一键切换英制/公制
北美用户感觉不到底层 mm
```

**关键架构：**
```
[ UI Layer ]           - 显示格式（9'-6"）
[ Measurement Adapter ] - imperial/metric
[ Core Geometry ]      - mm（唯一真实单位）
```

**CTO必须执行：**
- 6个任务清单（单位宪法、类型封印、单位换算集中等）
- 预计工作量：2-3天

**关键：**
```
Grid ≠ 几何约束
Grid 只是"参考线"
1/16" 精度要求
```

---

### 4. 双产品线战略（之前的背景）

**文档位置：**
- `/mnt/user-data/outputs/strategy/2026-02-02_战略决策_PlanSnap-IsoSnap双产品线.md`

**核心决策：**
```
从单一产品 ISO SNAP
→ 双产品线：PlanSnap + IsoSnap
```

**共享 vs 独立：**
```
✅ 共享：Canvas引擎、存储、导出、Auth
❌ 分离：工具栏、交互逻辑、角度限制
```

---

## 🏗️ 技术架构要点

### Monorepo 结构

```
/monorepo
  /packages
    /core              # 共享核心
      - CanvasEngine
      - StorageEngine
      - ExportEngine
      - units/         # 单位系统
    /plan-snap         # PlanSnap独立
      - PlanCanvas
      - InferenceEngine
      - types/
    /iso-snap          # IsoSnap独立
```

---

### 核心数据模型

```typescript
// PlanSnap 特有
type Millimeter = number;

interface Node {
  id: string;
  x: Millimeter;
  y: Millimeter;
  connectedLines: string[];
}

interface Line {
  id: string;
  startNodeId: string;
  endNodeId: string;
  lengthMm: Millimeter;
  angle: 0 | 90;  // 只允许水平/垂直
  type: 'wall' | 'guide';
}

interface Dimension {
  id: string;
  pointA, pointB: { x, y };
  displayText: string;  // "9'-6""
}
```

---

### 角度限制差异（重要）

```
PlanSnap:  0° / 90° （水平/垂直）
IsoSnap:   30° / 90° / 150° （标准isometric）
```

---

## 🎯 当前状态和优先级

### Sprint 1 状态

**IsoSnap：** 已规划，有详细技术方案
**PlanSnap：** 产品设计完成，技术方案部分完成

---

### Sprint 2-3 计划（PlanSnap）

**Phase 1: 设计（Week 1-2）**
- Figma 11个页面设计
- 重点：Line Drawing Flow（7个状态帧）

**Phase 2: 开发（Week 3-4）**
- 数据模型（0.5天）
- 2D绘图引擎（2天）
- 交互能力（1天）
- 导出（0.5天）

**Phase 3: CAD风格改进（Week 5）**
- 线宽系统（1天）
- Inference Engine（3天）
- 键盘输入（2天）
- 测试（1天）

**Phase 4: 单位系统封印（Week 6）**
- 单位宪法（0.5天）
- 类型封印（1天）
- 解耦和测试（1天）

---

## ⚠️ 关键决策和底线

### CPO 的底线

> **"如果一个功能让你犹豫'这是PlanSnap还是IsoSnap的功能'，那这个功能现在不该存在。"**

---

### COO 的底线

> **"创业早期最容易犯的错误：'顺手加个功能' → 产品变成谁都用不明白的'怪胎'。"**

---

### 设计原则

```
施工工具感 > 设计感
干净 > 花哨
专业 > 美观
快速 > 完美
可预测 > 智能
```

---

### 验收标准（CPO口径）

**交互验收：**
> "一个老施工，用鼠标连点6下，能画出一个房间轮廓，不需要思考'我现在在哪个模式'。"

**产品验收：**
> "一个做装修的人，不用看教程，10分钟内画出一张'敢发给客户/Inspector'的平面图。"

---

## 📋 快捷键体系（必须支持）

| 键 | 功能 | 说明 |
|----|------|------|
| **L** | Line Tool | 连续画线 |
| **H** | Pan | 移动画布 |
| **D** | Dimension | 尺寸标注 |
| **T** | Tape/Guide | 辅助线（从中点） |
| **Esc** | Select | 回到选择 |
| **Space** | Select | 回到选择 |
| **Shift** | Lock | 锁定水平/垂直 |
| **Enter** | Confirm | 确认数字输入 |
| **Backspace** | Delete | 删除输入字符 |

---

## 🚫 明确禁止清单

**功能禁止（当前阶段）：**
```
❌ 自动生成墙厚
❌ 自动闭合房间
❌ 智能房间识别
❌ Code/Permit 校验
❌ 3D/Isometric
❌ 材料清单/BOM
❌ 多人协作
❌ 实时云同步
```

**交互禁止：**
```
❌ 自由角度（非0°/90°）
❌ 弹窗打断画图流程
❌ 猜测用户意图
❌ 自动修正不直的线
```

---

## 💼 定价策略（COO确认）

```
PlanSnap 单品：$19/月
IsoSnap 单品：$19/月
全家桶：$49/月（PlanSnap + IsoSnap）
```

---

## 📊 已交付的文档清单

**产品设计文档（2份）：**
1. PlanSnap 产品设计蓝图（完整版，30+页）
2. PlanSnap 快速参考卡（精简版）

**技术方案文档（2份）：**
1. PlanSnap CAD风格改进技术方案（完整版，包含代码）
2. CAD风格改进快速参考卡

**架构规范文档（2份）：**
1. 单位系统技术规范（完整版，20+页）
2. 单位系统快速执行清单

**战略文档（1份）：**
1. PlanSnap & IsoSnap 双产品线战略决策

**总计：** 7份核心文档

---

## 🎓 关键人物的核心观点

### CEO 的判断

> **"这几个点一下就把 PlanSnap 从'看起来像工具'拉到'像专业 CAD'了"**
> **"中心线 + 辅助线 → 工程师 / 师傅都会点头"**
> **"这就是你们可以堂堂正正卖 $19.99 的底气"**

---

### CPO 的产品哲学

> **"快于 CAD，准于手画，10分钟出图"**
> **"这是 AutoCAD + SketchUp 核心手感三连击"**
> **"施工工具感 > 设计感"**

---

### COO 的商业视角

> **"两个产品都要能'卖'，不是能'看'"**
> **"导出的 PDF 要让用户觉得'值 $49'"**
> **"如果承诺 Code Check，AI算错了要承担巨大法律责任"**

---

## 🔧 技术亮点

### 1. Inference Engine（核心竞争力）

**推断类型（优先级）：**
1. Endpoint（端点）- 100分 - 红色圆点
2. Intersection（交点）- 95分 - 紫色圆点
3. Midpoint（中点）- 90分 - 蓝色圆点
4. Perpendicular（垂直）- 70分 - 绿色方向线
5. Parallel（平行）- 65分 - 绿色方向线
6. OnSegment（落在线上）- 50分
7. Grid（网格）- 40分

**容差：**
- 点吸附：10px
- 线吸附：8px
- 角度容差：3°

---

### 2. 空间索引（性能关键）

```typescript
class SpatialHash {
  // O(1) 查询附近线段，不是 O(n)
  query(worldPt: Vec2, radius: number): Segment[]
}
```

**性能对比：**
- 1000条线段：从 ~5ms → ~0.2ms

---

### 3. 单位系统（架构基石）

```typescript
// 唯一真相来源
type Millimeter = number;

// 输入解析
parseLengthToMM("9'6") → 2895.6 mm

// 显示格式
formatImperial(2895.6) → "9'-6""
```

**关键：**
```
Grid ≠ Snap ≠ Geometry
三层独立，各司其职
```

---

## 🎯 给新窗口CDO的建议

### 1. 对话组织方式

**建议结构：**
```
/product-decisions/     - 产品决策讨论
/technical-solutions/   - 技术方案讨论
/design-reviews/        - 设计评审讨论
/sprint-planning/       - Sprint规划讨论
/meeting-notes/         - 会议纪要
```

---

### 2. 文档命名规范

**建议格式：**
```
YYYY-MM-DD_类型_标题_版本.md

例如：
2026-02-03_产品决策_Grid系统优化_v1.0.md
2026-02-03_技术方案_Snap精度提升_CTO版.md
2026-02-03_会议纪要_设计评审_Sprint2.md
```

---

### 3. 关键文档索引

**建议创建：**
- `00_PlanSnap_文档索引.md` - 所有文档的目录
- `01_PlanSnap_决策日志.md` - 重大决策记录
- `02_PlanSnap_技术债务.md` - 技术债务追踪

---

### 4. 优先级标记

**建议使用：**
```
🔴 P0 - Critical（阻塞发布）
🟡 P1 - Important（影响体验）
🟢 P2 - Nice to have（增强功能）
⚪ P3 - Future（未来考虑）
```

---

### 5. 状态追踪

**建议标记：**
```
✅ 已完成
🚧 进行中
⏳ 待开始
❌ 已取消
⚠️ 有风险
```

---

## 📝 待处理的事项

### 设计层面

- [ ] Figma 11个页面设计（设计师任务）
- [ ] Line Drawing Flow 详细交互稿
- [ ] iPad 手势规范
- [ ] 导出 PDF 样式模板

---

### 技术层面

- [ ] InferenceEngine 完整实现
- [ ] SpatialHash 空间索引
- [ ] parseLengthToMM 单元测试
- [ ] 单位系统封印（6个任务）

---

### 产品层面

- [ ] 用户手册（给 SketchUp 用户）
- [ ] "PlanSnap 为什么不做 X"（团队统一认知）
- [ ] 测试用例清单
- [ ] Beta 测试计划

---

## 🔗 相关项目和依赖

### 依赖关系

```
PlanSnap
  ↓ 依赖
/packages/core
  - CanvasEngine
  - StorageEngine
  - ExportEngine
  - units/
```

### 数据对接

```
PlanSnap Project Data
  ↓ Project ID 结构兼容
IsoSnap Project Data
  ↓ 未来可能对接
JSS (Job Site Snapshot)
```

---

## 💡 重要提醒

### 1. 产品边界要严格

**任何新功能都要问：**
```
这是 PlanSnap 的功能吗？
还是 IsoSnap 的功能？
还是 JSS 的功能？

如果不确定 → 现在不做
```

---

### 2. 性能从一开始就要考虑

```
线段超过 100 条 → 必须用空间索引
推断计算 → 必须 < 16ms（60fps）
Grid 渲染 → 可以用 canvas offscreen
```

---

### 3. 单位系统不能妥协

```
所有几何 = mm
所有显示 = 格式化
所有输入 = 解析后立即转 mm

没有例外
```

---

### 4. 用户体验优先于技术

```
10分钟出图 > 功能完整
不用教程 > 功能丰富
像 CAD > 像 App
```

---

## 📞 如何联系上一个窗口

**如果需要更多背景信息：**
- 关于 JSS 的问题 → 回到 JSS 项目对话框
- 关于 IsoSnap 的问题 → 参考双产品线战略文档
- 关于整体战略 → 参考战略决策文档

---

## 🎯 新窗口的首要任务

### 立即要做（本周）

1. **创建文档索引** - 所有PlanSnap文档的目录
2. **审查已有文档** - 确保理解所有关键决策
3. **准备Sprint 2规划** - 设计和开发的详细任务

---

### 短期目标（2周内）

1. **完成Figma设计** - 11个页面
2. **启动开发** - 数据模型 + 2D引擎
3. **CAD风格改进** - 线宽 + Inference

---

### 中期目标（1个月内）

1. **完成 MVP** - 可用的PlanSnap
2. **单位系统封印** - 架构级稳定
3. **Beta 测试** - 收集用户反馈

---

## 🎓 最后的话

### 给新窗口CDO

欢迎接手 PlanSnap 项目！

这是一个很有潜力的产品，CEO、CPO、COO 都投入了大量精力。你手上的这些文档是他们深思熟虑的结果。

**关键原则：**
1. 产品边界要守住
2. 专业感要做到位
3. 架构基础要稳固

**记住CPO的话：**
> "快于 CAD，准于手画，10分钟出图"

**记住CEO的期待：**
> "这就是你们可以堂堂正正卖 $19.99 的底气"

加油！有任何问题随时回来找我。

---

**交接人：** CDO (JSS 项目对话框)  
**交接时间：** 2026-02-02  
**文档版本：** v1.0  
**状态：** ✅ 已完成交接

---

祝 PlanSnap 项目顺利！🚀
