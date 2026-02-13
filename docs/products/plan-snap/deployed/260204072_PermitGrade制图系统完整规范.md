# PlanSnap Permit-Grade制图系统设计规范 v1.0

> **会议时间：** 2026-02-04 07:25  
> **文档类型：** CPO定型文档系列（设计宪法）  
> **优先级：** 🔴 P0 - 产品核心竞争力  
> **状态：** 已定型，待执行

---

## 📋 目标（Why）

### 核心定位

让contractor在**0思考状态**下，画出可闭合、可标注、政府敢收的几何。

### 系统哲学

> **PlanSnap不是画图工具，是几何事实记录器。**

---

## 🎯 五大核心规范（Complete System）

本文档整合了5个相互关联的设计规范：

1. **Snap & Precision** - 强吸附系统
2. **Dimension = Constraint** - 尺寸交互
3. **Line → Wall 转换** - 几何容差
4. **Dimension 自动布局** - 阅读秩序
5. **Permit PDF 输出** - 交付物规范

---

# Part 1：Snap & Precision 设计规范

## 核心哲学

**PlanSnap的Snap不是辅助，而是接管。**  
**一旦系统知道你想对齐，它就不该再让你犯错。**

---

## 📐 Snap优先级金字塔

```
┌───────────────────────────┐
│  P0  已有端点 / 闭合点     │  ← 必须锁死
├───────────────────────────┤
│  P1  引导线（延长 / 对齐） │  ← 硬吸附
├───────────────────────────┤
│  P2  Grid 交点             │  ← 超强吸附
├───────────────────────────┤
│  P3  Grid 线               │
├───────────────────────────┤
│  P4  自由空间              │
└───────────────────────────┘
```

### 重要原则（必须遵守）

✅ **高优先级一旦命中，低优先级全部失效**  
✅ **同一时间只允许一个Snap State**  
✅ **Snap ≠ 提示，Snap = 坐标接管权**

---

## 🔄 Snap状态机设计

### ❌ 明确禁止的做法

- ❌ 多个磁力叠加
- ❌ 距离加权平均
- ❌ "吸一下但还能跑"

### ✅ 正确做法：Snap State Machine

```typescript
enum SnapState {
  ENDPOINT = 'ENDPOINT',       // P0
  GUIDE_LINE = 'GUIDE_LINE',   // P1
  GRID_POINT = 'GRID_POINT',   // P2
  GRID_LINE = 'GRID_LINE',     // P3
  FREE = 'FREE'                // P4
}

function resolveSnap(cursor) {
  if (nearEndpoint(cursor))      return ENDPOINT
  if (nearGuideLine(cursor))     return GUIDE_LINE
  if (nearGridPoint(cursor))     return GRID_POINT
  if (nearGridLine(cursor))      return GRID_LINE
  return FREE
}
```

每一个SnapState必须同时决定：
- cursor的最终坐标
- 是否允许沿某方向移动
- UI高亮样式
- 是否允许"脱离"

---

## 💪 强吸附行为定义

### 1️⃣ 引导线（Guide Line）= 硬吸附

**触发条件：**
```
distance(cursor, guideLine) ≤ guideSnapThreshold
```

**行为规则（定型）：**
- ✅ cursor在法向方向**直接锁死**
- ✅ 只允许沿引导线方向移动
- ❌ 不允许"斜着飘过去"

**体感目标：**
> "鼠标被拽住了"

---

### 2️⃣ Grid交点（Grid Point）= 超强吸附

**规则（定型）：**
- ✅ Grid交点吸附半径 > 引导线
- ✅ 一旦进入：cursor直接跳到交点
- ❌ 不允许任何微调
- ✅ Grid交点优先级**高于**Grid线

**体感目标：**
> "这里是绝对安全的落点"

---

### 3️⃣ 闭合优先原则（Closure Bias）🌟 PlanSnap独有

**定义：**  
当用户"明显意图闭合"，系统**必须**帮他完成闭合。

**触发条件：**
```
distance(currentPoint, startPoint) ≤ closureThreshold
```

**行为：**
- ✅ 强制snap到起点
- ✅ 即使鼠标未精确对准
- ✅ 视觉反馈：起点闪一下 / 高亮1帧
- ✅ 可选轻微"click"感

**CPO裁决：**
> 闭合失败 = 产品失败  
> 不允许交给用户手稳不稳来决定

---

## 📊 Snap区域半径配置

