# ISO SNAP - 开发执行指南（Sprint 2）

> **From:** CDO + CPO  
> **To:** CTO  
> **Date:** 2026-02-02  
> **Version:** v1.1 - 可执行版  
> **Priority:** 🔴 Critical

---

## 🎯 唯一的判断标准

**一个管工能不能不骂人地把一套 WC + lav + vent 画完。**

---

## 💡 核心产品洞察（CPO）

### 你现在的问题是什么？

**你现在做的是：** "画线系统"  
**我们需要的是：** "节点驱动的管路系统"

**这是产品理解的差异，不是代码能力问题。**

---

### Isometric 工具的本质

> **CPO 一句话：**  
> Isometric 工具不是"画得出来"，而是"画完还能改"。

**在管工脑子里：**
```
管 = 连续的
接头 = 节点
系统 = 一棵树

如果线只是"视觉上挨着"，但逻辑上没连：
→ 这不是管路，是涂鸦
```

---

## 🔴 致命问题（必须立即修复）

### 问题 1：线条不能"接上" ❌

**现象：**
- 线只是"视觉上挨着"
- 逻辑上没有连接
- 不是管路系统，是独立的线

**为什么致命：**
```
这是生死线。
没有这个，ISO SNAP 就不是 plumbing 工具，而是涂鸦板。
```

---

### 问题 2：没有框选/多选 ❌

**现象：**
- 只能一个个点选
- 无法批量操作
- 画完无法调整

**为什么致命：**
```
管工画图的常见操作：
画完一段 → 发现不对 → 整段挪/删

没有框选 = 没法改图 = 不可用
```

---

## 📋 Sprint 2 开发清单（逐条勾选）

### 🔴 P0 - 必须完成（本周，3天）

#### [ ] Task 1: 节点系统（Node System）

**目标：** 管不是线，管是"节点 + 线段"的系统

**必须实现的数据结构：**

```typescript
// 核心数据模型
interface Node {
  id: string;
  x: number;
  y: number;
  connectedEdges: string[]; // 重要：跟踪所有连接
}

interface Edge {
  id: string;
  fromNodeId: string; // 必须引用真实的 Node
  toNodeId: string;   // 必须引用真实的 Node
  type: 'drain' | 'vent';
  diameter: '1-1/2"' | '2"' | '3"' | '4"';
  direction: 'vertical' | 'left-down' | 'right-down';
}

// 全局状态
const state = {
  nodes: new Map<string, Node>(),
  edges: new Map<string, Edge>(),
  selectedNodes: new Set<string>(),
  selectedEdges: new Set<string>()
};
```

**关键规则：**
```
1. 每条线段有：起点 node + 终点 node
2. Node 可以：被选中、被拖动、被复用（多条线接同一点）
3. 永远从 node 开始，没有"悬空线段"
```

**验收标准：**
- [ ] 线段必须引用真实的 Node（不能只是坐标）
- [ ] 一个 Node 可以连接多条 Edge
- [ ] 删除 Node 时，自动删除所有连接的 Edge

---

#### [ ] Task 2: 节点捕捉（Snap to Node）

**目标：** 画线到另一个 node 附近 → 自动吸附

**实现方案：**

