# JSS UI设计与Dashboard替换执行文档（CTO版）

> **文档类型：** UI规格 + 文件重构清单  
> **关联文档：** 260207_SnapEvidence相机模块技术规格_CTO执行版.md  
> **创建时间：** 2026-02-07  
> **优先级：** 🔴 P0 - 立即执行  
> **执行人：** CTO + 前端团队

---

## 📋 执行摘要（30秒版）

**核心决策：**
1. ✅ 登录后首屏 = Projects（不是Dashboard）
2. ✅ 必须先选Project才能拍照（防止归属错误）
3. ✅ 现有Timecard风格Dashboard完全替换
4. ✅ A-D四个模块的完整UI规格已定版

**文件改动：**
- 修改：1个文件（dashboard redirect）
- 新增：5个文件（Projects页面）
- 迁移：1个文件（旧dashboard → template）

**时间线：** 2-3天完成所有UI重构

---

## 🎯 核心产品决策：为什么不能"先拍照再选Project"

### CEO最初提问：
> "用户登录后的第一个画面是不是应该是projects，然后进去再点击拍照按钮。或者直接一个按钮，然后再选择project？"

### CPO最终判断：✅ 必须是Projects → 进入 → 拍照

---

### 三个关键理由

#### 1️⃣ Phase 1的红线：Job归属不出错

**如果流程是"先拍照，再选Project"：**
```
打开App → 拍照 → 选Project（容易选错）

风险：
- 拍完一串照片
- 手滑选错Project
- 或临时发现"这个Project还没建"

👉 这是"事实污染"的高发区
```

---

#### 2️⃣ 法律/证据语义：先有Job再有Photo

**正确的心理模型：**
```
"我现在在这个工地/这个Job
我要为它留下证据"

❌ 不是：
"我先拍点东西，回头再想放哪"
```

**SnapEvidence是存证相机，不是普通相机App**

---

#### 3️⃣ 对离线/补传极其友好

**如果Project是先确定的：**
```
✅ 本地队列直接带project_id
✅ 不需要"补选Project"的UI
✅ 离线拍照归属100%正确
```

---

## 🎨 UI流程定版（三页极简）

### 页面1：登录后首页 = Projects

**目标：** 让用户1秒内进入正确的Project

```
┌─────────────────────────────────┐
│ Jobsite Snap      [User Avatar] │
├─────────────────────────────────┤
│                                 │
│ Projects                        │
│                                 │
│ [ + New Project ]  ← 橙色Primary│
│                                 │
│ • 5862 Cambie St                │
│   Last photo: 10 mins ago       │
│                                 │
│ • Kingsway Reno                 │
│   Last photo: Yesterday         │
│                                 │
│ • Office TI – Burnaby           │
│   Last photo: 3 days ago        │
│                                 │
└─────────────────────────────────┘
```

**交互规则：**
- 点击Project行 → 进入Project Detail
- 点击 + New Project → 打开创建modal

**空状态：**
```
No projects yet
[ + Create your first project ]
```

---

### 页面2：New Project（极简）

**设计原则：** 这是"不得不做但必须极快"的步骤

```
┌─────────────────────────────────┐
│ New Project                     │
├─────────────────────────────────┤
│                                 │
│ Project Name *                  │
│ ┌─────────────────────────────┐ │
│ │ e.g. 5862 Cambie St         │ │
│ └─────────────────────────────┘ │
│                                 │
│ [ Create Project ]  ← 橙色      │
│ [ Cancel ]                      │
│                                 │
└─────────────────────────────────┘
```

**Phase 1明确不做：**
- ❌ 地址
- ❌ 客户
- ❌ 项目描述
- ❌ 类型/标签

**创建后：** 直接进入Project Detail页面

---

### 页面3：Project Detail（整个App的"心脏"）

**页面目的：** 只做一件事——拍照

