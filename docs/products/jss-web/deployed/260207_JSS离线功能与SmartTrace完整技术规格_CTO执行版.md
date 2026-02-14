# JSS 离线功能与Smart Trace技术规格（CTO执行版）

> **文档类型：** 技术规格 + 工程守则  
> **关联文档：** 260207_SnapEvidence相机模块技术规格_CTO执行版.md  
> **创建时间：** 2026-02-07  
> **优先级：** 🔴 P0 - 核心功能  
> **执行人：** CTO + 前后端团队

---

## 📋 执行摘要

**问题背景：**
- CEO询问LedgerSnap的离线功能能否复用到JSS
- 需要对比CompanyCam的离线实现
- COO提出Smart Trace（智踪）功能构想

**最终决策：**
- ✅ LedgerSnap离线思想可复用，代码几乎不能复用
- ✅ 实施Smart Trace但Phase 1严格限制边界
- ✅ 离线是常态，不是异常状态
- ✅ 建立完整的状态机和前后端职责切割

**核心原则：**
> SnapEvidence是"工地相机"，不是"智能系统"。快门优先于一切，系统永远不"帮用户决定事实"。

---

## 🎯 LedgerSnap离线经验分析

### CEO核心问题

**原文：**
> "我们之前在做ledgerSnap的时候已经做过一部分离线功能，不知道对我们现在jss有没有帮助。"

---

### CPO判断：思想可复用，实现不能复用

#### ✅ LedgerSnap离线对JSS真的有帮助的部分

**1. 离线队列 + 幂等思想：100%可复用（理念层）**

**LedgerSnap已经做过的：**
- client-generated id（现在叫photoId）
- 本地队列 ≠ 网络请求
- retry不制造新记录（幂等）
- "成功写本地 ≠ 成功上传"的认知

**👉 这些是SnapEvidence能成立的底层共识**  
**不是代码复用，是脑回路已经对了**

---

**2. "不允许静默失败"的UX原则：完全通用**

**LedgerSnap已经吃过的亏：**
- 队列卡死
- 用户以为传了，其实没传
- 状态不透明

**这些正是CompanyCam现在还在掉坑里的地方**

**JSS Phase 1定的：**
```
不允许静默失败
不允许暗改
不允许误归档
```

**这条，其实就是LedgerSnap的"血债总结"**

---

#### ❌ LedgerSnap离线不能直接用在JSS的部分

**1. LedgerSnap是"表单离线"，JSS是"硬件动作离线"**

| 维度 | LedgerSnap | JSS |
|------|-----------|-----|
| **离线性质** | 异常状态 | 默认状态 |
| **用户状态** | 能等 | 在梯子上 |
| **失败后果** | 可重来 | 快门瞬间不可逆 |
| **数据类型** | 轻量 | 图片是重资产 |

**LedgerSnap离线的本质：**
> 我有一条结构化数据，等网好了再发

**JSS SnapEvidence离线的本质：**
> 我按下快门这一瞬间，系统必须"已经赢了"

**👉 所以：LedgerSnap的离线实现方式（Promise + retry）不能直接照抄**

---

**2. LedgerSnap没有"物理世界约束"，JSS有**

**JSS的SnapEvidence有这些LedgerSnap没有的变量：**
- 摄像头权限
- 文件系统IO
- 内存/存储上限
- PWA在iOS下被系统"随时干掉"

**👉 这决定了：**
```
JSS的离线必须是"先写盘，再想别的"

而不是：
先处理业务，再考虑存储
```

---

### 一句话总结

**CPO判断：**
> LedgerSnap的离线体系「思想完全正确」，但「实现几乎不能直接复用」；JSS的SnapEvidence离线必须是一个"相机级状态机"，而不是"表单级队列"。

---

## 🔍 CompanyCam离线功能深度分析

### CompanyCam的离线策略

**COO调研结论：**
> CompanyCam确实有离线功能，但根据它的技术文档和报错日志来看，它的这个功能更像是"被动防御"，而不是像咱们JSS这样从底层设计的"主动进攻"。

---

### CompanyCam离线逻辑："缓存 + 排队"

#### 1. 提前下载

**机制：**
- 自动缓存最近、置顶或分配给你的60个项目
- 去没信号的工地前，需要先打开App"刷一下"
- 把项目存进手机

---

#### 2. 离线拍

**机制：**
- 没网时，App切换到"离线模式"
- 可以拍照、拍视频、填清单

---

#### 3. 等网同步

**机制：**
- 回到有信号的地方
- App弹出横幅："有X项内容等待上传"
- 开始自动同步

---