```typescript
// 查找最近的可捕捉节点
function findNearestNode(mouseX: number, mouseY: number): Node | null {
  const SNAP_DISTANCE = 15; // 15像素内自动吸附
  
  let nearestNode: Node | null = null;
  let minDistance = SNAP_DISTANCE;
  
  for (const node of state.nodes.values()) {
    const distance = Math.sqrt(
      (node.x - mouseX) ** 2 + 
      (node.y - mouseY) ** 2
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = node;
    }
  }
  
  return nearestNode;
}

// 绘制流程
let drawingState = {
  isDrawing: false,
  startNode: null as Node | null,
  tempEndX: 0,
  tempEndY: 0
};

// 鼠标按下
function onMouseDown(e: MouseEvent) {
  if (currentTool !== 'drain' && currentTool !== 'vent') return;
  
  const nearNode = findNearestNode(e.offsetX, e.offsetY);
  
  if (nearNode) {
    // 从现有节点开始
    drawingState.startNode = nearNode;
  } else {
    // 创建新节点
    drawingState.startNode = createNode(e.offsetX, e.offsetY);
  }
  
  drawingState.isDrawing = true;
}

// 鼠标移动
function onMouseMove(e: MouseEvent) {
  if (!drawingState.isDrawing) return;
  
  // 实时更新临时终点
  drawingState.tempEndX = e.offsetX;
  drawingState.tempEndY = e.offsetY;
  
  // 重绘（显示虚线预览 + 方向锁定）
  render();
}

// 鼠标松开
function onMouseUp(e: MouseEvent) {
  if (!drawingState.isDrawing) return;
  
  const nearNode = findNearestNode(e.offsetX, e.offsetY);
  let endNode: Node;
  
  if (nearNode && nearNode !== drawingState.startNode) {
    // 连接到现有节点
    endNode = nearNode;
  } else {
    // 创建新的终点节点
    endNode = createNode(e.offsetX, e.offsetY);
  }
  
  // 创建线段
  createEdge(drawingState.startNode!, endNode, currentTool);
  
  // 重置状态
  drawingState.isDrawing = false;
  drawingState.startNode = null;
  
  // 自动切换到 Select 模式（CPO 建议）
  currentTool = 'select';
}
```

**视觉反馈（必须有）：**

```typescript
// 渲染时的反馈
function render() {
  // ... 基础渲染
  
  // 1. Hover 反馈
  if (hoveredNode) {
    drawNodeHighlight(hoveredNode, 'yellow', 12); // 放大+高亮
  }
  
  // 2. 可捕捉节点的反馈
  if (drawingState.isDrawing) {
    const nearNode = findNearestNode(
      drawingState.tempEndX, 
      drawingState.tempEndY
    );
    
    if (nearNode) {
      // 显示"捕捉圈"
      drawSnapCircle(nearNode, 'green');
    }
  }
  
  // 3. 绘制中的虚线预览
  if (drawingState.isDrawing && drawingState.startNode) {
    const locked = lockToDirection(
      drawingState.startNode.x,
      drawingState.startNode.y,
      drawingState.tempEndX,
      drawingState.tempEndY
    );
    
    // 画虚线预览
    drawDashedLine(
      drawingState.startNode.x,
      drawingState.startNode.y,
      locked.endX,
      locked.endY,
      'rgba(255, 255, 255, 0.5)'
    );
  }
}
```

**验收标准：**
- [ ] 鼠标靠近节点（15px内）时，节点变大或高亮
- [ ] 显示"捕捉圈"（绿色圆圈）
- [ ] 松开鼠标时，线段确实连接到该节点
- [ ] 可以从一个节点的终点画出第二条线（共享节点）

---

#### [ ] Task 3: 三向锁定 + 角度吸附

**目标：** 系统自动判断最接近的方向，用户不需要"画准"

**实现方案：**

```typescript
// 方向定义
enum Direction {
  VERTICAL = 'vertical',      // ↑↓
  LEFT_DOWN = 'left-down',    // ↙ (45°)
  RIGHT_DOWN = 'right-down'   // ↘ (45°)
}

// 锁定到最近的方向
function lockToDirection(
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): { endX: number; endY: number; direction: Direction } {
  
  const dx = mouseX - startX;
  const dy = mouseY - startY;
  
  // 计算角度（弧度）
  const angle = Math.atan2(dy, dx);
  const degrees = angle * (180 / Math.PI);
  
  // 判断最接近的方向
  // vertical: -90° (正下) or 90° (正上)
  // left-down: -135° 
  // right-down: -45°
  
  const absAngle = Math.abs(degrees);
  
  if (absAngle < 22.5 || absAngle > 157.5) {
    // 接近水平 → 不允许（或锁定到最近的45°）
    // 简化：强制改为 right-down
    return lockToRightDown(startX, startY, mouseX, mouseY);
  } else if (absAngle > 67.5 && absAngle < 112.5) {
    // 接近垂直 → Vertical
    return lockToVertical(startX, startY, mouseX, mouseY);
  } else if (degrees < 0 && degrees > -90) {
    // 右下象限 → Right-down (45°)
    return lockToRightDown(startX, startY, mouseX, mouseY);
  } else {
    // 左下象限 → Left-down (45°)
    return lockToLeftDown(startX, startY, mouseX, mouseY);
  }
}

// 锁定到垂直方向
function lockToVertical(
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): { endX: number; endY: number; direction: Direction } {
  return {
    endX: startX, // X 坐标不变
    endY: mouseY,
    direction: Direction.VERTICAL
  };
}

// 锁定到 45° 右下
function lockToRightDown(
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): { endX: number; endY: number; direction: Direction } {
  const dx = mouseX - startX;
  const dy = mouseY - startY;
  
  // 保持 45°：dx = dy
  const distance = Math.min(Math.abs(dx), Math.abs(dy));
  
  return {
    endX: startX + distance,
    endY: startY + distance,
    direction: Direction.RIGHT_DOWN
  };
}

// 锁定到 45° 左下
function lockToLeftDown(
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): { endX: number; endY: number; direction: Direction } {
  const dx = mouseX - startX;
  const dy = mouseY - startY;
  
  const distance = Math.min(Math.abs(dx), Math.abs(dy));
  
  return {
    endX: startX - distance,
    endY: startY + distance,
    direction: Direction.LEFT_DOWN
  };
}
```

