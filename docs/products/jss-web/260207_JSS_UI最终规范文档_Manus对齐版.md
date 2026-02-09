# JSS UI最终规范文档（Manus对齐版）

> **文档类型：** UI规范冻结 + CTO执行指令  
> **产品：** JobSite Snap (JSS)  
> **状态：** ✅ 已确认，不再讨论，只执行  
> **创建时间：** 2026-02-07  
> **优先级：** 🔥 P0 - 立即执行

---

## 📋 执行摘要

### CEO的最终决策

```
保留Manus这套"外观与信息架构"（清爽、专业）
但把相机链路恢复成JSS宪法：Non-blocking Capture

UI对齐（含图标）照Manus长相
但实现必须换成可控的dumb components
```

---

### 两个关键确认

**1. Brand主色：**
```
rgb(245, 158, 11)
这是唯一权威的橙色
```

**2. Profile/Account结构：**
```
❌ 不单独展示Profile/Account
✅ 全部放入Settings页面
```

---

## 🎨 Brand颜色规范（冻结）

### 主色定义

```
Orange: rgb(245, 158, 11)
```

**CSS/Tailwind等效：**
```css
/* CSS */
color: rgb(245, 158, 11);
background-color: rgb(245, 158, 11);

/* Tailwind (如果用) */
bg-amber-500
text-amber-500
```

---

### 用途（唯一）

```
✓ Primary Button
✓ Active Tab
✓ Active Sidebar Item
✓ Camera主按钮
```

**禁止：**
```
❌ 禁止再引入第二套橙色
❌ 避免UI颜色漂移
```

---

## 📱 Mobile UI规范（冻结）

### Bottom Tab Bar结构

```
[ Jobs ]    [  CAMERA  ]    [ More ]
```

**布局：**
- 左：Jobs
- 中：Camera（浮动大按钮）
- 右：More

---

### 视觉规格（必须对齐）

**整体：**
```
底栏高度：76px
背景：白色（或系统默认）
```

**中间Camera按钮：**
```
直径：64px
颜色：rgb(245, 158, 11)
白色描边（ring）：4px
上浮距离：-24px（负值，向上浮出底栏）
图标：Camera（白色）
```

**左右Tab（Jobs/More）：**
```
选中态：
  图标颜色：rgb(245, 158, 11)
  文案颜色：rgb(245, 158, 11)

未选中态：
  图标颜色：灰色（系统灰）
  文案颜色：灰色（系统灰）
```

---

### 行为规则（产品宪法）

**Jobs Tab：**
```
点击 → 进入Jobs列表页
```

**Camera Tab：**
```
点击 → 直接进入相机页面
❌ 不弹modal
❌ 不确认
❌ 不选择Job
```

**More Tab：**
```
点击 → 打开bottom sheet

Bottom Sheet内容（仅此三项）：
1. Photo Organizer
2. Settings
3. Logout

❌ 不展示用户信息（头像/名字）
```

---

## 🖥 Desktop UI规范（冻结）

### 左侧Sidebar结构

**菜单顺序（不可改）：**

```
1. Jobs
2. Camera
3. Photo Organizer
4. Settings
```

---

### 视觉规格（必须对齐Manus）

**Sidebar整体：**
```
宽度：约240px
背景：白色（或浅灰）
```

**Menu Item：**
```
高度：44-48px
Icon大小：20-22px
间距：适中（参考Manus截图）
```

**Active Item（当前选中）：**
```
背景色：rgb(245, 158, 11)
Icon颜色：白色
Text颜色：白色
圆角：适中（参考Manus）
```

**Inactive Item（未选中）：**
```
背景色：透明
Icon颜色：深灰
Text颜色：深灰
```

---

### 底部用户信息

**显示内容：**
```
✓ 用户头像（首字母圆形）
✓ 用户名字
✓ 角色标签（如：Admin）
```

**不显示：**
```
❌ Logout按钮（放在Settings里）
```

---

## 🎯 图标对齐表（冻结）

### 必须使用的图标语义

| 功能 | 图标名称 | 推荐来源 |
|------|---------|----------|
| Jobs | `Folder` | lucide-react |
| Camera | `Camera` | lucide-react |
| Photo Organizer | `Sparkles` | lucide-react |
| Settings | `Settings` | lucide-react |
| More | `MoreHorizontal` | lucide-react |
| Logout | `LogOut` | lucide-react |