### CompanyCam的三个"大坑"（JSS的机会）

#### 坑1："没网就没项目"

**问题：**
```
如果你临时去了一个新工地
或者那个项目不在缓存的60个之列
→ 对不起，你连"拍照"的入口可能都找不到
```

**本质：** 云端优先的逻辑

---

#### 坑2：上传队列"卡死"

**典型症状：**
```
ERR_NAME_NOT_RESOLVED

从没网切到有网时
CompanyCam的后台疯狂重试
如果DNS没解析对
上传队列就会卡在那转圈
```

**用户抱怨：**
> "我拍了50张，结果回家发现一张都没传上去，还没存进相册。"

---

#### 坑3：数据丢失风险

**机制：**
- 为了保护隐私不存系统相册
- 上传队列卡住了
- 师傅以为传好了直接卸载重装App
- **照片永久丢失**

---

### JSS如何赢CompanyCam

**对比表：**

| 维度 | CompanyCam | JSS |
|------|-----------|-----|
| **离线定位** | 补漏洞（被动防御） | 建碉堡（主动进攻） |
| **没网时** | 功能受限 | 像单反相机一样顺手 |
| **项目管理** | 云端优先 | 本地优先 |
| **数据安全** | 队列卡死可能丢失 | 私有沙盒永不丢失 |
| **上传策略** | 疯狂重试 | 并发控制（≤2） |

**COO总结：**
> CompanyCam在"补漏洞"，咱们在"建碉堡"。CompanyCam的离线功能是为了防止App在没网时彻底废掉；而咱们JSS的逻辑是："工地上没信号是常态，App必须在没网时像单反相机一样顺手。"

---

## 🎯 Smart Trace（智踪）完整技术方案

### 功能定位

**COO构想：**
> "事后自动归档" (Post-Sync Auto-Archiving)

**使用场景：**
```
师傅在地下室没信号的地方拍照
当时App连不上云端数据库
但手机GPS硬件依然在工作

网络恢复后：
App把照片的GPS坐标发给云端
云端计算最近项目
自动提示归档
```

---

### 技术实现流程

#### 1️⃣ 离线记录（The Breadcrumb）

**拍照时：**
```typescript
// 师傅在没网的地下室拍照
// App连不上云端，但GPS硬件在工作

每张照片存入私有沙盒时，强制打上：
- 精准的GPS坐标（lat/lng）
- 时间戳（timestamp_utc）
- 海拔高度（altitude，可选）
```

---

#### 2️⃣ 影子匹配（Shadow Reconciliation）

**网络恢复后：**
```typescript
// 师傅走出地下室，手机连上5G

App第一时间不是上传图片
而是把刚才那几张图的坐标发给云端问：
"这几个经纬度，离咱们哪个项目最近？"

云端计算：
- 遍历所有active_projects的geofence_center
- 计算distance
- 返回候选项目
```

---

#### 3️⃣ 自动归位（Magic Move）

**匹配成功后：**
```typescript
云端回复：
"坐标在West 41st Ave项目的50米范围内"

App展示：
【建议归档】
"已识别 15 张照片可能属于：张先生家项目"
[确认归档] [取消]

用户点击确认 → 照片归档
用户点击取消 → 保持未归档状态
```

---

### 为什么这招能把CompanyCam甩开

**1. 地下室优势**
```
CompanyCam: 地下室 = 功能残缺
JSS: 地下室 = 正常使用 + 事后智能匹配
```

**2. 温哥华特殊地形**
```
依山而建的房子
信号差是常态
Smart Trace = 核心竞争力
```

**3. 心理模型**
```
师傅不需要：提前选项目、记住在哪
师傅只需要：拍就完了，系统会处理
```

---

### 三个细节让功能更接地气

#### 1. 地理围栏缓冲区（Buffer Zone）

**参数：**
```typescript
GEOFENCE_RADIUS = 50-100米

// 考虑到GPS在室内的偏差
// 只要在这个圈里，都算这个工地的
```

---

#### 2. 多工地重叠处理

**场景：**
```
温哥华某个路口两个房子都在施工
坐标重叠了

App不会乱猜
而是弹出极简二选一：
"你是正在张家还是李家？"

点一下，全归类
```

---

#### 3. "冰箱贴"联动

**效果：**
```
照片自动归位后
立刻按时间线排列

房东扫码时
看到的是实时且有序的进化史

这种"一切尽在掌握"的感觉
就是JSS的核心价值
```

---

## ⚠️ Smart Trace Phase 1严格边界

### CPO核心判断

**关键结论：**
> Smart Trace逻辑上成立，但Phase 1不能"全形态落地"

