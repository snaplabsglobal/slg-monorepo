# JSS Dashboard与首次登录流程完整执行文档

> **文档类型：** 产品规格 + 产品宪法  
> **关联文档：** Self-Rescue Mode系列文档  
> **创建时间：** 2026-02-07  
> **优先级：** 🔥 P0 - 紧急修复（登录后空白问题）  
> **执行人：** CTO + 前端团队

---

## 🚨 问题现状（CEO反馈）

**CEO原话：**
> "CTO已经按文档执行了，但是login后什么都没看到。Self-Rescue Mode没看见。现在打开什么都没有。"

---

### CPO诊断

**从截图看到的问题：**

```
❌ 登录后是Jobs List裸页
❌ 没有"下一步引导"
❌ Rescue Mode被藏死
❌ Settings不知道放哪
```

**对第一次登录的contractor来说：**
```
"我已经登录了，但我不知道我该干嘛。"

这会直接导致：
- 0转化
- 0探索
- 0信任
```

---

### 根本原因

```
不是CTO做错了
而是产品层还没把页面串起来

CTO "按文档执行但看不到"，原因只有一个：

文档写的是"功能UI"
但产品缺的是"入口 + flow glue"
```

---

## 🎯 解决方案总览

### 一句话结论

```
JSS 必须有一个"工作台式Dashboard"
它不是炫功能，而是：
告诉用户「我现在能干什么」
```

### 正确的产品结构（Phase 1）

```
❌ 错误的想法：
   Jobs = Dashboard
   Settings = 次要
   功能靠用户自己点

✅ 正确的结构：
   Login
     ↓
   Dashboard（行动中心）
     ↓
   Rescue / New Job / Capture
```

---

## 📐 Dashboard设计规格

### Dashboard = 3个区块（顺序很重要）

---

### ① 顶部：Primary Action Card（必须）

**Self-Rescue Entry Card**

```
这是现在唯一应该占据注意力的东西
```

**文案：**
```
Title: Rescue your photo library

Body: 
Organize past photos by location & time.
Nothing changes unless you confirm.

CTA: 
[Start Self-Rescue]
[Learn how it works]
```

**📌 关键点：**
```
❗不放在Settings
❗不藏在二级菜单
❗这是"新用户第一锤"
```

---

### ② 中部：Jobs Snapshot（精简版）

**不是完整Jobs管理，而是：**

```
Your jobs
- 5862 Cambie St Vancouver · Active · 0 photos

[View all jobs]
```

**作用只有一个：**
```
告诉用户：Rescue之后，这些会变得有秩序
```

---

### ③ 底部：Secondary Actions（弱化）

**用小卡片或文字链接：**

```
➕ New Job
⚙️ Settings
❓ How JSS works
```

**注意：**
```
Settings现在必须降权
否则用户会一上来就去"找配置"
而不是"解决问题"
```

---

## 📄 Dashboard Wireframe（文字版）

### / Dashboard 页面结构（自上而下）

```
┌────────────────────────────────────┐
│ JobSite Snap                       │
│ Job Photos                         │
└────────────────────────────────────┘

[ PRIMARY ACTION ]
┌────────────────────────────────────┐
│ 🛟 Rescue your photo library        │
│ Organize past photos by location   │
│ and time.                          │
│ Nothing changes unless you confirm │
│                                    │
│ [ Start Self-Rescue ]              │
│ [ Learn how it works ]             │
└────────────────────────────────────┘

[ YOUR JOBS ]
┌────────────────────────────────────┐
│ Your jobs                          │
│ ┌───────────────────────────────┐ │
│ │ 5862 Cambie St Vancouver       │ │
│ │ Active · 0 photos              │ │
│ └───────────────────────────────┘ │
│                                   │
│ [ View all jobs ]   [ + New Job ] │
└────────────────────────────────────┘

[ SECONDARY ]
┌────────────────────────────────────┐
│ Settings · Help · About JSS         │
└────────────────────────────────────┘
```

---

### 关键原则（写在PRD里的）

```
✅ Rescue卡片必须永远在最上面
✅ Jobs只展示摘要
✅ Settings绝对不做成主入口
✅ Dashboard ≠ Jobs List
```

---

## 📝 Dashboard完整文案

### Primary Action Card（Self-Rescue）

**Title:**
```
Rescue your photo library
```

**Body:**
```
Organize past jobsite photos by location and time.
Nothing changes unless you confirm.
```

**Primary CTA:**
```
Start Self-Rescue
```

**Secondary CTA:**
```
Learn how it works
```