---

### 使用规则

```
✓ Icon集合不强制（lucide/hero/自家都行）
✓ 但语义必须一致
✓ 大小必须统一（Mobile: 24px, Desktop: 20-22px）
```

**代码示例（lucide-react）：**

```tsx
import { 
  Folder, 
  Camera, 
  Sparkles, 
  Settings, 
  MoreHorizontal,
  LogOut 
} from 'lucide-react'

// Mobile Bottom Tab
<Camera size={28} color="white" />

// Desktop Sidebar
<Folder size={20} />
```

---

## 👤 Account/Profile结构（冻结）

### 最终决策

```
❌ 不单独展示Profile/Account
✅ 全部放入Settings页面
```

---

### 导航中只出现Settings

**Mobile：**
```
More底部sheet中：
1. Photo Organizer
2. Settings  ← 点击进入Settings页面
3. Logout
```

**Desktop：**
```
Sidebar中：
1. Jobs
2. Camera
3. Photo Organizer
4. Settings  ← 点击进入Settings页面
```

---

### Settings页面内包含

```
Settings页面内容：

1. Profile（个人资料）
   - 头像
   - 名字
   - 邮箱
   - 等

2. Account（账号设置）
   - 密码
   - 安全
   - 等

3. Logout（退出登录）
```

**为什么这样：**
```
✓ 减少导航层级噪音
✓ 避免"工具像SaaS而不像工地工具"
✓ 更专业、更清爽
```

---

## 📸 Camera页面（产品宪法级）

### ❌ 彻底禁止的旧模式

**你现在截图里的（错误）：**

```
❌ Select Job（下拉选择）
❌ 黑框预览区
❌ Start Camera按钮
❌ 拍前必须选择Job
❌ 拍一张 → 等待 → 再拍
```

**为什么错误：**
```
让工地用户觉得：
还没拍照就已经在填表

违背JSS核心理念：Snap First
```

---

### ✅ 正确模式（必须实现）

**进入Camera页面立即看到：**

```
✓ 全屏取景器（直接进入）
✓ 顶部：小的Job chip/下拉（可改Job）
✓ 底部：大快门按钮
✓ 右下角：缩略图（进入回放）
```

---

### 关键行为（Non-blocking Capture）

**1. 启动相机：**
```
用户点击Camera Tab
→ 直接进入取景器
→ 不管有没有选Job
→ 不弹任何确认
```

**2. 拍照流程：**
```
用户按快门
→ 立刻拍照
→ 照片进入队列
→ 立刻回到取景器
→ 可以连续拍下一张

❌ 不弹confirm
❌ 不跳页
❌ 不等待上传
```

**3. Job选择：**
```
顶部有Job下拉
→ 但不阻塞拍照
→ 没选Job也能拍
→ 照片进入"Unassigned"队列
→ 可以稍后分配
```

**4. 回放：**
```
右下角缩略图
→ 点击进入回放模式
→ 可以浏览刚拍的照片
→ 可以删除
→ 不影响继续拍照
```

---

### 产品哲学（必须理解）

```
Job是metadata（元数据）
不是拍照门槛

工地现场：
- 紧急情况要先拍
- 回头再整理归档
- 不能让选Job阻塞拍照
```

---

## 🧠 CTO执行指令（最终版）

### UI规范已确认，请严格对齐

---

### 1. Brand Color（唯一主色）

```
rgb(245, 158, 11)

用于：
- Primary Button
- Active Tab/Sidebar
- Camera按钮

禁止其他橙色
```

---

### 2. Mobile实现

**Bottom Tab Bar：**
```
✓ Jobs / Camera / More
✓ Camera为中间浮动圆按钮
  - 直径64px
  - ring 4px
  - 上浮24px
  - 颜色rgb(245, 158, 11)
✓ More打开bottom sheet
  - 仅含：Photo Organizer / Settings / Logout
```

---

### 3. Desktop实现

**Left Sidebar：**
```
✓ Jobs / Camera / Photo Organizer / Settings
✓ Active item橙色实底（rgb(245, 158, 11)）
✓ Profile/Account全部在Settings页面
✓ 底部显示用户信息（头像+名字+角色）
```

---