⚠️ **数值不是绝对，相对强弱不可颠倒**

| Snap类型 | 相对半径 | 备注 |
|---------|---------|------|
| **Endpoint / Closure** | ⭐⭐⭐⭐⭐ | 最大 |
| **Grid Point** | ⭐⭐⭐⭐☆ | 比Guide强 |
| **Guide Line** | ⭐⭐⭐☆ | 锁方向 |
| **Grid Line** | ⭐⭐☆ | 辅助 |
| **Free Space** | — | 无 |

---

## 🎨 UI反馈最低要求

### 设计原则

📌 不需要动画  
📌 不需要音效  
📌 只要"确定感"

### 具体要求

**引导线：**
- 绿色 OK
- 进入硬吸附区：加亮/加粗1帧即可

**Grid交点：**
- 小十字 or 点
- 出现即代表锁定成功

---

## 🚨 为什么这套规则不可妥协

1. **Snap手感 = 肌肉记忆**
   - 后期再改 = 用户重新学习

2. **Contractor的评价只有一句话：**
   - "这个画线准不准，会不会老是闭合不了"
   - 不是："你们功能多不多"

---

# Part 2：Dimension = Constraint 交互规范

## 核心哲学

### ❌ 传统软件的错误模型

- 尺寸 = annotation
- 可以随便挪、随便改数字

### ✅ PlanSnap的模型

- Dimension = Constraint（几何约束）
- 尺寸永远来自真实几何

**结论：**  
用户不能直接"改一个数而几何不变"。

---

## 📏 Dimension的三种合法来源（唯一允许）

### 1️⃣ 自动生成（Primary）

- 画完线 → 自动生成尺寸
- 尺寸 = line.length（内部mm）
- UI显示英制（到1/16"）

👉 这是默认路径，80%使用场景

---

### 2️⃣ 用户输入数值 → 反推几何（Constraint Edit）

这是唯一允许"打数字"的情况。

**规则（定型）：**

用户点击尺寸 → 输入12' 6 1/2" → 系统行为：
- ✅ 修改线段几何
- ✅ 保持吸附关系（若可行）
- ✅ 更新所有关联尺寸

📌 **不是改字，是改线**

---

### 3️⃣ 系统派生尺寸（Derived）

**例如：**
- Overall width / depth
- 连续线段合并尺寸

**规则：**
- 只读
- 不可编辑
- 用样式区分（灰一点）

---

## 🔗 Dimension的绑定规则（非常关键）

每一个Dimension必须绑定到：
- 一个或多个Line Segment
- 明确的端点集合

**不允许：**
- ❌ 自由漂浮的尺寸
- ❌ 与几何脱钩的文字

**结果：**
- 👉 删线 = 尺寸消失
- 👉 改线 = 尺寸更新

---

## 👁️ Dimension的可见性优先级

**永远遵循：**
```
尺寸 > 线 > Grid
```

**实际表现：**

**Zoom out时：**
- 线可以变细
- 尺寸必须还能读

**打印预览：**
- 尺寸权重最高
- 比墙体更重要

📌 这是"Permit图"的潜规则

---

## ✏️ 编辑Dimension时的交互定型

### 点击尺寸 → 进入"Constraint Edit Mode"

**状态变化：**
- 尺寸高亮
- 关联线高亮
- 其他尺寸淡出

**输入行为：**

只接受合法单位格式：
- 10'
- 8' 3"
- 6' 1/2"
- 内部统一转mm

---

### 输入后的几何处理优先级

1. 保持端点吸附
2. 保持直角 / 引导线
3. 若冲突 → 明确报错（不悄悄歪）

**❌ 不允许：**
- 偷偷偏角度
- 破坏闭合而不提示

---

## ⚠️ Dimension冲突处理（必须明确）

### 冲突定义

当一个尺寸修改会导致：
- 闭合失败
- 几何自相矛盾
- 破坏已锁定约束

### 系统行为（定型）

- ✅ 阻止修改
- ✅ 明确提示："This dimension conflicts with existing constraints."

👉 **不自动帮用户"找个差不多的解"**

---

## 🔄 Dimension与Snap的联动

当cursor在画线时：
- 若附近存在尺寸约束：
  - Snap优先级 ↑
- 已有尺寸线的端点：
  - 视同Endpoint（P0）

📌 **尺寸一旦存在，它就"升格"成结构性元素**

---