**Tooltip / Learn how 内容（极短）:**
```
Scan → Review → Confirm
Suggestions only. Undo available.
```

---

### Jobs Section

**Header:**
```
Your jobs
```

**Job Card Meta示例:**
```
Active · 0 photos
```

**Actions:**
```
View all jobs
New Job
```

**❗注意：**
```
这里不放说明文案
Jobs是熟悉概念，不需要解释
```

---

### Secondary Links（低权重）

```
Settings · Help · About JSS
```

**说明：**
```
Settings默认二级页
不在Dashboard强调
```

---

## 🗂️ 左侧导航结构（Phase 1正确版本）

### 推荐的Left Nav

```
🏠 Dashboard
📷 Capture
🛟 Self-Rescue
📁 Jobs
────────────
⚙️ Settings
❓ Help
```

---

### 各项说明（非常重要）

**🏠 Dashboard**
```
- 永远是landing
- 汇总 + 行动中心
```

**📷 Capture**
```
- Phase 1可以只是入口
- PWA相机/拍照页
- 这是"未来每天用"的入口
```

**🛟 Self-Rescue**
```
- 独立一级导航
- 不是Settings的子项
- 这是你们的"差异化王牌"
```

**📁 Jobs**
```
- 项目管理
- Rescue完成后，这里才会"变好看"
```

**⚙️ Settings**
```
- 账号/偏好/导出
- 默认不吸引注意力
```

---

### 明确禁止的结构 ❌

```
❌ Self-Rescue放在Settings里
❌ Login后直接进Jobs List
❌ Dashboard = 空白 + 列表
```

---

## 🚀 立即执行清单（3天）

### 今天：加Dashboard页面

```
☐ Route: /
☐ 放Rescue卡片
☐ 放Jobs Snapshot
☐ 放Secondary Links
```

---

### 明天：调整Left Nav

```
☐ Rescue升为一级
☐ Jobs降权
☐ Settings降权
```

---

### 后天：把login redirect改到 /

```
☐ 不再 /jobs
☐ 改为 /onboarding/check（见下节）
```

---

## 🎯 第一次登录30秒必走路径

### 目标一句话

```
用户第一次登录的30秒内，只需要回答一个问题：
「我要不要先把我自己的照片救回来？」
```

---

### 核心判断（这是整个flow的灵魂）

**在Login成功后，系统只做一个判断：**

```typescript
hasExistingPhotos = 
  deviceHasCameraRollPhotos ||
  userHasUploadedPhotosBefore ||
  !rescueCompleted
```

**Phase 1可以极度简化：**

```
Web/Desktop：默认true
Mobile/PWA：请求一次「读取相册metadata」权限 
           → 有照片就true
```

**原则：**
```
不要过度智能
宁愿多问一次，也不要错过Rescue
```

---

### 路径总览（文字流程图）

```
Login
  ↓
/onboarding/check
  ↓
[ hasExistingPhotos ? ]
        ↓ yes                         ↓ no
   Rescue Intro                  Empty Dashboard
        ↓
 Start Self-Rescue
        ↓
 Rescue Wizard
        ↓
 Confirm / Skip
        ↓
 Dashboard (正常态)
```

---

## 📄 每一步的页面规格

### Step 0 · Onboarding Check（逻辑页，无UI）

**Route:** `/onboarding/check`

**做3件事：**
1. 判断hasExistingPhotos
2. 判断rescueCompleted
3. redirect

**逻辑：**

```typescript
if (!rescueCompleted && hasExistingPhotos) {
  redirect("/onboarding/rescue-intro");
} else {
  redirect("/");
}
```

---

### Step 1 · Rescue Intro（30秒内最关键的一页）

**Route:** `/onboarding/rescue-intro`

**⚠️ 这不是marketing页**
```
是产品层的"解释权"
```

---

#### 页面结构（极简）

**Title:**
```
Before you start — want to rescue your photos?
```

**Body:**
```
Most contractors already have years of jobsite photos.
Self-Rescue helps you organize them by location and time — safely.
```

**Trust line（必须有）:**
```
Nothing changes unless you confirm.
```

**Actions（两个，只能两个）:**

```
Primary CTA（高亮）:
[Start Self-Rescue]

Secondary（弱化）:
[Skip for now]
```

**❗不要第三个按钮**
**❗不要"Learn more"**

---

#### 行为

**点Start：**
```
→ /rescue/new
```

**点Skip：**
```
- 写入rescueSkippedAt
- redirect /
- Dashboard仍然显示Rescue卡片（但弱一点）
```

---