```
┌─────────────────────────────────┐
│ ← Projects    5862 Cambie St    │
├─────────────────────────────────┤
│                                 │
│ [ 📸 Take Photos ]  ← 全宽橙色  │
│                                 │
│ Recent Photos                   │
│ ┌──┐┌──┐┌──┐┌──┐                │
│ │  ││  ││  ││  │                │
│ └──┘└──┘└──┘└──┘                │
│ ┌──┐┌──┐┌──┐┌──┐                │
│ │  ││  ││  ││  │                │
│ └──┘└──┘└──┘└──┘                │
│                                 │
└─────────────────────────────────┘
```

**空状态：**
```
No photos yet
Start taking photos to document this job
```

**拍照按钮规则（宪法级）：**
- ✅ 只有在Project Detail才能拍照
- ✅ 点击即进入SnapEvidence Camera
- ✅ 拍照过程不允许切Project
- ✅ 所有照片自动绑定当前Project

---

## 📸 A. SnapEvidence Camera UI规格

### 相机界面结构

```
┌─────────────────────────────────┐
│ ← Back   Project: 5862 Cambie St│
├─────────────────────────────────┤
│                                 │
│                                 │
│      ( Camera Preview )         │
│                                 │
│                                 │
├─────────────────────────────────┤
│            [ ● ]                │  ← 快门（橙色）
│                                 │
│         Saved locally     🟡    │  ← 状态提示
└─────────────────────────────────┘
```

---

### 快门按钮规格

**外观：**
- 圆形
- 橙色边框
- 中心白色实心
- 直径 ≥ 64px

**行为（Phase 1）：**
- ✅ 点击一次 = 拍一张
- ✅ 可以快速连点
- ❌ 不做"按住连拍"（Phase 2）

**技术要求：**
```javascript
onClick只做一件事：
capture → 写IndexedDB

绝不await上传
UI不等待任何async
```

---

### 连拍手感

**用户行为：**
```
tap tap tap tap（快速连续点击）
```

**UI反馈（轻到刚刚好）：**
- 每拍一张：快门有极短的视觉闪烁
- ❌ 不弹toast
- ❌ 不遮挡取景框

**判断标准：**
> "我点了，它就拍了"

---

### 状态提示（右下角）

**位置：** 右下角小区域，永远不挡取景框

**三种状态（只这三种）：**

#### 🟡 Pending（本地）
```
Saved locally
```
- 刚拍完
- 写入IndexedDB成功
- 离线也显示

---

#### 🔵 Uploading（后台）
```
Uploading…
```
- 后台worker在跑
- ❌ 不显示进度条（Phase 1不需要）

---

#### 🟢 Uploaded（完成）
```
Uploaded ✓
```
- 成功sync到R2 + DB

---

#### 🔴 Upload failed（失败）
```
Upload failed · Will retry
```

**规则：**
- ❌ 不弹alert
- ❌ 不block拍照
- ✅ 后台自动retry
- ✅ Project Detail里可看到失败标记

---

### Phase 1明确不做

```
❌ 不显示每张的上传进度%
❌ 不显示网络状态
❌ 不做拍照计数器
❌ 不做失败弹窗
❌ 不做"拍照完成页"
```

---

### 硬性指令（给CTO）

```
Camera快门只负责：capture + local save
上传永远在后台
UI只反映状态，不等待状态
允许无限连拍，不锁UI
```

---

## 🖼 B. Project Detail · Photos区域规格

### 单张照片卡片

**基本结构：**
```
┌───────────┐
│           │
│ thumbnail │
│           │
│        ⏳ │  ← 状态角标（右下角）
└───────────┘
```

**规格：**
- 固定1:1尺寸
- ❌ 不显示文件名
- ❌ 不显示时间（Phase 1不需要）

---

### 状态角标（右下角）

#### 🟡 Pending（本地已存）
```
角标：⏳
```
- 本地IndexedDB已成功
- 离线时大量出现是正常的
- **这是"没丢"的最重要信号**

---

#### 🔵 Uploading（后台上传中）
```
角标：🔄
```
- ❌ 不显示百分比
- ❌ 不显示剩余时间
- ✅ 只告诉用户：在处理

---

#### 🟢 Uploaded（完成）
```
角标：✓（绿色小勾）
```
- 这是最终状态

---

#### 🔴 Failed（失败，可恢复）
```
角标：!（红色感叹号）
```
- 不闪、不抖、不弹窗

