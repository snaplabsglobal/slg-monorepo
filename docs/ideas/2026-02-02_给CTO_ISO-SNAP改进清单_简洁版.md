# ISO SNAP 原型改进清单（给CTO）

> **发件人：** CEO + CDO  
> **日期：** 2026-02-02  
> **优先级：** 🔴 Critical - 本周必须修复

---

## 🔴 P0 问题（生死线，必须立即修复）

### 1. 线条无法连接 ❌ **最致命的问题**

**现象：**
```
画布上的线条和节点是独立的
新线条不能连接到现有线条的端点
→ 无法画出"管道系统"
```

**为什么这是生死线：**
```
Isometric 绘图的核心是"连接的管道系统"
如果线条不能相连，这个工具就完全没用了
```

**必须实现：节点捕捉（Snap to Node）**

---

#### 快速实现方案

**核心逻辑：**

```typescript
// 1. 检测鼠标附近是否有节点
function findNearestNode(mouseX, mouseY) {
  const snapDistance = 15; // 15像素内自动吸附
  
  for (const node of allNodes) {
    const distance = Math.sqrt(
      (node.x - mouseX) ** 2 + 
      (node.y - mouseY) ** 2
    );
    
    if (distance < snapDistance) {
      return node;
    }
  }
  return null;
}

// 2. 绘制时使用
onMouseDown(e) {
  const nearNode = findNearestNode(e.x, e.y);
  
  if (nearNode) {
    startNode = nearNode; // 从现有节点开始
  } else {
    startNode = createNewNode(e.x, e.y); // 创建新节点
  }
}

onMouseUp(e) {
  const nearNode = findNearestNode(e.x, e.y);
  
  if (nearNode && nearNode !== startNode) {
    createEdge(startNode, nearNode); // 连接到现有节点
  } else {
    endNode = createNewNode(e.x, e.y);
    createEdge(startNode, endNode);
  }
}
```

**视觉反馈（必须有）：**
```
当鼠标靠近可捕捉的节点时：
1. 节点变大或高亮（灰色 → 黄色/白色）
2. 显示捕捉圈
3. 让用户知道："这里可以连接"
```

**工作量：** 1-2天

---

### 2. 缺少框选功能 ❌

**现象：**
```
只能一个一个点选对象
无法批量选择和操作
```

**为什么很重要：**
```
当画布上有 20+ 个对象时：
- 需要删除一片区域
- 需要整体移动
- 需要批量修改

框选是基础功能
```

**必须实现：矩形框选**

---

#### 快速实现方案

```typescript
let selectionBox = null;

// Select 工具激活时
onMouseDown(e) {
  const clickedObject = findObjectAt(e.x, e.y);
  
  if (clickedObject) {
    toggleSelection(clickedObject); // 单选
  } else {
    // 开始框选
    selectionBox = {
      startX: e.x,
      startY: e.y,
      endX: e.x,
      endY: e.y
    };
  }
}

onMouseMove(e) {
  if (selectionBox) {
    selectionBox.endX = e.x;
    selectionBox.endY = e.y;
    drawSelectionBox(selectionBox); // 画虚线矩形
  }
}

onMouseUp(e) {
  if (selectionBox) {
    const selected = findObjectsInBox(selectionBox);
    setSelection(selected);
    selectionBox = null;
  }
}
```

**视觉反馈：**
```
框选矩形：
- 虚线边框（蓝色）
- 半透明填充 rgba(100, 150, 255, 0.1)

选中的对象：
- 边框加粗或变色
```

**工作量：** 1天

---

### 3. 节点拖动 ⚠️

**当前缺失：**
```
无法移动已有的节点
已画的管道无法调整
```

**必须支持：**
```
1. 点击节点 → 拖动 → 连接的线段跟着动
2. 选中线段 → 显示属性
3. 删除节点 → 自动删除连接的线段
```

**工作量：** 0.5天

---

## 🟡 P1 改进（强烈建议本周完成）

### 4. Fixture 显示和放置 ✅

**当前状态：** 有按钮，但不知道怎么显示

**实现方案：**
```
简单文本标签方式（MVP 够用）：
- 在节点旁边显示 "WC"、"LAV"、"SINK"
- 字体稍大、加粗、白色
```

**交互：**
```typescript
// 点击 Fixture 按钮 → 选择类型
// 点击画布上的节点 → 放置

onCanvasClick(e) {
  if (currentTool === 'fixture') {
    const nearNode = findNearestNode(e.x, e.y);
    
    if (nearNode) {
      addFixture(nearNode, selectedFixtureType);
    }
  }
}
```

**工作量：** 1天

---

### 5. 管径标注显示 ✅

**当前状态：** 有按钮（1-1/2", 2", 3", 4"），但不知道怎么用