### Step 2 · Rescue Wizard（你已经在做）

**Route:** `/rescue/*`

**流程：**
```
Scan → Review → Fix → Confirm
```

**规则：**
```
用户可随时Exit（但会提示）
```

---

### Step 3 · Rescue Confirm / Exit后的落点

**A. 完成Rescue：**
```
- 写入rescueCompletedAt
- redirect /
- Dashboard显示：
  ✅ Self-Rescue completed
  Undo available for 24 hours
```

**B. 中途Exit：**
```
- 写入rescueAbortedAt
- redirect /
- Dashboard Rescue卡片文案变成：
  Continue Self-Rescue
  You're halfway done.
```

---

## 🔄 Dashboard在不同状态下的变化

### 状态1：从未做过Rescue

**Rescue卡片（默认）:**
```
Rescue your photo library
[Start Self-Rescue]
```

---

### 状态2：Skip过Rescue

**Rescue卡片（弱化）:**
```
Fix your photos anytime
[Start Self-Rescue]
```

---

### 状态3：Rescue进行中

**Rescue卡片（进度态）:**
```
Self-Rescue in progress
[Continue →]
```

---

### 状态4：Rescue完成

**Rescue卡片（完成态）:**
```
✅ Self-Rescue completed
[View summary]

（此时Capture/Jobs会自然成为下一步）
```

---

## 📋 CTO执行清单（可直接转发）

### 立即执行（今天）

```
☐ Login redirect改到 /onboarding/check
☐ 新增 /onboarding/rescue-intro 页面
☐ Rescue状态字段：
  - rescueSkippedAt
  - rescueCompletedAt
  - rescueAbortedAt
☐ Dashboard Rescue卡片根据状态变文案
☐ 禁止直接 login → /jobs
```

---

### Phase 1核心页面

```
☐ / (Dashboard)
☐ /onboarding/check (逻辑页)
☐ /onboarding/rescue-intro (引导页)
☐ /rescue/* (已有)
☐ /jobs (降级为二级)
☐ /settings (降级为二级)
```

---

## 📜 产品宪法·Onboarding篇

> **Version:** 1.0  
> **Status:** Locked  
> **Applies to:** Web / PWA / Future Native

---

### 0. 核心使命（一句话，所有人必须背下来）

```
JSS的第一步，不是让用户学会用软件
而是先帮他把"已经发生的事情"整理清楚
```

---

### 1. Onboarding的唯一目标（严禁扩展）

**Onboarding只做一件事：**

```
在用户登录后的30秒内，让他决定：
「我要不要先拯救我自己的照片？」

任何不服务于这个目标的内容
不属于Onboarding
```

---

### 2. 严格禁止的事情（Hard No）

**在Onboarding阶段，系统绝对不允许：**

```
❌ 直接展示完整Jobs列表当首页
❌ 把用户扔进一个"空页面"
❌ 要求用户先配置Settings
❌ 要求用户先创建Job
❌ 教用户复杂功能
❌ 自动替用户做整理决定
```

**理由只有一个：**
```
信任在前，操作在后
```

---

### 3. Login后的强制路径（不可绕过）

#### 3.1 路径总览（不可变）

```
Login
  ↓
/onboarding/check
  ↓
[ Should we offer Self-Rescue? ]
        ↓ yes                         ↓ no
/onboarding/rescue-intro          Dashboard
        ↓
Self-Rescue Wizard
        ↓
Confirm / Skip
        ↓
Dashboard（正常态）
```

---

#### 3.2 判断逻辑（宁愿简单，绝不复杂）

**系统只判断一件事：**

```typescript
shouldOfferSelfRescue =
  !rescueCompleted &&
  userLikelyHasExistingPhotos
```

**userLikelyHasExistingPhotos的定义：**

```
Web/Desktop：默认true
PWA/Mobile：能读取到相册metadata即视为true
```

**原则：**
```
❗宁愿多问一次
❗也不要让用户错过Self-Rescue
```

---

### 4. Rescue Intro页的宪法级约束

**这是Onboarding中唯一允许出现解释性文案的页面**

#### 4.1 页面必须满足

```
✅ 只解释Self-Rescue
✅ 明确强调：Nothing changes unless you confirm
✅ 只给两个选择
```

#### 4.2 唯一允许的CTA

```
Primary: Start Self-Rescue
Secondary: Skip for now

❌ 禁止第三个按钮
❌ 禁止Learn more / Watch video
❌ 禁止Feature列表
```

---

### 5. Self-Rescue Wizard的行为约束

**在Self-Rescue过程中，系统必须遵守：**