### 4. Camera页面（最关键）

**必须实现：**
```
✓ 默认全屏取景器
✓ 不允许拍前确认
✓ 不允许拍后confirm
✓ 实现Non-blocking capture
  - capture → enqueue → return
✓ UI必须为dumb components
  - 不得侵入camera/domain/queue
```

---

### 5. 图标对齐

```
✓ Folder / Camera / Sparkles / Settings / MoreHorizontal / LogOut
✓ 语义一致即可（不强制icon库）
```

---

## 📋 UI验收清单（逐条打勾）

### Mobile验收

```
☐ Bottom Tab Bar高度76px
☐ Camera按钮直径64px，橙色，白色ring 4px
☐ Camera按钮上浮24px
☐ Active Tab颜色rgb(245, 158, 11)
☐ More打开bottom sheet（不是跳页）
☐ Bottom sheet仅含3项（Photo Organizer/Settings/Logout）
☐ 点击Camera直接进入取景器（不弹modal）
```

---

### Desktop验收

```
☐ Sidebar宽度约240px
☐ Active Item背景色rgb(245, 158, 11)
☐ Active Item文字和图标白色
☐ 菜单顺序：Jobs/Camera/Photo Organizer/Settings
☐ 底部显示用户信息（头像+名字+角色）
☐ Logout不在Sidebar（在Settings页面内）
```

---

### Camera页面验收

```
☐ 进入即全屏取景器（不是表单页）
☐ 顶部有Job chip/下拉（但不阻塞拍照）
☐ 底部大快门按钮
☐ 右下角缩略图（进入回放）
☐ 按快门立刻拍照（不弹确认）
☐ 拍照后立刻回到取景器（不跳页）
☐ 没选Job也能拍（照片进Unassigned）
☐ 可以连续拍照（不等待）
```

---

### 图标验收

```
☐ Jobs用Folder图标
☐ Camera用Camera图标
☐ Photo Organizer用Sparkles图标
☐ Settings用Settings图标
☐ More用MoreHorizontal图标
☐ Logout用LogOut图标
☐ 所有图标大小统一
```

---

### 颜色验收

```
☐ Primary按钮颜色rgb(245, 158, 11)
☐ Active Tab颜色rgb(245, 158, 11)
☐ Active Sidebar Item背景rgb(245, 158, 11)
☐ Camera按钮颜色rgb(245, 158, 11)
☐ 没有其他橙色变体
```

---

## 🎯 下一步可选项

### CPO可以继续帮你做的（选一个）

**1️⃣ Camera页面结构示意**
```
专门针对Camera页面
画一份"正确结构示意"
工程视角，不是设计稿
```

**2️⃣ Settings页面架构**
```
Profile / Account / Logout
怎么放最干净
信息架构图
```

**3️⃣ 完整验收流程**
```
把验收清单扩展成
完整的测试case
每一条都有验收标准
```

---

## 💬 CPO最后的话

### 给CEO

```
你现在的判断已经非常"产品级"了

保留Manus的清爽专业
但恢复JSS的产品灵魂（Non-blocking Capture）

这套规范一旦落地
JSS的气质就稳了
```

---

### 给CTO

```
这不是"参考设计"
这是"执行规范"

UI外观照Manus
但实现必须是dumb UI
不得侵入camera/domain

照着做，不要猜
有问题对照这份文档
```

---

### 关键原则（写在墙上）

```
UI可以对齐Manus（清爽、专业）
但产品逻辑必须是JSS（Non-blocking、Snap First）

外观是术
逻辑是道
```

---

## 📊 实现优先级

### Week 1（本周）

```
✓ Brand Color统一（rgb(245, 158, 11)）
✓ Mobile Bottom Tab结构
✓ Desktop Sidebar结构
✓ 图标对齐
```

---

### Week 2（下周）

```
✓ Camera页面正确实现
✓ Non-blocking Capture
✓ Settings页面架构
```

---

### Week 3（验收）

```
✓ 逐条验收清单
✓ Mobile适配
✓ Desktop适配
```

---

**文档版本：** v1.0  
**创建人：** CPO（基于CEO/Manus讨论）  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 立即生效  
**状态：** ✅ 已冻结，不再讨论，只执行

---

**外观对齐Manus，灵魂坚守JSS！** 🎯