**原因：**
```
Phase 1：事实
Phase 2：推断

Smart Trace的GPS匹配 ≠ AI，还能算规则
但如果做成"AI发现这是张先生家"
这是明确的智能推断
必须留到Phase 2
```

---

### Phase 1允许的Smart Trace功能

#### ✅ 离线捕捉GPS + timestamp：100%应该做

**功能：**
```typescript
// 这是事实记录，不是推断
PhotoItem {
  photoId: string
  temp_lat: number
  temp_lng: number
  altitude?: number
  timestamp_utc: string
  accuracy_m?: number
}
```

**理由：**
- 这是证据增强，不是推断
- 就算永远不用Smart Trace，这些数据都值钱
- **这一步强烈建议：现在就做**

---

#### ✅ "事后归档"只能做到半自动

**Phase 1上限：**
```
自动"建议"，人工"确认"
```

**允许的流程：**
```
系统算出：
"最可能项目：张先生家（距离42m）"

UI展示：
【一键确认归档】

用户点击 → 归档
用户忽略 → 保持未归档
```

---

### Phase 1明确禁止的功能

#### ❌ 1. "AI自动发现这是张先生家" - Phase 2才能碰

**禁止理由：**
```
Phase 1不允许"AI发现"

原因不是技术，而是产品宪法：
Phase 1：事实
Phase 2：推断

Smart Trace的GPS匹配 ≠ AI，还能算规则
但"AI发现这个坐标就是张先生家"
这是明确的智能推断

必须留到Phase 2
不然会污染整个SnapEvidence的信任基础
```

---

#### ❌ 2. "后台自动吸进项目 + 震动通知" - 危险

**禁止理由：**
```
这个UX很爽，但风险极大：

- GPS漂移
- 工地密集
- 用户没意识到发生了"归档行为"

Phase 1如果这么做，一旦出错：
证据可信度直接被质疑
```

---

### CPO级落地建议

**Phase 1：Smart Trace（裁剪版）定义**

```
Smart Trace（Phase 1）不是"自动归档"
而是"离线证据增强 + 上线后归档建议"

允许的：
✅ 离线拍照 → 强制记录GPS + time
✅ 上线后 → 计算最近项目
✅ UI → 明确提示 + 一键确认

禁止的：
❌ 静默自动归档
❌ AI自主判断
❌ 无UI的状态变化
```

---

## 📐 Smart Trace Phase 1不可越界清单

### 一、Smart Trace在Phase 1的合法定义

**核心定位：**
```
Smart Trace = 离线证据增强 + 上线后归档建议

不是：
❌ 自动归档系统
❌ AI判断系统
❌ 后台静默整理系统

而是：
在离线状态下完整记录事实
在联网后"辅助用户做决定"
```

---

### 二、Phase 1必须做的（Required）

#### R1. 离线事实捕捉（不可省略）

**每一次拍照必须同步写入：**
```typescript
{
  photoId: string,          // client-generated，幂等键
  timestamp_utc: string,    // 拍照瞬间
  temp_lat: number,
  temp_lng: number,
  accuracy_m?: number       // GPS精度（推荐）
}
```

**规则：**
- 无网络 ≠ 无定位
- 定位失败必须明确标记为null，不允许伪造

---

#### R2. Smart Trace只能在「联网后」触发

**离线状态下：**
```
❌ 不做任何项目匹配
❌ 不出现"猜测项目"的UI
```

**联网状态下：**
```
✅ 才允许执行"最近项目计算"
```

---

#### R3. 只允许"候选建议"，不允许直接写归属

**Smart Trace的计算结果只能是候选状态：**
```typescript
smart_trace_suggestion = {
  jobId: string,
  distance_m: number,
  confidence: "low" | "medium"
}
```

**规则：**
- 该结果 ❌ 不得直接写入photo.job_id
- 该结果 ❌ 不得改变照片真实归属
- 只能进入：Pending Assignment（待确认）

---

#### R4. 所有归档行为必须有「明确用户动作」

**唯一合法的归档方式：**
```
用户在UI中点击确认（tap/click）
```

**允许的交互示例：**
```
"建议归档到：张先生家（42m）"
  ↓
【确认】按钮
```

**规则：**
```
❌ 不允许：自动吸入
❌ 不允许：背景写库
❌ 不允许：无UI的状态迁移
```

---

### 三、Phase 1明确禁止的（Forbidden）

#### ❌ F1. 禁止"自动归档"

**无论多确定，都不允许：**
- 后台自动把照片放进某个job
- 联网后无提示改变照片归属
- 震动/toast但不让用户确认