---

### 点击行为

**点击正常照片（pending/uploading/uploaded）：**
```
👉 打开全屏预览（只看，不编辑）

┌─────────────────────────────────┐
│ ← Back                          │
├─────────────────────────────────┤
│                                 │
│      ( Full Image )             │
│                                 │
│ Status: Uploading…              │
└─────────────────────────────────┘
```

**规则：**
- 顶部仍显示Project Name
- ❌ 不允许删除（Phase 1）
- ❌ 不允许移动Project（Phase 1）

---

**点击Failed照片：**
```
👉 弹出bottom sheet

┌─────────────────────────────────┐
│ Upload failed                   │
│                                 │
│ [ Retry upload ]                │
│ [ Cancel ]                      │
└─────────────────────────────────┘
```

**规则：**
- Retry = 重新入队
- ❌ 不提示技术原因
- ❌ 不跳页面

---

### 批量状态提示（顶部轻提示）

**在Photos区域顶部显示一行轻提示：**

**离线时：**
```
Some photos are saved locally and will upload when online
```

**有失败时：**
```
Some photos failed to upload
```

**规则：**
- 只显示一行
- ❌ 不用红色大字
- ❌ 不block操作

---

### Phase 1禁止的操作

```
❌ 删除照片
❌ 批量选择
❌ 拖拽排序
❌ 编辑/标注
❌ 下载
❌ 分享链接

Phase 1的Photos = 只读证据
```

---

### 状态机映射（给CTO）

```javascript
LOCAL_ONLY   → ⏳
UPLOADING    → 🔄
SYNCED       → ✓
FAILED       → !

// UI永远只读状态，不驱动状态
```

---

## 🌐 C. 离线/在线切换UI提示策略

### 核心原则

```
✅ 绝不弹窗
✅ 绝不阻塞拍照
✅ 只在"需要解释的时刻"提示
✅ 文案永远站在用户视角，不讲技术
```

---

### Camera页面提示

#### 离线时（进入Camera或网络刚断）

**右下角状态区显示：**
```
Offline · Saving locally
```

**规则：**
- 常驻一行（不闪）
- ❌ 不需要toast
- ✅ 用户继续连拍即可

---

#### 网络恢复时（从离线变在线）

**显示短暂toast（1.5-2s）：**
```
Back online · Uploading in background
```

**规则：**
- 只出现一次
- 不影响取景框
- ❌ 不显示进度%

---

#### 正在大量补传时（可选）

**仍然只显示一行状态：**
```
Uploading…
```

**不要写"Uploading 27 photos"** —— Phase 1不需要

---

### Project Detail页面提示

#### 顶部"轻提示条"（重要）

**显示位置：** Take Photos按钮下面

**条件A：离线**
```
Offline · Photos will upload when you're online
```

**条件B：在线且存在待上传/上传中**
```
Uploading in background
```

**条件C：存在失败**
```
Some photos failed to upload · Tap to retry
```

---

**规则：**
- 同时满足多条件时，优先级：`Failed > Offline > Uploading`
- 提示条可点击（仅在Failed时跳到失败照片）

---

### Projects列表页提示

**Phase 1保持极简：**

**Header右侧一个小状态：**
- 在线：不显示
- 离线：显示"Offline"小字

❌ 不需要toast

---

### 网络切换事件的"去噪"规则

#### 去抖/节流
```
✅ 网络切换toast：10秒内最多一次
✅ 若网络反复抖动：只保留当前状态，不重复提示
```

#### 只在"状态改变"时提示
```
offline → online 才提示"Back online…"
online → offline 才提示"Offline…"
```

---

### 文案固定表（不要让团队自由发挥）

| 场景 | 文案 |
|------|------|
| **离线（Camera/Detail）** | `Offline · Saving locally`<br>`Offline · Photos will upload when you're online` |
| **Online恢复** | `Back online · Uploading in background` |
| **上传中（Detail）** | `Uploading in background` |
| **失败（Detail）** | `Some photos failed to upload · Tap to retry` |

---

### 实现提示（给CTO）