**验收标准：**
- [ ] 画线时，只能画出3种方向（vertical, left-down, right-down）
- [ ] 其他角度会自动修正到最近的合法方向
- [ ] 拖动时有虚线预览，显示锁定后的方向

---

#### [ ] Task 4: 框选功能（Multi-select）

**目标：** 框中的对象可以整体移动、删除

**实现方案：**

```typescript
// 框选状态
let selectionBox: {
  isActive: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} = {
  isActive: false,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0
};

// Select 工具激活时
function onMouseDown_SelectTool(e: MouseEvent) {
  // 检查是否点击到了对象
  const clickedNode = findNodeAt(e.offsetX, e.offsetY);
  const clickedEdge = findEdgeAt(e.offsetX, e.offsetY);
  
  if (clickedNode) {
    // 单选节点
    if (!e.shiftKey) {
      state.selectedNodes.clear();
      state.selectedEdges.clear();
    }
    state.selectedNodes.add(clickedNode.id);
  } else if (clickedEdge) {
    // 单选线段
    if (!e.shiftKey) {
      state.selectedNodes.clear();
      state.selectedEdges.clear();
    }
    state.selectedEdges.add(clickedEdge.id);
  } else {
    // 开始框选
    if (!e.shiftKey) {
      state.selectedNodes.clear();
      state.selectedEdges.clear();
    }
    
    selectionBox.isActive = true;
    selectionBox.startX = e.offsetX;
    selectionBox.startY = e.offsetY;
    selectionBox.endX = e.offsetX;
    selectionBox.endY = e.offsetY;
  }
}

function onMouseMove_SelectTool(e: MouseEvent) {
  if (selectionBox.isActive) {
    selectionBox.endX = e.offsetX;
    selectionBox.endY = e.offsetY;
    render(); // 重绘框选矩形
  }
}

function onMouseUp_SelectTool(e: MouseEvent) {
  if (selectionBox.isActive) {
    // 找出框内的所有对象
    const box = {
      left: Math.min(selectionBox.startX, selectionBox.endX),
      top: Math.min(selectionBox.startY, selectionBox.endY),
      right: Math.max(selectionBox.startX, selectionBox.endX),
      bottom: Math.max(selectionBox.startY, selectionBox.endY)
    };
    
    // 选中框内的节点
    for (const node of state.nodes.values()) {
      if (isPointInBox(node.x, node.y, box)) {
        state.selectedNodes.add(node.id);
      }
    }
    
    // 选中框内的线段（至少一个端点在框内）
    for (const edge of state.edges.values()) {
      const fromNode = state.nodes.get(edge.fromNodeId)!;
      const toNode = state.nodes.get(edge.toNodeId)!;
      
      if (isPointInBox(fromNode.x, fromNode.y, box) ||
          isPointInBox(toNode.x, toNode.y, box)) {
        state.selectedEdges.add(edge.id);
      }
    }
    
    // 清除框选状态
    selectionBox.isActive = false;
  }
}

// 辅助函数
function isPointInBox(
  x: number,
  y: number,
  box: { left: number; top: number; right: number; bottom: number }
): boolean {
  return x >= box.left && x <= box.right &&
         y >= box.top && y <= box.bottom;
}

// 渲染框选矩形
function drawSelectionBox() {
  if (!selectionBox.isActive) return;
  
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
  ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]); // 虚线
  
  const x = Math.min(selectionBox.startX, selectionBox.endX);
  const y = Math.min(selectionBox.startY, selectionBox.endY);
  const width = Math.abs(selectionBox.endX - selectionBox.startX);
  const height = Math.abs(selectionBox.endY - selectionBox.startY);
  
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  
  ctx.setLineDash([]); // 恢复实线
}
```