**实现方案：**
```
显示在线段中点附近：
- 小字号（12-14px）
- 例如：'2"' 或 'Ø2"'
```

**应用方式：**
```
画线之前：在工具栏选择管径
画出的线：自动带这个管径标注
```

**工作量：** 0.5天

---

### 6. 文本工具完善 ✅

**Text 工具应该做什么：**

```typescript
onCanvasClick(e) {
  if (currentTool === 'text') {
    const text = prompt("Enter label:");
    
    if (text) {
      createTextLabel(e.x, e.y, text);
    }
  }
}
```

**显示：**
```
- 字体：sans-serif, 14px
- 颜色：白色
- 可拖动
- 可双击编辑
```

**工作量：** 0.5天

---

### 7. 工具状态反馈 ✅

**问题：**
```
- 不清楚当前激活哪个工具
- 鼠标指针没变化
```

**解决：**
```css
/* 激活工具高亮 */
.tool-button.active {
  background: #2563eb;
  border: 2px solid #60a5fa;
}

/* 鼠标指针 */
.canvas[data-tool="drain"] { cursor: crosshair; }
.canvas[data-tool="select"] { cursor: default; }
```

**工作量：** 0.5天

---

## 🟢 P2 优化（后续可加）

8. Grid 视觉提示（淡淡的 isometric grid）
9. 键盘快捷键（D=Drain, V=Vent, S=Select...）
10. 导出预览对话框
11. 最近草图列表

---

## ⏱️ 时间估算

### 本周必须完成（P0）

| 任务 | 工作量 | 优先级 |
|------|--------|--------|
| 节点捕捉系统 | 1-2天 | 🔴 P0 |
| 框选功能 | 1天 | 🔴 P0 |
| 节点拖动 | 0.5天 | 🔴 P0 |

**P0 总计：2.5-3.5天**

---

### 下周完成（P1）

| 任务 | 工作量 | 优先级 |
|------|--------|--------|
| Fixture 显示 | 1天 | 🟡 P1 |
| 管径标注 | 0.5天 | 🟡 P1 |
| 文本工具 | 0.5天 | 🟡 P1 |
| 工具状态 | 0.5天 | 🟡 P1 |

**P1 总计：2.5天**

---

## 📊 数据结构（确保正确）

**必须使用的模型：**

```typescript
// 核心数据
interface Node {
  id: string;
  x: number;
  y: number;
  connectedEdges: string[]; // 重要！
}

interface Edge {
  id: string;
  fromNodeId: string; // 引用 Node.id
  toNodeId: string;   // 引用 Node.id
  type: 'drain' | 'vent';
  diameter: '1-1/2"' | '2"' | '3"' | '4"';
  label?: string;
}

interface Fixture {
  id: string;
  type: 'WC' | 'LAV' | 'SINK' | 'SHOWER' | 'FD';
  nodeId: string; // 放在哪个节点上
}

// 全局状态
const state = {
  nodes: new Map<string, Node>(),
  edges: new Map<string, Edge>(),
  fixtures: new Map<string, Fixture>(),
  selectedNodes: new Set<string>(),
  selectedEdges: new Set<string>()
};
```

---

## ✅ 验收标准

**P0 修复后，必须能做到：**

1. **连接测试**
   ```
   - 画一条 drain
   - 从它的终点再画一条 vent
   - 两条线应该连在一起（共享节点）
   ```

2. **框选测试**
   ```
   - 画 5 条线
   - 用鼠标框选其中 3 条
   - 可以一起删除
   ```

3. **编辑测试**
   ```
   - 拖动一个节点
   - 连接的线段应该跟着动
   ```

**如果这3个测试通过 → P0 修复成功！**

---

## 💬 一句话总结（给CTO）

**当前原型最大的问题：**
> "线条不能连接成系统，框选功能缺失。  
> 这两个是 isometric 绘图工具的生死线。"

**本周目标：**
```
P0（2.5-3.5天）：节点捕捉 + 框选 + 节点拖动
→ 让它变成真正能用的绘图工具
```

**下周目标：**
```
P1（2.5天）：Fixture + 管径 + 文本 + 视觉反馈
→ 让它变成专业的 plumbing 工具
```

---

## 🎯 需要CTO确认的

1. **节点捕捉的吸附距离**
   - 建议：15像素
   - 可调整

2. **框选的快捷键**
   - 建议：默认 Select 工具，或按住 Shift

3. **节点的视觉大小**
   - 建议：直径 8-10px（默认）
   - 可捕捉时：12-14px

---

**版本：** v1.0  
**创建时间：** 2026-02-02  
**优先级：** 🔴 Critical  
**预计完成：** P0 本周，P1 下周

---

**CTO，这些改进会让 ISO SNAP 从"不可用" → "可用" → "好用"。加油！** 💪