```javascript
// 用navigator.onLine + online/offline事件
// 用队列状态聚合出：
hasFailed
hasPendingOrUploading

// 渲染一个StatusBanner组件（Project Detail）
// Camera右下角复用一个StatusChip
```

---

## 🔄 D. 失败重试 & 后台节流规则

### 核心目标

```
✅ 失败一定能恢复
✅ 不无限重试
✅ 不抢占拍照性能
✅ 网络恢复时不"洪水式上传"
```

---

### 状态机（最终锁死）

```
LOCAL_ONLY
  → QUEUED
  → UPLOADING
  → SYNCED

UPLOADING
  → FAILED
```

**规则：**
- UI只读状态
- Worker唯一能改状态

---

### 重试策略（关键）

#### 每张照片的retry规则

```
最大重试次数：3次
超过3次 → 状态保持FAILED（不再自动）

retry_count: 0 | 1 | 2 | 3
```

---

#### 自动重试触发时机（只这3种）

```
✅ 网络从offline → online
✅ App cold start / reopen
✅ 用户点击Retry（手动）

🚫 禁止：
❌ 定时器死循环retry
❌ 每次失败立刻retry
```

---

### 重试间隔（指数退避）

```javascript
delay = 2^retry_count * 5s
```

| retry_count | delay |
|-------------|-------|
| 1 | 5s |
| 2 | 10s |
| 3 | 20s |

**Phase 1不需要更复杂，但必须有delay**

---

### 并发控制（防卡死的关键）

#### 全局上传并发上限

```javascript
MAX_CONCURRENT_UPLOADS = 2
```

**规则：**
- 不论Project
- 不论多少pending
- 永远最多2个上传中

---

#### 优先级规则

```
1. retry_count少的优先
2. 新拍的 > 老的
3. 同Project内按时间顺序

简单排序即可，不要写复杂调度器
```

---

### 网络恢复时的"防洪水"机制

#### ❌ 错误示范

```
online事件一触发
→ 100张pending一起upload
```

#### ✅ 正确做法

```
online事件触发
→ 只唤醒worker
→ worker按并发限制慢慢拉
```

---

### 用户手动Retry（UI → Worker唯一入口）

**点击"Retry upload"时：**

```javascript
if (retry_count < 3) {
  状态 → QUEUED
  retry_count +1
}

if (retry_count === 3) {
  保持FAILED
  UI文案改为：
  "Upload failed · Please contact support"
}
```

**Phase 1不需要真正contact support**  
但这是"诚实系统"的表现

---

### 本地数据不删除规则（重要）

#### ❌ 禁止：

```
上传成功立刻删本地
上传失败删本地
```

#### ✅ Phase 1正确策略：

```
SYNCED也保留本地
以后Phase 2再做GC（比如7天）
```

**理由：**
- 离线切换
- 刷新
- 浏览历史
- Debug

---

### 伪代码骨架（给CTO）

```javascript
function uploadWorker() {
  if (!online) return
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) return

  const next = pickNextQueuedItem()
  if (!next) return

  markUploading(next)

  upload(next)
    .then(() => markSynced(next))
    .catch(() => {
      incrementRetry(next)
      if (next.retry_count < 3) {
        scheduleRetry(next)
      } else {
        markFailed(next)
      }
    })
}
```

**触发点：**
- photo saved
- app resume
- network online
- user retry

---

### Phase 1明确不做

```
❌ 智能网络质量判断
❌ 区分WiFi / Cellular
❌ 后台上传进度条
❌ 后端主动push重试
```

---

## ✅ SnapEvidence Phase 1 · 工程实施清单

### A. Camera（按钮/连拍/即时反馈）

**UI/交互：**
- [ ] 顶部固定显示Project Name
- [ ] 单一快门按钮（橙色），支持快速连点
- [ ] 不做按住连拍
- [ ] 快门反馈：极短闪烁，不弹toast

**技术约束：**
- [ ] `capture()`只写本地（IndexedDB/OPFS）
- [ ] 不`await`上传
- [ ] 拍照过程不阻塞UI、不锁线程