**验收标准：**
- [ ] 在空白区域拖拽，出现虚线矩形框
- [ ] 框中的节点和线段自动选中（高亮显示）
- [ ] 按 Delete 可以删除所有选中的对象
- [ ] Shift + 点击可以添加到选区

---

#### [ ] Task 5: 节点拖动（保持连接）

**目标：** 拖动节点时，所有连接的线段跟着动

**实现方案：**

```typescript
// 拖动状态
let dragState = {
  isDragging: false,
  draggedNodeId: null as string | null,
  offsetX: 0,
  offsetY: 0
};

function onMouseDown_DragNode(e: MouseEvent) {
  const clickedNode = findNodeAt(e.offsetX, e.offsetY);
  
  if (clickedNode) {
    dragState.isDragging = true;
    dragState.draggedNodeId = clickedNode.id;
    dragState.offsetX = e.offsetX - clickedNode.x;
    dragState.offsetY = e.offsetY - clickedNode.y;
  }
}

function onMouseMove_DragNode(e: MouseEvent) {
  if (dragState.isDragging && dragState.draggedNodeId) {
    const node = state.nodes.get(dragState.draggedNodeId)!;
    
    // 更新节点位置
    node.x = e.offsetX - dragState.offsetX;
    node.y = e.offsetY - dragState.offsetY;
    
    // 连接的线段会自动跟随（因为引用的是同一个 node）
    render();
  }
}

function onMouseUp_DragNode(e: MouseEvent) {
  if (dragState.isDragging) {
    // 记录到历史（用于 Undo）
    addToHistory({
      type: 'move-node',
      nodeId: dragState.draggedNodeId,
      // ... 保存移动前后的坐标
    });
    
    dragState.isDragging = false;
    dragState.draggedNodeId = null;
  }
}
```

**验收标准：**
- [ ] 点击节点可以拖动
- [ ] 拖动节点时，所有连接的线段跟着移动
- [ ] 松开后，连接关系保持不变
- [ ] 可以 Undo 拖动操作

---

### 🟡 P1 - 强烈建议（下周，2.5天）

#### [ ] Task 6: 交互状态机（CPO 建议）

**目标：** 画完一根管 → 自动回到 Select

**实现方案：**

```typescript
enum ToolState {
  IDLE = 'idle',
  DRAW = 'draw',
  SELECT = 'select'
}

let currentState = ToolState.IDLE;

// 状态转换
function setState(newState: ToolState) {
  currentState = newState;
  
  // 更新工具栏UI
  updateToolbarUI(newState);
  
  // 更新鼠标指针
  updateCursor(newState);
}

// 画线完成后
function onDrawingComplete() {
  // 自动切换到 Select 模式
  setState(ToolState.SELECT);
  currentTool = 'select';
}
```

**CPO 的洞察：**
> 不要让用户一直"悬在画笔模式里"。画完一根管，自动回到 Select。

**验收标准：**
- [ ] 画完一条线后，自动切换到 Select 工具
- [ ] 工具栏按钮状态同步更新

---

#### [ ] Task 7: Fixture 显示和放置

**目标：** 在节点上放置 WC、LAV、SINK 等标记

**实现方案：**