## 📐 单位与精度规则（不可讨论）

### 内部

- 统一mm
- 不用float
- 存整数

### UI显示

- 英制
- 默认到1/16"
- 不四舍五入导致几何变化

👉 **显示 ≠ 存储**

---

## 📄 Permit输出中的Dimension规则

**所有输出图：**
- ❌ 不允许"未绑定尺寸"
- ❌ 不允许"手写尺寸"
- ❌ 不允许不同单位混用

**Permit Reviewer看到的应是：**
- 一致
- 可追溯
- 不模糊

---

## 💬 CPO最终裁决

> **如果一个尺寸不能决定几何，它就不该存在。**
> 
> **PlanSnap不是画图工具，是几何事实记录器。**

---

# Part 3：Line → Wall 转换规则 & 几何容差规范

## 核心原则

**线是事实，墙是解释；**  
**解释可以换，事实不能动。**

---

## 🤔 为什么Line → Wall必须是"显式操作"

### ❌ Magicplan / 设计软件的错误路径

- 画墙 = 事实
- 尺寸 = 后补

**结果：**
- 墙体看起来"齐"
- 尺寸却不可追溯
- reviewer一改就炸

### ✅ PlanSnap的路径

- 线 = 现场测量事实
- 墙 = 用户在"解释这些线代表什么结构"

**结论：**  
Line → Wall绝不能是自动、隐形、不可逆的。

---

## 🧱 Line与Wall的角色定义

### Line（事实层 / Immutable Truth）

**代表：**
- 测量边界
- 空间净尺寸
- Opening边

**特性：**
- 不带厚度
- 可标注
- 可闭合
- 永远保留

---

### Wall（表达层 / Derived Geometry）

**代表：**
- 结构表达
- Permit视觉语言

**特性：**
- 有厚度
- 有对齐方式
- 可删除 / 可重算
- 不能反向修改Line

👉 **禁止Wall反推Line（这是底线）**

---

## 🔘 触发Line → Wall的唯一方式

### ❌ 禁止

- 自动生成墙
- 画线时直接有厚度

### ✅ 唯一合法入口

用户明确点击：**"Convert to Walls"**

这是一个**语义动作**，不是绘图行为。

---

## ⚙️ Wall生成的三大核心参数（必须显式）

### 1️⃣ Wall Thickness（墙厚）

**预设选项：**
- 2×4
- 2×6
- CMU
- Custom（高级）

**默认值：**
- 上一次使用的值
- 或项目模板值

📌 墙厚是Permit信息，不是几何信息

---

### 2️⃣ Alignment Mode（对齐方式）【极关键】

**用户必须明确选择之一：**

```
[ Inside Face ]   ← 最常见（净尺寸不变）
[ Centerline  ]
[ Outside Face ]
```

**行为定义：**

**Inside Face：**
- Wall内边 = 原Line

**Centerline：**
- Wall中线 = 原Line

**Outside Face：**
- Wall外边 = 原Line

📌 **默认推荐Inside Face（最contractor）**

---

### 3️⃣ Wall Set Scope（转换范围）

- 当前闭合轮廓
- 选中线段
- 全图

👉 防止"全图误伤"

---

## 📏 几何容差（Tolerance）规则

### 1️⃣ Line闭合容差（Closure Tolerance）

```
closureTolerance = min(6 mm, 1/16")
```

**小于该值：**
- 视为闭合
- 系统自动闭合

**大于该值：**
- 明确提示：轮廓未闭合
- 禁止转墙

📌 **Permit图不接受"差一点"**

---

### 2️⃣ 共线 / 共点容差

**线段端点：**
- 在容差内 → 视为同点

**共线：**
- 角度误差 ≤ 0.5° → 视为共线

👉 这是为了应对现场手抖，而不是放水

---

## 🚫 Wall生成时的"不允许发生的事"（红线）

### ❌ 禁止行为（写进单元测试）

**为了闭合：**
- ❌ 偷偷移动Line

**为了对齐：**
- ❌ 改变角度

**为了看起来好：**
- ❌ 拉直本来是斜的线

📌 **视觉永远服从事实**

---

## ✏️ Wall生成后的编辑规则（防止灾难）

### 允许：

- ✅ 改墙厚
- ✅ 改对齐方式
- ✅ 删除墙
- ✅ 重新生成墙

### 不允许：

- ❌ 拖墙改变空间尺寸
- ❌ 拖墙导致Line被改

