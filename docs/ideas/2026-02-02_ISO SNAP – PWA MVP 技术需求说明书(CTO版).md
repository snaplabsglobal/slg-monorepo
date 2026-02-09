**ISO SNAP – PWA MVP 技术需求说明书（CTO版）**

### 0) 目标与范围

我们要做一个 **Web-first PWA**（不上架 App Store），用于让管工在现场快速画 **plumbing isometric sketch** 并导出给 Inspector/客户看。  
**时间目标：2–3 周出可用 MVP。**

**核心成功标准：**

- 10 分钟内画完 WC + lav + washer/sink 的 isometric（受限方向）

- 能导出清晰 PDF/PNG（黑白线稿+免责声明）

- 弱网/离线可用（至少打开与继续编辑不依赖后端）

---

### 1) MVP 必做功能

#### 1.1 画布（Canvas）

- 单页 Canvas 应用（HTML5 Canvas 或 Konva/Fabric 均可）

- 固定 isometric grid（视觉提示即可，不需要真实 3D）

- 支持基本操作：
  
  - Pan（拖动视图）
  
  - Zoom（双指/滚轮，限制范围即可）
  
  - Snap-to-grid（粒度可粗，优先好用）

#### 1.2 绘制逻辑（关键：受限方向）

只允许 3 种方向：

- **Vent：vertical（↑↓）**

- **Drain：45° 右下（↘）**

- **Drain：45° 左下（↙）**

工具栏（最小）：

- Drain tool

- Vent tool

- Select tool（点选/移动节点）

- Delete

- Undo/Redo（最少 20 步）

交互（最小）：

- 点选起点 → 拖拽到终点 → 自动吸附到三方向之一

- 线段以“节点-线段”模型存储（便于后续编辑/撤销）

#### 1.3 语义标注（最小 plumbing 语言）

- 每条线段可设置管径：
  
  - 1-1/2", 2", 3", 4"

- 支持放置 fixture 标记（5 个就够）：
  
  - WC、LAV、SINK、SHOWER、FD（Emergency）

- 支持添加文本标签（纯文本）：
  
  - 例如 “WC wet vented via lav”
  
  - “Emergency drain – no vent”
  
  - “Existing 4” SAN”

> 注意：**不做任何 code 合规判断**，只做“表达”。

#### 1.4 本地存储（无后端）

- 默认保存到本地（IndexedDB 优先）

- 刷新后可恢复最近 1 张草图（或最近 N 张，先 1 张也行）

#### 1.5 导出

- Export PNG

- Export PDF（A4/Letter 任一，优先清晰）

- 导出自动包含标题栏：
  
  - “Isometric sketch – for reference only”
  
  - 日期/时间
  
  - 可选：用户输入的项目名（纯文本）

- 导出带免责声明：
  
  - “Not for construction or permit approval.”

---

### 2) PWA 要求（最小）

- 安装到主屏（manifest + icons）

- 离线打开（service worker 缓存静态资源）

- iPad Safari 触控友好（双指缩放/拖动不卡顿）

---

### 3) 明确不做（红线）

- 不做账号/登录/云同步/协作

- 不做项目管理/文件夹/跨设备共享

- 不做 code check（pass/fail、compliant/non-compliant 都不做）

- 不做材料清单/BOM/报价/成本

- 不做多楼层/3D/碰撞检测

---

### 4) 交付物（2–3 周）

**V0.1 可交付：**

- 可画管（受限方向）+ snap + undo

- 可放 fixture + 管径标注

- 本地保存（至少 1 张）

- 导出 PDF/PNG（清晰、带免责声明）

- PWA 可安装、离线可打开

---

### 5) 工程建议（可选，不强制）

- 数据模型建议：
  
  - nodes: {id, x, y}
  
  - edges: {id, fromNodeId, toNodeId, type: drain|vent, diameter, label?}
  
  - fixtures: {id, type, nodeId, text?}

- 性能目标：
  
  - iPad Safari 50–200 条线段依旧顺滑

---

### 6) 需要你确认的技术决策（CTO 选）

- Canvas 库选型（原生 Canvas / Konva / Fabric）

- PDF 导出方案（canvas->image->pdf）

- IndexedDB 封装（简单即可）