```typescript
interface Fixture {
  id: string;
  type: 'WC' | 'LAV' | 'SINK' | 'SHOWER' | 'FD';
  nodeId: string;
}

const fixtures = new Map<string, Fixture>();

// 放置 Fixture
function placFixture(type: string) {
  currentTool = 'fixture';
  selectedFixtureType = type;
}

function onCanvasClick_Fixture(e: MouseEvent) {
  const nearNode = findNearestNode(e.offsetX, e.offsetY);
  
  if (nearNode) {
    // 在这个节点上添加 fixture
    const fixture: Fixture = {
      id: generateId(),
      type: selectedFixtureType as any,
      nodeId: nearNode.id
    };
    
    fixtures.set(fixture.id, fixture);
    render();
  } else {
    // 提示用户
    showToast("Click on a node to place fixture");
  }
}

// 渲染 Fixture（简单文本标签）
function drawFixture(fixture: Fixture) {
  const node = state.nodes.get(fixture.nodeId);
  if (!node) return;
  
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 在节点旁边显示
  ctx.fillText(fixture.type, node.x + 20, node.y - 10);
}
```

**验收标准：**
- [ ] 点击 Fixture 按钮 → 选择类型（WC/LAV/SINK...）
- [ ] 点击节点 → 在节点旁显示文本标签
- [ ] 删除节点时，自动删除关联的 Fixture

---

#### [ ] Task 8: 管径标注显示

**目标：** 在线段上显示管径（如 "2"" ）

**实现方案：**

```typescript
// 渲染线段时，同时显示管径
function drawEdge(edge: Edge) {
  const fromNode = state.nodes.get(edge.fromNodeId)!;
  const toNode = state.nodes.get(edge.toNodeId)!;
  
  // 画线段
  ctx.beginPath();
  ctx.moveTo(fromNode.x, fromNode.y);
  ctx.lineTo(toNode.x, toNode.y);
  ctx.strokeStyle = edge.type === 'drain' ? '#60a5fa' : '#34d399';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 在中点显示管径
  const midX = (fromNode.x + toNode.x) / 2;
  const midY = (fromNode.y + toNode.y) / 2;
  
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.fillText(edge.diameter, midX, midY - 8);
}
```

**管径选择UI：**
```typescript
// 在工具栏，点击管径按钮时
function selectDiameter(diameter: string) {
  currentDiameter = diameter;
  
  // 高亮当前选择
  highlightButton(`diameter-${diameter}`);
}

// 画新线时，使用当前选中的管径
function createEdge(from: Node, to: Node, type: string) {
  const edge: Edge = {
    id: generateId(),
    fromNodeId: from.id,
    toNodeId: to.id,
    type: type as any,
    diameter: currentDiameter, // 使用当前选择
    direction: calculateDirection(from, to)
  };
  
  state.edges.set(edge.id, edge);
}
```

**验收标准：**
- [ ] 工具栏可以选择管径（1-1/2", 2", 3", 4"）
- [ ] 画出的线段在中点显示管径标注
- [ ] 选中线段后，可以修改管径

---

#### [ ] Task 9: 文本标签工具

**目标：** 可以在画布上添加自由文本

**实现方案：**

```typescript
interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

const textLabels = new Map<string, TextLabel>();

function onCanvasClick_Text(e: MouseEvent) {
  // 方案1：简单 prompt（MVP）
  const text = prompt("Enter label text:");
  
  if (text) {
    const label: TextLabel = {
      id: generateId(),
      x: e.offsetX,
      y: e.offsetY,
      text: text
    };
    
    textLabels.set(label.id, label);
    render();
  }
  
  // 方案2：更好的方式（后续优化）
  // 直接在画布上显示可编辑的文本框
}

function drawTextLabel(label: TextLabel) {
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText(label.text, label.x, label.y);
}
```

**验收标准：**
- [ ] 点击 Text 工具 → 点击画布 → 弹出输入框
- [ ] 输入的文本显示在画布上
- [ ] 可以选中和删除文本标签

---

#### [ ] Task 10: 视觉反馈（让人敢画下去）

**CPO 的观点：** 不是为了好看，是为了让人有安全感。

**必须有的4个反馈：**