**状态提示（右下角）：**
- [ ] Saved locally
- [ ] Uploading…
- [ ] Uploaded ✓
- [ ] Upload failed · Will retry
- [ ] 只显示最后一张的状态

---

### B. Project Detail · Photos区域

**列表：**
- [ ] 刚拍的照片立刻出现（即便未上传）
- [ ] 1:1缩略图，无文件名/时间

**角标状态（右下角）：**
- [ ] ⏳ LOCAL_ONLY
- [ ] 🔄 UPLOADING
- [ ] ✓ SYNCED
- [ ] ! FAILED

**点击行为：**
- [ ] 正常照片 → 只读全屏预览
- [ ] FAILED → bottom sheet：Retry upload
- [ ] 不支持删除/编辑/排序/分享

---

### C. Offline/Online UI提示（去噪）

**Camera：**
- [ ] 离线常驻：`Offline · Saving locally`
- [ ] 恢复在线toast（1.5-2s）：`Back online · Uploading in background`

**Project Detail顶部轻提示（优先级）：**
- [ ] Failed > Offline > Uploading
- [ ] 文案锁定

**去抖：**
- [ ] 网络切换toast 10秒内最多一次

---

### D. 后台上传·重试&节流（稳定性核心）

**状态机（锁死）：**
```
LOCAL_ONLY → QUEUED → UPLOADING → SYNCED
UPLOADING → FAILED
```

**并发&节流：**
- [ ] `MAX_CONCURRENT_UPLOADS = 2`
- [ ] 网络恢复仅唤醒worker，不洪水式上传

**重试规则：**
- [ ] `maxRetries = 3`
- [ ] 指数退避：5s / 10s / 20s
- [ ] 触发点仅限：online恢复、app reopen、用户手动Retry

**数据保留：**
- [ ] SYNCED也不删本地（Phase 1）
- [ ] 失败不自动无限重试

---

### 全局红线（必须遵守）

```
✅ 先选Project再拍照
✅ 拍照不等待上传
✅ 失败不静默
✅ Phase 1不做文档/设置/权限
```

---

### 验收（DoD）

- [ ] 离线连拍 ≥ 50张不卡
- [ ] 切在线后后台平稳补传（≤2并发）
- [ ] 任一失败可见、可手动重试
- [ ] 无"拍了但不知去向"的情况

---

## 🚨 Dashboard替换：为什么必须换

### 现状问题

**当前dashboard = Timecard/HR系统首页**

**显示的功能：**
- Clock In / Out
- Timecards
- Worker Management
- Upload Timecard
- Reports & Analytics

**这是另一个产品，不是Jobsite Snap**

---

### 为什么必须整体替换（不是微调）

#### 1️⃣ 功能方向完全错位

**现在页面暗示用户：**
- 考勤打卡
- 工人管理
- 报表分析

**JSS Phase 1的唯一使命：**
```
我在工地 → 我选项目 → 我拍照
```

**现在这个dashboard会让用户：**
- 犹豫：我该点哪个？
- 误解：这是考勤系统？
- 分心：我要不要先设置workers？

**👉 这是致命的首屏错误**

---

#### 2️⃣ 首屏没有"唯一行动"

**产品宪法：**
> 一个页面只有一个Primary Action

**而现在这个页面：**
- 6张卡
- 6个按钮
- 6个"看起来都重要的事"

**👉 工地用户 = 直接懵**

---

#### 3️⃣ 对SnapEvidence是"反助力"

**你花了大量精力设计A-D：**
- Camera/离线/状态/重试

**结果用户一登录先看到：**
- Reports & Analytics
- Worker Management

**完全浪费你前面做的所有正确决策**

---

## 📦 文件级改动清单（精确到路径）

### 当前repo结构

**JSS-Web Dashboard：**
```
apps/jss-web/app/dashboard/page.tsx
```
- 卡片直接写在page里
- 用的是`@slo/snap-auth/components/client`的Card组件
- 没有独立的dashboard组件目录

---

### 改动清单

#### A. 把/dashboard变成redirect

**修改文件：**
```
apps/jss-web/app/dashboard/page.tsx
```