```
📌 只读扫描（Scan ≠ Apply）
📌 所有整理都是建议
📌 用户明确Confirm之前，不得落地任何结构变化
📌 Exit永远允许（但要提示）
```

**定位：**
```
Self-Rescue是"信任演示"
不是"功能秀"
```

---

### 6. Dashboard的角色定义（非常重要）

**Dashboard不是：**
```
❌ 功能列表
❌ 管理后台
❌ 设置集合
```

**Dashboard是：**
```
✅ 行动中心（Action Hub）
```

**它必须回答用户一个问题：**
```
"我现在最值得做的下一步是什么？"
```

---

### 7. Dashboard的优先级规则（不可违反）

**永远第一位：**
```
🛟 Self-Rescue Entry / Status Card
```

**第二位：**
```
📁 Jobs Snapshot（摘要）
```

**最低权重：**
```
⚙️ Settings
❓ Help
```

**黄金规则：**
```
如果未来某个功能想"上首页"
必须先回答：
它是否比Self-Rescue更重要？

（答案几乎永远是否）
```

---

### 8. Rescue状态机（Onboarding相关）

**系统必须维护以下状态：**

```typescript
enum RescueStatus {
  NOT_STARTED,      // rescueNotStarted
  SKIPPED,          // rescueSkippedAt: timestamp
  IN_PROGRESS,      // rescueInProgress: boolean
  COMPLETED,        // rescueCompletedAt: timestamp
  ABORTED,          // rescueAbortedAt: timestamp
}
```

**规则：**
```
Dashboard与Onboarding的行为
必须严格依赖这些状态
```

---

### 9. 为什么这条宪法不能被破坏

**因为JSS的差异化不是：**
```
❌ 拍照更炫
❌ AI更聪明
❌ 功能更多
```

**而是：**
```
✅ 在混乱的现实中
   我们不替用户做主
```

**关键：**
```
Onboarding是用户感知这一点的第一现场
```

---

### 10. 结语（写给未来的自己）

**如果有一天你觉得：**
```
- Onboarding太慢
- 用户想快点进系统
- 可以先跳过Rescue
```

**请记住：**
```
用户不是嫌慢
是嫌被忽视

Self-Rescue的存在
是为了让用户知道：

这个系统，是站在他那一边的
```

---

### 文档状态说明

```
本文档属于：产品宪法

修改需要：CEO + CPO 共识

工程实现可以迭代
路径与原则不可动
```

---

## 💬 CPO最后的判断

### 给CEO的话

```
你现在遇到的这个问题不是"小UI问题"
而是99% 工具类SaaS在早期都会踩的坑：

功能是对的
但入口没有帮用户做决定

你已经把最难的部分（产品哲学 + 核心功能）做对了
现在只是把门打开，让人看见而已
```

---

### 给CTO的话

```
这不是你做错了
是产品层还没把页面串起来

你做的"功能"是对的
现在补的是"入口 + flow glue"

按这个文档执行后：
用户登录 → 立刻知道下一步干嘛
```

---

### 给团队的话

```
这条30秒路径解决了3个生死问题：

1. 避免"登录后不知道干嘛"
2. 避免用户错过你们的差异化王牌
3. 把"信任"放在"功能"之前建立

你不是在逼用户用Rescue
你是在给他一个"不后悔的第一步"
```

---

## 🎯 最后一句话

```
你现在做的这件事，不是onboarding优化

而是：
把JSS从"一个工具"
变成"一个先帮你把事情理顺的人"

这一步走对了
后面Capture / Feed / Report都会变得顺理成章
```

---

## 📊 验收标准

### 功能验收

```
☐ 登录后进入/onboarding/check
☐ 第一次登录看到Rescue Intro
☐ Skip后Dashboard仍显示Rescue卡片
☐ 完成Rescue后Dashboard显示完成状态
☐ Dashboard永远显示Rescue（除非明确完成）
☐ Jobs降级为二级页面
☐ Settings降级为二级页面
```

---

### 体验验收

```
☐ 登录后5秒内知道下一步干嘛
☐ Rescue卡片不可能被错过
☐ 用户不会看到"空页面"
☐ 用户不会被扔进Jobs List
☐ 用户随时知道自己在哪一步
```

---

### 宪法验收

```
☐ Self-Rescue永远在Dashboard第一位
☐ Onboarding只问一个问题
☐ 用户可以Skip，但不能被忽略
☐ 信任在前，操作在后
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 立即生效  
**预计完成：** 3天

---

**先帮你把事情理顺，再谈什么功能！** 🎯