👉 **墙永远是disposable的**

---

## 📐 Dimension与Wall的关系

### 定型规则：

- 所有Dimension仍然**绑定Line**
- Wall不拥有尺寸
- Wall只被尺寸"解释"

**这保证了：**
- 改墙厚 ≠ 改尺寸
- Permit reviewer改表达不破坏事实

---

## 📄 Permit输出时的表达策略

### 默认输出：

- Line → Dimension：主信息
- Wall：表达层（稍粗）

### 可选：

- "Wall-only view"
- 👉 但尺寸来源仍是Line

---

## 💬 CPO最终裁决

> **如果Line和Wall混在一起，PlanSnap会变成另一个Magicplan。**
> 
> **我们宁愿多一步"Convert"，也不允许一张"看起来对、但不可追溯"的图。**

---

# Part 4：Dimension自动布局 & 阅读秩序规范

## 核心哲学

**尺寸不是"贴上去的"，而是"被安排好的"。**

用户不应该：
- 手动挪尺寸
- 想"这个放哪比较好看"

系统必须：
- 默认就像专业制图员画的
- 不用调，也不该调

**结论：**  
Dimension布局是系统责任，不是用户技巧。

---

## 👁️ Permit阅读的真实顺序

这是Reviewer的眼睛路径，不是设计师的审美。

```
1️⃣ Overall dimensions（总尺寸）
2️⃣ Room / bay clear dimensions（净尺寸）
3️⃣ Openings（门窗）
4️⃣ 局部补充尺寸
```

👉 PlanSnap的自动布局，必须强制遵循这个顺序

---

## 📊 Dimension分层体系（根结构）

### Layer 1｜Overall Dimensions（最外层）

**表示：**
- 建筑整体宽 / 深
- 主轮廓极值

**规则：**
- 永远放在最外侧
- 不与任何其他尺寸混层

**Permit意义：**
- Reviewer第一眼确认scale

📌 这是"你这个图靠不靠谱"的第一判断

---

### Layer 2｜Primary Space Dimensions（房间 / 净尺寸）

**表示：**
- Room clear width / depth

**规则：**
- 放在轮廓内侧
- 与墙平行
- 尽量靠近被标注空间

**不允许：**
- 交叉
- 穿过空间

---

### Layer 3｜Opening Dimensions（门 / 窗）

**表示：**
- Opening宽
- 距角距离

**规则：**
- 优先靠近opening
- 平行于所在墙

**可合并规则：**
- 同一墙体可串联

---

### Layer 4｜Secondary / Derived（补充）

**表示：**
- 连续线段合并尺寸

**规则：**
- 只读
- 灰色
- 不抢主视觉

---

## 📐 Dimension的"向外生长"规则

### 原则

**尺寸只往外推，不往里挤。**

### 具体规则

从被标注线段的法向方向：
1. 先尝试最近可用空间
2. 若冲突 → 推到下一层

**不允许：**
- 压在几何上
- 穿墙
- 穿opening

📌 这是专业图 vs 草图的分水岭

---

## ⚠️ 冲突解决策略（系统必须自己解决）

### 冲突类型

- 尺寸线重叠
- 尺寸文字遮挡
- 尺寸穿越几何

### 自动解决顺序（写死）

```
1️⃣ 推远（增加offset）
2️⃣ 换层（Layer 2 → Layer 3）
3️⃣ 合并（Chain Dimension）
4️⃣ 最后才允许折线（Jog）
```

**❌ 不允许：**
- 重叠不管
- 让用户自己拖

---

## 🔗 Chain Dimension（工程图感的关键）

### 定型规则

同一方向 + 同一墙 / 连续线段 → 自动合并为Chain

**示意：**
```
|----|----|----|
 3'    4'    5'
```

**而不是：**
```
|--------- 12' ---------|
```

📌 Chain是reviewer最熟悉的语言

---

## 📝 文字方向与可读性规则

### 规则

所有尺寸文字：
- 永远正向阅读
- 不倒置
- 不随线旋转180°

📌 **Reviewer不会歪头看图**

---

## 🔍 Zoom与Print行为

### Zoom out：

- 尺寸优先级最高
- 线可细
- Grid可消失

### Print / PDF：

- 固定比例
- 固定字号
- 不随屏幕缩放

📌 这是"图"和"画布"的区别

---

## 🎛️ 用户"可控"的边界（非常克制）

### 允许：