**改动内容：**
```typescript
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/projects");
}
```

**这一步完成后：** 从根上"杀死"错误首屏

---

#### B. 把旧dashboard收编为template

**新增文件：**
```
apps/jss-web/app/_template/timecard-dashboard/page.tsx
```

**操作：**
1. 把现在`app/dashboard/page.tsx`里的Card UI原封不动复制过来
2. 页面顶部加模板水印

**示例结构：**
```typescript
export default function TimecardDashboardTemplatePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 rounded-md border bg-muted/30 p-3 text-sm">
        <b>Template:</b> Timecard Dashboard (Not used in JSS)
      </div>

      {/* paste the old dashboard JSX here */}
    </div>
  );
}
```

**路径用`/_template/...`的好处：**
- 明显"内部/模板"
- 不容易被当成正式功能

---

#### C. 新增Projects首屏（替代dashboard）

**新增文件（1）：**
```
apps/jss-web/app/projects/page.tsx
```

**功能：**
- Projects list
- "+ New Project"唯一主按钮（活力橙）

---

**新增文件（2）：**
```
apps/jss-web/app/projects/new/page.tsx
```

**功能：**
- 只要Project Name
- 一个输入框 + Create按钮

---

**新增文件（3）：**
```
apps/jss-web/app/projects/[id]/page.tsx
```

**功能：**
- Project Detail
- 顶部显示project name
- 主按钮：📸 Take Photos

---

**新增文件（4）：**
```
apps/jss-web/app/projects/[id]/snap/page.tsx
```

**功能：**
- 先放placeholder
- 后面接SnapEvidence Camera

---

#### D. 导航/默认跳转对齐

**需要全局搜索并修改：**

```javascript
// 搜索关键词：
"/dashboard"
redirectTo
DEFAULT_REDIRECT
NEXT_PUBLIC_*_REDIRECT
callbackUrl
```

**改成：**
- 默认landing：`/projects`
- 把JSS的默认redirect改成`/projects`

---

### 最小验收

```
✅ 登录成功后直接到/projects
✅ 手动访问/dashboard → 301/302到/projects
✅ 旧dashboard可访问：/_template/timecard-dashboard
```

---

### LS/Corporate的dashboard怎么办？

**LS-Web：**
```
apps/ls-web/app/dashboard/page.tsx
apps/ls-web/app/dashboard/ml/page.tsx
apps/ls-web/app/components/dashboard/*
```

**👉 不动**  
LedgerSnap需要财务/监控类dashboard，这些是合理存在的

---

**SLG-Corporate：**
```
apps/slg-corporate/app/dashboard/page.tsx
apps/slg-corporate/app/admin/dashboard/page.tsx
```

**👉 也不动**  
这属于corporate/admin站点，和JSS Phase 1无关

---

## 🎨 完整JSX实现参考

### 1. Projects页面