**原因：**
> 这直接违反SnapEvidence的核心承诺：不允许误归档

---

#### ❌ F2. 禁止AI/智能推断

**Phase 1不允许：**
- "AI发现这是张先生家"
- 历史行为学习
- 自动纠错/自动调整geofence

**Phase 1只允许：**
- 距离计算
- 明确规则判断（if/else）

---

#### ❌ F3. 禁止无痕状态变化（Silent Mutation）

**以下行为一律视为P0 Bug：**
- 照片jobId被改，但用户没点过
- UI显示在A项目，DB实际在B
- 用户卸载前不知道有"未确认归档"

---

#### ❌ F4. 禁止Smart Trace阻塞拍照/上传

**Smart Trace计算：**
```
❌ 不得阻塞拍照
❌ 不得阻塞preview上传
```

**即使Smart Trace失败：**
```
✅ 拍照与上传仍视为成功
```

---

### 四、边界场景强制规则

#### E1. 多项目命中（重叠工地）

**如果distance < threshold命中≥2项目：**
```
❌ 不允许系统选
✅ 必须用户二选一（或取消）
```

---

#### E2. 无GPS/GPS漂移严重

**若accuracy_m > 100m或定位失败：**
```
❌ 不提供任何自动建议
✅ 明确显示「需手动归档」
```

---

#### E3. 用户忽略Smart Trace

**用户可以：**
- 不点
- 以后再点

**系统：**
```
❌ 不得反复打扰
❌ 不得自动处理
```

---

### 五、QA验收红线

**Smart Trace Phase 1必须通过以下测试：**

**测试1：断网拍照 → 联网后**
```
验收：
✅ 照片仍未归档
✅ 仅出现"建议"
✅ job_id仍为空
```

---

**测试2：任何情况下**
```
验收：
✅ 无用户点击 → 无归档发生
```

---

**测试3：删除App前**
```
验收：
✅ 系统明确提示是否存在"未确认归档照片"
```

---

## 🔄 SnapEvidence状态机定义

### 一、核心对象（统一语言）

```typescript
PhotoItem {
  photoId: string            // client-generated, immutable
  capture_state: CaptureState
  upload_state: UploadState
  assignment_state: AssignmentState
  temp_coords?: {
    lat: number
    lng: number
    accuracy_m?: number
  }
  timestamp_utc: string
  r2_key?: string
}
```

---

### 二、三条正交状态线（重点）

**⚠️ 这是设计关键：**
> 拍照/上传/归档 三条状态线必须彼此独立  
> 任何一条失败，都不能拖垮另外两条

---

### A. Capture State（拍照状态）

**这是最高优先级状态机**

```typescript
enum CaptureState {
  IDLE,            // 相机未激活
  CAPTURING,       // 快门瞬间（不可中断）
  LOCAL_WRITTEN,   // 已成功写入App私有存储（胜利条件）
  FAILED           // 只有写盘失败才能到这里
}
```

---

**合法迁移：**
```
IDLE
  → CAPTURING
    → LOCAL_WRITTEN   ✅（拍照成功）
    → FAILED          ❌（写盘失败）
```

---

**硬规则：**
```
✅ 一旦进入LOCAL_WRITTEN
   本次拍照永远视为成功

❌ 后续任何失败
   不得retroactively影响CaptureState
```

---

### B. Upload State（上传状态）

**完全不能阻塞拍照**

```typescript
enum UploadState {
  NOT_QUEUED,      // 尚未入上传队列
  QUEUED,          // 等待上传
  UPLOADING,       // 正在上传preview
  UPLOADED,        // preview已到R2
  ERROR_RETRYABLE  // 网络/DNS/临时错误
}
```

---

**合法迁移：**
```
NOT_QUEUED
  → QUEUED
    → UPLOADING
      → UPLOADED        ✅
      → ERROR_RETRYABLE → QUEUED
```

---

**硬规则：**
```
✅ UploadState只能依赖photoId
✅ retry必须幂等
✅ ERROR永远是「可恢复」的概念

❌ 不允许FAILED_FINAL
```

---

### C. Assignment State（归档/Smart Trace状态）

```typescript
enum AssignmentState {
  UNASSIGNED,            // 默认态
  SUGGESTED_BY_SMART_TRACE,
  USER_CONFIRMED,        // 用户点击确认
  MANUALLY_ASSIGNED      // 用户手动选择
}
```

---

**合法迁移：**
```
UNASSIGNED
  → SUGGESTED_BY_SMART_TRACE
    → USER_CONFIRMED
    → UNASSIGNED         // 用户忽略/取消
  → MANUALLY_ASSIGNED
```