```typescript
// 1. Hover 节点 → 放大
function onMouseMove(e: MouseEvent) {
  const nearNode = findNearestNode(e.offsetX, e.offsetY);
  
  if (nearNode !== hoveredNode) {
    hoveredNode = nearNode;
    render();
  }
}

function drawNode(node: Node) {
  const isHovered = (hoveredNode?.id === node.id);
  const isSelected = state.selectedNodes.has(node.id);
  
  const radius = isHovered ? 6 : (isSelected ? 5 : 4);
  const color = isSelected ? 'yellow' : (isHovered ? 'white' : 'gray');
  
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// 2. Snap 可用 → 高亮
function drawSnapIndicator(node: Node) {
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // 绿色
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  
  ctx.beginPath();
  ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

// 3. Selected → 颜色变化
function drawEdge(edge: Edge) {
  const isSelected = state.selectedEdges.has(edge.id);
  
  ctx.lineWidth = isSelected ? 4 : 3;
  ctx.strokeStyle = isSelected 
    ? '#fbbf24' // 黄色高亮
    : (edge.type === 'drain' ? '#60a5fa' : '#34d399');
  
  // ... 画线
}

// 4. 当前方向 → 虚线预览
// 已在 Task 3 中实现
```

**验收标准：**
- [ ] 鼠标悬停节点时，节点变大
- [ ] 可捕捉节点显示绿色圆圈
- [ ] 选中的对象高亮显示（黄色）
- [ ] 画线时显示虚线预览

---

### 🟢 P2 - 可以后续优化

#### [ ] Task 11: Undo/Redo（结构级）

**CPO 的要求：** Undo 的对象是"管路动作级"，不是像素级

**实现方案：**

```typescript
// 历史记录
interface HistoryAction {
  type: 'create-edge' | 'delete-edge' | 'move-node' | 'delete-node' | 'create-fixture';
  data: any;
  timestamp: number;
}

const history: HistoryAction[] = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

// 添加到历史
function addToHistory(action: Omit<HistoryAction, 'timestamp'>) {
  // 删除 historyIndex 之后的所有记录
  history.splice(historyIndex + 1);
  
  // 添加新动作
  history.push({
    ...action,
    timestamp: Date.now()
  });
  
  // 限制历史长度
  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
}

// Undo
function undo() {
  if (historyIndex < 0) return;
  
  const action = history[historyIndex];
  
  switch (action.type) {
    case 'create-edge':
      // 删除这条边
      state.edges.delete(action.data.edgeId);
      break;
      
    case 'delete-edge':
      // 恢复这条边
      state.edges.set(action.data.edgeId, action.data.edge);
      break;
      
    case 'move-node':
      // 恢复节点位置
      const node = state.nodes.get(action.data.nodeId);
      if (node) {
        node.x = action.data.oldX;
        node.y = action.data.oldY;
      }
      break;
    
    // ... 其他类型
  }
  
  historyIndex--;
  render();
}

// Redo
function redo() {
  if (historyIndex >= history.length - 1) return;
  
  historyIndex++;
  const action = history[historyIndex];
  
  // 重新执行动作（与 undo 相反）
  // ... 实现逻辑
  
  render();
}
```

**验收标准：**
- [ ] Undo 可以撤销：画线、删除、移动
- [ ] 至少支持 20 步
- [ ] Redo 可以恢复被撤销的操作

---

#### [ ] Task 12: 工具状态反馈

**实现方案：**

```css
/* 激活工具高亮 */
.tool-button {
  background: #374151;
  border: 2px solid transparent;
  padding: 8px 12px;
  cursor: pointer;
}

.tool-button.active {
  background: #2563eb;
  border-color: #60a5fa;
}

.tool-button:hover {
  background: #4b5563;
}
```

```typescript
// 更新鼠标指针
function updateCursor(tool: string) {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  
  switch (tool) {
    case 'drain':
    case 'vent':
      canvas.style.cursor = 'crosshair';
      break;
    
    case 'select':
      canvas.style.cursor = 'default';
      break;
    
    case 'text':
      canvas.style.cursor = 'text';
      break;
    
    case 'fixture':
      canvas.style.cursor = 'pointer';
      break;
  }
}
```

**验收标准：**
- [ ] 当前激活的工具按钮高亮
- [ ] 鼠标指针随工具变化
- [ ] 视觉上清楚知道当前模式

---

#### [ ] Task 13: Grid 视觉提示

**目标：** 画出淡淡的 isometric grid

**实现方案：**

```typescript
function drawGrid() {
  const gridSize = 20; // 20px 间距
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  
  // 竖直线
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // 45° 线（可选，更复杂）
  // ...
}

// 在 render() 的最开始调用
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawGrid(); // 先画 grid
  
  // 然后画其他对象
  // ...
}
```