```typescript
// apps/jss-web/app/projects/page.tsx

import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
  // TODO: 用你们现有的auth方式拿到user
  // TODO: 拉projects列表（按updated_at desc）
  
  const projects: Array<{
    id: string;
    name: string;
    lastPhotoAt?: string;
  }> = [];
  
  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">JobSite Snap</div>
          <div className="text-sm text-muted-foreground">
            SnapEvidence • Projects
          </div>
        </div>

        {/* 右上角：Avatar下拉（Profile / Sign out） */}
        <div className="text-sm text-muted-foreground">
          {/* TODO: Replace with your AvatarMenu */}
          <span>Account</span>
        </div>
      </div>

      {/* Title + primary CTA */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>

        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#FF7A00" }} // 活力橙
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Empty state */}
      {!hasProjects ? (
        <div className="mt-10 rounded-lg border bg-white p-10 text-center">
          <div className="text-lg font-semibold">No projects yet</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Create a project first, then start taking job site photos.
          </div>
          <div className="mt-6">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: "#FF7A00" }}
            >
              <Plus className="h-4 w-4" />
              Create your first project
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 divide-y rounded-lg border bg-white">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/40"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.lastPhotoAt 
                    ? `Last photo: ${p.lastPhotoAt}` 
                    : "No photos yet"}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">›</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 2. New Project页面

```typescript
// apps/jss-web/app/projects/new/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      // TODO: call your API to create project
      // const res = await fetch("/api/projects", {
      //   method:"POST",
      //   body: JSON.stringify({ name })
      // })
      // const { id } = await res.json()
      const id = "new_project_id";
      router.replace(`/projects/${id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold">New Project</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Project name only for Phase 1.
      </p>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <label className="text-sm font-medium">Project Name *</label>
        <input
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g. 5862 Cambie St"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={onCreate}
          disabled={!name.trim() || loading}
          className="mt-5 w-full rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#FF7A00" }}
        >
          {loading ? "Creating…" : "Create Project"}
        </button>
      </div>
    </div>
  );
}
```

---

### 3. Project Detail页面

```typescript
// apps/jss-web/app/projects/[id]/page.tsx

import Link from "next/link";

export default async function ProjectDetailPage({
  params
}: {
  params: { id: string }
}) {
  // TODO: load project + recent photos
  const project = { 
    id: params.id, 
    name: "5862 Cambie St" 
  };
  
  const photos: Array<{
    id: string;
    status: "local" | "uploading" | "synced" | "failed";
  }> = [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/projects" 
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Projects
        </Link>
        <div className="text-sm text-muted-foreground">Project</div>
      </div>

      <h1 className="text-2xl font-semibold">{project.name}</h1>

      <Link
        href={`/projects/${project.id}/snap`}
        className="mt-5 block w-full rounded-md px-4 py-3 text-center text-sm font-medium text-white"
        style={{ backgroundColor: "#FF7A00" }}
      >
        📸 Take Photos
      </Link>

      <div className="mt-8">
        <div className="mb-3 text-sm font-medium">Recent Photos</div>

        {photos.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-sm text-muted-foreground">
            No photos yet. Start taking photos to document this job.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {/* TODO: thumbnails + status badges */}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 4. SnapEvidence Camera（占位）

```typescript
// apps/jss-web/app/projects/[id]/snap/page.tsx

export default function SnapPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">SnapEvidence Camera</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming soon for Project: {params.id}
        </p>
      </div>
    </div>
  );
}
```

---

## 🎯 执行指令（一句话版）

### 给CTO的明确指令

```
JSS Phase 1不需要dashboard。
/dashboard改为redirect(/projects)。
把旧dashboard JSX搬到/_template/timecard-dashboard作为保留模板。
新增/projects、/projects/new、/projects/[id]、/projects/[id]/snap四个页面骨架。

LS-Web和SLG-Corporate的dashboard保持不动。
```

---

## 📊 验收标准（DoD）

### 路由验收

- [ ] 访问`/dashboard` → 自动跳转到`/projects`
- [ ] 登录成功后 → 直接到`/projects`
- [ ] `/_template/timecard-dashboard`可访问（但不在导航）

---

### 页面验收

- [ ] `/projects` - Projects列表显示正常
- [ ] `/projects/new` - 可创建新Project
- [ ] `/projects/[id]` - Project Detail显示正常
- [ ] `/projects/[id]/snap` - 占位页面显示正常

---

### UI验收

- [ ] 活力橙（#FF7A00）正确应用到主按钮
- [ ] 页面只有一个Primary Action
- [ ] 空状态文案正确
- [ ] 移动端适配（如果需要）

---

## 💬 CPO最后的话

### 这次改动的战略意义

**你不是在"删功能"**  
**你是在让产品第一次变得"像它应该成为的样子"**

**三个关键点：**

1. **先有Project，再有Photo** - 这是SnapEvidence的核心逻辑
2. **一个页面一个行动** - 工地用户不需要思考
3. **照片立刻可见** - 离线不丢的信任基础

---

### 给CTO的信心

**A-D四个模块合起来，已经是：**
> 一个"可以在真实工地跑一整天"的系统设计

**不是demo，不是概念，是能活的。**

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 2026-02-07  
**预计完成：** 2-3天

---

连拍不卡 · 离线不丢 · Job不错归 · 状态不骗人！🚀