---

**硬规则：**
```
✅ 只有USER_CONFIRMED / MANUALLY_ASSIGNED
   才允许写photo.job_id

❌ Smart Trace永远不能直接写job_id
```

---

### 三、Smart Trace的旁路触发条件

**Smart Trace不是常驻逻辑，只能在以下条件同时满足时触发：**

```typescript
if (
  network === ONLINE &&
  assignment_state === UNASSIGNED &&
  temp_coords exists
) {
  runSmartTrace()
}
```

---

### 四、Smart Trace算法输出

```typescript
SmartTraceResult {
  candidate_job_id: string
  distance_m: number
  confidence: "low" | "medium"
}
```

---

**写入规则：**
```
✅ 只允许写：
   assignment_state = SUGGESTED_BY_SMART_TRACE
   smart_trace_meta

❌ 不允许写：
   photo.job_id
```

---

### 五、UI与状态的强绑定规则

**核心原则：**
```
UI显示 ≠ 状态变化
状态变化 ≠ UI猜测
```

---

**唯一合法的job_id写入路径：**
```
User Click
  → confirm assignment
    → assignment_state = USER_CONFIRMED
    → photo.job_id = X
```

---

### 六、典型流程（QA测试用例）

#### 场景1：完全离线拍照

```
1. 断网
2. 拍照20张

每张：
- CaptureState = LOCAL_WRITTEN
- UploadState = NOT_QUEUED
- AssignmentState = UNASSIGNED

验收点：
✅ 无一张丢失
✅ 无一张被归档
```

---

#### 场景2：上线后Smart Trace建议

```
1. 网络恢复
2. Upload队列启动
3. Smart Trace计算

状态变为：
- AssignmentState = SUGGESTED_BY_SMART_TRACE

UI显示建议

验收点：
✅ job_id仍为空
```

---

#### 场景3：用户忽略Smart Trace

```
用户不点

状态：
- AssignmentState = UNASSIGNED

验收点：
❌ 不允许后台"帮他整理"
```

---

### 七、P0 Bug定义

**任何一个出现，必须回滚：**

```
🚨 job_id在无用户动作下被写入
🚨 CaptureState回退
🚨 Smart Trace失败导致Upload停止
🚨 UI显示归档成功，但AssignmentState未更新
```

---

## 🔧 前端/后端职责切割表

### 一、最高原则

**写给所有工程师：**
> 谁都不能"帮用户决定事实"。系统只能记录、建议、等待确认。任何试图「自动化善意」的行为，在Phase 1都是P0违规。

---

### 二、前端（PWA）职责边界

#### ✅ 前端必须负责的

**FE-1｜拍照 & 本地写盘（最高优先级）**

```typescript
// 职责
- 调用相机
- 生成photoId
- 写入：preview（压缩JPEG）+ metadata
- 写入成功 → CaptureState = LOCAL_WRITTEN

// 规则
❌ 网络状态不得参与任何判断
✅ 一旦写盘成功，本次拍照视为不可撤销成功
```

---

**FE-2｜上传队列调度（非阻塞）**

```typescript
// 职责
- 监听网络变化
- 维护upload queue
- 基于photoId幂等重试

// 规则
❌ 上传失败 ≠ 用户失败
❌ 上传状态不得影响UI的"拍照成功感"
```

---

**FE-3｜Smart Trace触发与展示（无决策权）**

```typescript
// 职责
- 在满足条件时调用Smart Trace API
- 展示「归档建议」
- 接收用户点击

// 规则
✅ FE只能展示suggestion
❌ FE不能私自写job_id
❌ FE不能假设suggestion一定正确
```

---

**FE-4｜用户确认动作的"唯一出口"**

```typescript
// 前端是唯一可以触发归档确认的地方

User Tap
  → Confirm Assignment
    → API Call
```

**规则：**
```
✅ 所有归档都必须：
   - 来自明确用户操作
   - 带user_action标记
```

---

#### ❌ 前端严禁做的

```
❌ 自动选择项目
❌ 在UI层"默认帮用户点确认"
❌ 离线时做任何项目推断
❌ 因Smart Trace失败阻止上传/拍照
```

---

### 三、后端（API/DB）职责边界

#### ✅ 后端必须负责的

**BE-1｜幂等真相源（Authoritative）**

```typescript
// 职责
- photoId作为唯一键
- 所有写操作支持upsert
- 防止重复写/并发污染
```

---

**BE-2｜Smart Trace计算（规则引擎）**