**验收标准：**
- [ ] 背景有淡淡的网格线
- [ ] 不影响主要内容的可见性
- [ ] 帮助对齐

---

#### [ ] Task 14: 键盘快捷键

**实现方案：**

```typescript
document.addEventListener('keydown', (e) => {
  // 忽略输入框内的按键
  if (e.target instanceof HTMLInputElement) return;
  
  switch (e.key.toLowerCase()) {
    case 'd':
      selectTool('drain');
      break;
    
    case 'v':
      selectTool('vent');
      break;
    
    case 's':
      selectTool('select');
      break;
    
    case 'f':
      selectTool('fixture');
      break;
    
    case 't':
      selectTool('text');
      break;
    
    case 'delete':
    case 'backspace':
      deleteSelected();
      break;
    
    case 'z':
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      break;
    
    case 'a':
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        selectAll();
      }
      break;
    
    case 'escape':
      clearSelection();
      currentTool = 'select';
      break;
  }
});
```

**验收标准：**
- [ ] D = Drain, V = Vent, S = Select
- [ ] Delete = 删除选中
- [ ] Cmd/Ctrl + Z = Undo
- [ ] Cmd/Ctrl + Shift + Z = Redo

---

## ✅ 完整的验收 Checklist

### P0 验收（本周必过）

**节点系统：**
- [ ] 线段必须引用真实的 Node（不能只是坐标）
- [ ] 一个 Node 可以连接多条 Edge
- [ ] 删除 Node 时，自动删除所有连接的 Edge

**节点捕捉：**
- [ ] 鼠标靠近节点（15px内）时，节点变大或高亮
- [ ] 显示"捕捉圈"（绿色圆圈）
- [ ] 松开鼠标时，线段确实连接到该节点
- [ ] 可以从一个节点的终点画出第二条线

**方向锁定：**
- [ ] 画线时，只能画出3种方向（vertical, left-down, right-down）
- [ ] 其他角度会自动修正
- [ ] 拖动时有虚线预览

**框选功能：**
- [ ] 在空白区域拖拽，出现虚线矩形框
- [ ] 框中的节点和线段自动选中
- [ ] 按 Delete 可以删除所有选中的对象

**节点拖动：**
- [ ] 点击节点可以拖动
- [ ] 拖动节点时，所有连接的线段跟着移动
- [ ] 松开后，连接关系保持不变

---

### P1 验收（下周完成）

- [ ] 画完一条线后，自动切换到 Select 工具
- [ ] 可以在节点上放置 Fixture（显示文本标签）
- [ ] 线段上显示管径标注
- [ ] 可以添加文本标签
- [ ] 工具按钮有高亮状态
- [ ] 鼠标指针随工具变化

---

## ⏱️ 时间估算

| 阶段 | 任务 | 工作量 | 截止 |
|------|------|--------|------|
| P0 Week 1 | Task 1-5 | 3天 | 本周五 |
| P1 Week 2 | Task 6-10 | 2.5天 | 下周三 |
| P2 Later | Task 11-14 | 按需 | - |

**总计：5.5天完成可用 MVP**

---

## 💬 给 CTO 的一段话（可直接使用）

> "现在这个版本已经能画线了，但还不能算 plumbing isometric。
> 
> 对我们来说，最低可用标准是：
> 1. 线段必须通过节点真正连接
> 2. 有 select + 框选 + move
> 3. 强制三方向吸附
> 4. Undo 是结构级的
> 
> 不需要加新功能，把这几件事补齐，就已经是可用 MVP。
> 
> 这些改进大概需要 3 天（P0）+ 2.5 天（P1）= 5.5 天。
> 
> 完成后，我们就有一个管工会愿意掏钱的工具了。"

---

## 📎 参考资源

**技术参考：**
- Konva.js 文档（如果使用）
- Canvas API 文档

**产品参考：**
- 想象自己是管工，画一套 WC + lav 系统
- 关键是"画完还能改"

---

**版本：** v1.1  
**创建时间：** 2026-02-02  
**优先级：** 🔴 Critical  
**执行周期：** Sprint 2 (1周)  

---

**CTO，这份文档是可以直接按照执行的。每完成一个 Task，勾选 [ ]，就能看到进度。加油！** 💪