- ✅ 开/关某一类Dimension（Overall / Opening）
- ✅ 选择显示单位

### 不允许：

- ❌ 手动拖尺寸
- ❌ 手动改offset
- ❌ 自定义样式

👉 **自由度 = 不专业的入口**

---

## 💬 CPO最终裁决

> **如果一个Permit Reviewer能一眼看懂尺寸层级，那这张图已经赢了。**
> 
> **PlanSnap的Dimension布局不是"智能"，而是"守规矩"。**

---

# Part 5：Permit PDF 图纸结构 & Sheet组成规范

## 🎯 核心定位

### ❌ 我们不做的事

- 不保证approval
- 不迎合每个city的奇葩模板
- 不做presentation drawing

### ✅ 我们做的事

- 输出**结构清晰、责任明确、尺寸可追溯**的图
- 降低reviewer的**认知摩擦（Cognitive Load）**

**结论：**  
PlanSnap输出的是Permit-Grade Draft, 不是Final Construction Drawing。

---

## 📄 PDF = Sheet集合，不是"一张图"

### 🚫 明确禁止

- 单页塞所有信息
- 用户自己决定放哪些内容

### ✅ 强制定型：标准Sheet Pack

```
Sheet 0  | Cover / Notes
Sheet 1  | Floor Plan (Walls)
Sheet 2  | Dimension Plan
Sheet 3  | Door & Window Plan (v1.1)
```

⚠️ MVP允许0–2，3可作为v1.1

---

## 📋 Sheet 0｜Cover / Notes

### 目的

让reviewer立刻知道这是什么图，找到责任主体。

### 固定内容（不可删）

- Project Address
- Description（Renovation / Interior Alteration）
- Drawing Type：Floor Plan
- Scale
- Units（Imperial）
- Date
- Prepared by（Company / Name）

### 固定声明（系统生成）

```
"All dimensions are derived from on-site measurements.
Units shown in Imperial. Internal geometry maintained in metric."
```

📌 这句话是"免责 + 专业感"

---

## 🏗️ Sheet 1｜Floor Plan（Walls Only）

### 核心目的

看**空间结构**，不是尺寸细节。

### 必须包含

- 墙体（清晰线重）
- 门窗符号（无尺寸或极少）
- 房间名称（可选）

### 必须不包含

- 杂乱尺寸
- Grid
- 编辑痕迹

📌 这是"快速扫一眼结构合理性"的Sheet

---

## 📐 Sheet 2｜Dimension Plan（灵魂）

### 核心目的

让reviewer验证：尺寸是否可信。

### 必须包含

- Overall dimensions（最外层）
- Room clear dimensions
- Opening distances（距角）

### 强制规则

- 尺寸来源全部来自Line
- 不出现Wall thickness尺寸（避免歧义）
- 尺寸层级清晰（外 → 内）

📌 **这张图reviewer看得最久**

---

## 🚪 Sheet 3｜Door & Window Plan（v1.1起）

### 内容

- Door / Window编号（D1, W1）
- 宽 / 高
- 开向
- 类型（optional）

### 同时生成

- Schedule Table（同页或附页）

📌 很多城市不是必须，但一旦有，就显得非常"懂行"

---

## 📏 比例、单位与版式（不可自由）

### 比例（自动选择）

- 小户型：1/4" = 1'-0"
- 大平面：1/8" = 1'-0"

**❌ 不允许用户乱选**  
👉 系统根据bounding box决定

### 单位

- 只显示Imperial
- 不混用mm / cm

### 字号

- 尺寸文字：固定
- 标题文字：固定
- 不随zoom / screen改变

📌 **PDF ≠ Canvas**

---

## 🎨 视觉克制原则（专业感来源）

### 明确"不做"的视觉元素

- ❌ 颜色区分空间
- ❌ 阴影
- ❌ 渐变
- ❌ 3D效果

### 只允许

- ✅ 黑白 / 灰阶
- ✅ 线重区分
- ✅ 标准符号

📌 **政府最信任"无设计感"的图**

---

## 🚫 错误状态与导出阻断

### 以下情况❌ 禁止导出PDF：

- 未闭合轮廓
- 尺寸冲突未解决
- 未声明比例
- 单位混乱

### 系统必须：

- 明确提示
- 指向问题位置

👉 **宁可让用户骂你，也不要让reviewer退件**

---

## 📁 文件命名规范（细节杀伤力）

### 自动命名：