```typescript
// 输入
- temp_coords
- active_projects geofence

// 输出
- candidate_job_id
- distance_m
- confidence

// 规则
✅ 后端只返回"候选"
❌ 后端永远不能写photo.job_id
```

---

**BE-3｜归档写入的"最后把关人"**

```typescript
// 后端必须强制校验
if (!user_confirmed) {
  reject_write()
}
```

**规则：**
```
即使前端Bug
即使恶意请求

没有user_confirmed = true
→ 归档请求一律拒绝
```

---

**BE-4｜状态一致性校验（防幽灵状态）**

```typescript
// 职责
- 校验：UI状态 ≠ DB状态
- 校验：AssignmentState ↔ job_id
- 提供QA/Debug接口
```

---

#### ❌ 后端严禁做的

```
❌ 自动归档
❌ 背景任务偷偷改job_id
❌ 根据历史行为"纠正用户"
❌ 在Phase 1引入ML/AI推断
```

---

### 四、前后端"交叉禁区"

| 行为 | 定性 |
|------|------|
| 无用户动作写job_id | 🚨 P0 |
| 自动整理照片 | 🚨 P0 |
| 离线时猜项目 | 🚨 P0 |
| UI显示成功但DB未写 | 🚨 P0 |
| DB写了但UI未展示确认 | 🚨 P0 |

---

### 五、唯一合法的归档时序（黄金路径）

```
[前端]
User Tap Confirm
  ↓
API: confirmAssignment(photoId, jobId, user_action=true)
  ↓
[后端]
Validate user_action
Validate photoId
Write job_id
Update AssignmentState
  ↓
Return success
```

**任何偏离这条路径的写入，都是Bug**

---

## ✅ PR Review Checklist（Phase 1红线版）

### 适用范围

```
- SnapEvidence
- 离线/上传/Smart Trace
- 任何涉及photoId/job_id/assignment_state的改动
```

---

### 一、拍照 & 本地写盘（Capture State）

**☐ C1. 快门瞬间是否完全不依赖网络？**

检查点：
```
❌ 等待网络返回
❌ await上传
❌ await Smart Trace
```

验收：
```
✅ 拍照→写盘→成功反馈，同步完成
```

**👉 Fail条件：**
> 任何逻辑可能导致「没网就拍不了/卡住」

---

**☐ C2. LOCAL_WRITTEN是否是不可回退状态？**

检查点：
```
❌ 从LOCAL_WRITTEN回到其他状态的路径
❌ 失败后retroactively标记"拍照失败"
```

**👉 Fail条件：**
> 拍照成功后还能被系统否定

---

### 二、上传队列 & 幂等性（Upload State）

**☐ U1. 上传是否100%基于photoId幂等？**

检查点：
```
✅ retry使用同一个photoId
✅ 不生成新记录
```

验收：
```
❌ 一次拍照，多条云端记录
```

**👉 Fail条件：**
> 一次拍照，多条云端记录

---

**☐ U2. 上传失败是否永远可恢复？**

检查点：
```
❌ FAILED_FINAL状态
❌ "放弃上传"的状态
```

验收：
```
✅ DNS/timeout/4xx都会回到QUEUED
```

**👉 Fail条件：**
> 任何"最终失败"概念

---

**☐ U3. 上传状态是否绝不影响拍照与UI成功感？**

检查点：
```
上传卡住时：
- 相机还能不能继续拍？
- UI有没有错误暗示用户"没拍到"？
```

**👉 Fail条件：**
> 上传问题反噬拍照体验

---

### 三、Smart Trace（Phase 1边界）

**☐ S1. Smart Trace是否只在联网后触发？**

检查点：
```
❌ 离线时调用Smart Trace
❌ 离线时猜项目的逻辑
```

**👉 Fail条件：**
> 离线状态出现"智能判断"

---

**☐ S2. Smart Trace是否只生成「建议」？**

检查点：
```
✅ Smart Trace输出只写suggestion
❌ 完全不写job_id
```

**👉 Fail条件：**
> Smart Trace有写DB归属的能力

---

**☐ S3. Smart Trace失败是否是"无害失败"？**

检查点：
```
Smart Trace超时/报错时：
- 拍照是否仍成功
- 上传是否继续
- AssignmentState是否保持UNASSIGNED
```

**👉 Fail条件：**
> Smart Trace的失败阻塞主流程

---

### 四、归档行为（Assignment State）

**☐ A1. 是否只有明确用户动作才能写job_id？**

检查点：
```
后端是否强制校验：
- user_confirmed === true

是否存在：
- 后台任务
- cron
- 自动纠正逻辑
```

**👉 Fail条件：**
> 无用户点击却写了job_id

---

**☐ A2. UI行为 ≠ 状态变化 是否被严格区分？**

检查点：
```
UI展示"建议"时：
- DB状态是否仍是UNASSIGNED

UI显示"已归档"：
- DB是否一定已写成功
```

**👉 Fail条件：**
> UI与DB状态不同步

---

**☐ A3. 多项目命中是否强制人工选择？**

检查点：
```
命中≥2项目时：
- 是否存在自动选一个的逻辑
- 是否明确进入Pending/Conflict UI
```

**👉 Fail条件：**
> 系统替用户"猜一个"

---

### 五、离线 & 极端场景（必须脑补）

**☐ E1. App被系统杀死后，数据是否仍完整？**

检查点：
```
iOS/Android：
- 后台被杀
- 进程中断

重启后：
- 已拍照片是否仍在
- 状态是否一致
```

**👉 Fail条件：**
> 依赖内存状态而非持久化

---

**☐ E2. 用户卸载前是否有"未处理风险提示"？**

检查点：
```
是否能检测：
- 未上传照片
- 未确认归档照片

是否明确告知用户风险
```

**👉 Fail条件：**
> 用户在不知情下丢证据

---

### 六、红线定义（任何一条直接拒绝PR）

**🚨 P0阻断条件（出现即拒绝）：**

```
🚨 写job_id的路径不要求user_confirmed
🚨 离线时出现任何"自动判断"
🚨 上传失败导致拍照失败
🚨 Smart Trace能改变事实状态
🚨 UI告诉用户"已保存"，但本地未写盘
```

---

### Reviewer最后一问（灵魂拷问）

```
如果我在地下室断网拍100张
然后立刻卸载App

我是否"清楚知道"
哪些照片在、哪些不在？
```

**答不上来 → 不允许merge**

---

## 📚 新人Onboarding工程守则

### 一、SnapEvidence是什么（只此一句）

**定义：**
> SnapEvidence是一台"工地相机"，不是一个"智能系统"。它的第一职责是：把发生过的事实，完整、可靠、可追溯地记录下来。

---

### 二、Phase 1的三条铁律（必须背下来）

#### 🟥 铁律1：快门优先于一切

**原则：**
```
拍照这件事：
❌ 不等网络
❌ 不等AI
❌ 不等后台

只要照片成功写入App私有存储：
→ 这次拍照就是成功

系统之后再怎么失败
都不能否定这次拍照
```

---

#### 🟥 铁律2：系统永远不"帮用户决定事实"

**原则：**
```
系统可以：
✅ 提供建议
✅ 计算距离
✅ 提醒用户

系统不可以：
❌ 自动归档
❌ 猜测项目
❌ 默默整理

没有用户点击
就没有事实变化
```

---

#### 🟥 铁律3：离线不是异常，是常态

**原则：**
```
在SnapEvidence：
没网 ≠ 错误
地下室 ≠ 极端情况

所有流程必须假设：
- 网络随时断
- App随时被系统杀掉

如果你的逻辑在断网时会"变聪明"
那它一定是错的
```

---

### 三、你在代码里绝对不能做的事

**❌ 禁止清单（任何一条都是P0）：**

```
❌ 在没有用户操作的情况下写job_id
❌ 离线时做项目判断
❌ 因为上传失败而让用户觉得"没拍到"
❌ Smart Trace自动改变照片归属
❌ UI显示成功，但本地其实没写盘
```

**看到这些代码，不要修，直接拦PR**

---

### 四、SnapEvidence的真实成功条件

**请记住，下面这个条件比一切KPI都重要：**

```
在地下室断网拍100张照片
上来后，每一张都还在

传没传上去，可以慢
归没归档，可以等

但不能丢、不能乱、不能改
```

---

### 五、关于Smart Trace的正确理解

**身份：**
> Smart Trace在Phase 1的身份是："记性好，但不自作主张。"

**它可以做的：**
```
✅ 记录GPS
✅ 联网后算距离
✅ 提出归档建议
```

**它不能做的：**
```
❌ 自动归档
❌ AI推断
❌ 替用户点确认
```

---

### 六、当你不确定时，用这个判断法

**在你写任何一段逻辑前，问自己一句：**

```
如果我是一个装修师傅
在梯子上、在地下室、在没信号的地方

我会不会因为这段代码而失去证据？
```

**判断：**
```
如果答案是「有一点可能」
→ 这段代码不应该存在

如果答案是「绝不可能」
→ 你可以继续写
```

---