```
[Address]_[DrawingType]_Permit_[YYYYMMDD].pdf
```

### 示例：

```
5862_Cambie_St_FloorPlan_Permit_20260204.pdf
```

📌 **Reviewer真的会在意这个**

---

## 💬 CPO最终封顶裁决

> **一个contractor如果能不用解释就交出这套PDF，那PlanSnap就完成使命了。**
> 
> **我们不是帮他"画图"，而是帮他"交付一个政府能消化的文件"。**

---

# 🔒 系统整合：五大规范的关联关系

```
┌─────────────────────────────────────────┐
│         Permit PDF 输出（交付物）         │
│  - Sheet结构                             │
│  - 比例与版式                             │
│  - 命名规范                              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Dimension自动布局（阅读秩序）        │
│  - 4层分层体系                           │
│  - 向外生长规则                          │
│  - 冲突自动解决                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Dimension = Constraint（核心逻辑）    │
│  - 尺寸绑定几何                          │
│  - 反向修改规则                          │
│  - 冲突检测                              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Line → Wall转换（事实与表达分离）     │
│  - 几何容差                              │
│  - 对齐方式                              │
│  - 编辑红线                              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Snap强吸附系统（基础手感）          │
│  - 优先级金字塔                          │
│  - 状态机                                │
│  - 闭合优先                              │
└─────────────────────────────────────────┘
```

---

## ✅ 验收标准（Definition of Done）

### 系统级验收

- [ ] 所有5个规范的代码实现完成
- [ ] 优先级严格按P0→P1→P2→P3→P4
- [ ] Line与Wall完全分离
- [ ] Dimension绑定Line，不绑定Wall
- [ ] PDF导出符合Sheet结构

### 手感验收（关键！）

- [ ] Snap体感："鼠标被拽住"
- [ ] 闭合体感："系统帮我完成"
- [ ] Dimension编辑："改数字=改几何"
- [ ] Wall生成："显式操作，可逆"
- [ ] PDF输出："专业感，可信赖"

### Permit级验收

- [ ] Reviewer能在30秒内判断"这是懂规矩的图"
- [ ] 尺寸层级一眼可见
- [ ] 闭合轮廓无误差
- [ ] 文件命名符合规范
- [ ] 无混用单位

---

## 📅 执行计划（完整系统）

### Phase 1：基础手感（Week 1）

**Day 1-4：Snap强吸附系统**
- Snap状态机
- 三种核心吸附
- UI反馈

**验收：** Snap手感达到SketchUp标准

---

### Phase 2：几何约束（Week 2）

**Day 1-3：Dimension = Constraint**
- Dimension绑定系统
- 反向修改逻辑
- 冲突检测

**Day 4-5：Line → Wall转换**
- 几何容差
- 对齐方式
- 转换UI

**验收：** 尺寸改动=几何改动，Wall不影响Line

---

### Phase 3：专业布局（Week 3）

**Day 1-3：Dimension自动布局**
- 4层分层体系
- 向外生长算法
- 冲突自动解决

**Day 4-5：Chain Dimension**
- 自动合并
- 文字方向
- Zoom行为

**验收：** 布局专业感达到CAD标准

---

### Phase 4：交付物（Week 4）

**Day 1-3：PDF Sheet系统**
- Sheet 0: Cover
- Sheet 1: Floor Plan
- Sheet 2: Dimension Plan

**Day 4-5：导出与验证**
- 错误阻断
- 命名规范
- 最终测试

**验收：** PDF符合Permit标准

---

## 🎯 成功标准（Ultimate Goal）

### 用户层面

Contractor能在**不读manual**的情况下：
- 画出可闭合的几何
- 生成可信赖的尺寸
- 导出政府敢收的PDF

### 产品层面

PlanSnap成为：
- "Permit-Friendly的标准"
- "专业Contractor的选择"
- "不是画图工具，是制图系统"

---

## 📌 CPO总结（写给未来）

> **这5个规范不是功能列表，而是PlanSnap的产品基因。**
> 
> **Snap定手感，Dimension定逻辑，Wall定架构，布局定气质，PDF定交付。**
> 
> **一个都不能妥协。**

---

**文档版本：** v1.0  
**定型人：** CPO  
**生效日期：** 2026-02-04  
**执行人：** CTO  
**预计周期：** 4周完整实现

---

PlanSnap不是画图App，是Permit-Grade制图系统！🚀