### 七、Phase 1的底层哲学（一句话版）

```
宁可慢一点，也不能错一次
宁可不聪明，也不能不可信
```

---

### 八、你可以怎么"安全地发挥"

**如果你想做得更好，这些方向是被鼓励的：**

```
✅ 更快的本地写盘
✅ 更稳的离线恢复
✅ 更清晰的状态展示
✅ 更少打扰的UI
```

**如果你想做"更智能"的事：**
```
👉 记下来，放进Phase 2讨论
👉 不要偷偷加
```

---

### 九、结尾（写给每个工程师）

```
SnapEvidence不是一个"炫技产品"

它的价值不在于看起来多聪明

而在于：
当出现纠纷时，它站得住
```

---

## 🧪 地牢测试标准

### COO提出的验收标准

**原文：**
> "我觉得咱们可以给CTO定一个'地牢测试'标准：关掉Wi-Fi和5G，在一个全黑的房间里连续拍100张照片并配音。开启网络后，3分钟内所有300KB缩略图必须全部到账。"

---

### 正式测试规格

**测试名称：** 地牢测试（Dungeon Test）

**测试环境：**
```
✅ 关闭Wi-Fi
✅ 关闭5G/4G
✅ 全黑环境（模拟地下室）
```

**测试步骤：**
```
1. 进入地牢环境
2. 连续拍摄100张照片
3. （可选）录制配音
4. 保持离线状态10分钟
5. 恢复网络连接
6. 开始计时
```

**验收标准：**
```
✅ 100张照片全部存在于本地
✅ 0张照片丢失
✅ 网络恢复后，3分钟内所有preview（~300KB）上传完成
✅ 上传过程不阻塞新拍照
✅ 所有照片状态明确可见
```

**失败条件（任何一条出现）：**
```
🚨 任何照片丢失
🚨 上传超时未完成
🚨 状态不明确
🚨 用户不知道哪些已传/未传
```

---

## 📊 CompanyCam vs JSS离线对比表

| 维度 | CompanyCam | JSS (JobSite Snap) |
|------|-----------|-------------------|
| **离线定位** | 补漏洞（被动防御） | 建碉堡（主动进攻） |
| **设计理念** | 云端优先+离线兜底 | 离线原生+上线补账 |
| **没网时** | 功能受限，需提前缓存 | 像单反相机一样顺手 |
| **项目管理** | 云端优先（60个缓存限制） | 本地优先（无限制） |
| **临时工地** | 可能无法拍照 | 正常拍照，事后归档 |
| **数据安全** | 队列卡死可能丢失 | 私有沙盒永不丢失 |
| **上传策略** | 疯狂重试（易卡死） | 并发控制（≤2，平稳） |
| **归档方式** | 提前选择 | 可事后智能建议 |
| **GPS利用** | 不明显 | Smart Trace智踪 |
| **离线体验** | "凑合能用" | "设计初衷" |

---

## 🎯 实施路线图

### Phase 1（当前）- 基础离线 + Smart Trace裁剪版

**时间：** 2-3周

**必须交付：**
- [ ] 离线拍照写盘（不依赖网络）
- [ ] GPS坐标记录（temp_lat/lng）
- [ ] 完整状态机实现
- [ ] Smart Trace建议功能（无自动归档）
- [ ] 地牢测试通过

---

### Phase 1.5（1-2个月后）- 优化体验

**可选功能：**
- [ ] Smart Trace算法优化
- [ ] 多项目冲突UI优化
- [ ] 上传速度优化
- [ ] 离线数据清理策略

---

### Phase 2（未来）- 智能推断

**需要等待的功能：**
- [ ] AI自动识别项目
- [ ] 历史行为学习
- [ ] 自动调整地理围栏
- [ ] 高级推荐算法

---

## 💬 CPO最后的话

### 给CEO的总结

**你们现在这条路，是：**
> 把LedgerSnap的"账务严谨"，用在了"相机这种最容易出事故的东西上"。这是对的，而且很狠。

---

### 给CTO的提醒

**Smart Trace在Phase 1必须记住：**
```
宁可慢归档，也绝不乱归档
宁可不聪明，也绝不失真

系统只能建议，不能决定
```

---

### 给团队的定心丸

**SnapEvidence的成功标准：**
```
不是：看起来多聪明
不是：功能最齐全
不是：速度最快

而是：
当出现纠纷时，它站得住
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO + COO  
**执行人：** CTO + 前后端团队  
**生效日期：** 2026-02-07  
**预计完成：** Phase 1 - 3周

---

离线是常态，不是异常 —— 这就是我们的护城河！🎯
