# JSS 应用场景与 Evidence Set 产品模型（完整执行版）

> **文档类型：** 产品战略 + 技术规格 + 数据库Schema  
> **基于场景：** 温哥华商业装修项目（防火墙合规记录）  
> **创建时间：** 2026-02-07  
> **优先级：** 🔥 P0 - 核心竞争力定义  
> **执行人：** CEO + CPO + COO + CTO

---

## 📋 执行摘要

### 核心定位（CPO判断）

```
JSS 不是"拍照工具"
而是一个：

「以照片为核心的、权限驱动的、合规证据系统」
```

**这点非常重要，因为它决定了：**

```
✅ JSS 不是给普通相册用的
✅ JSS 也不是给社交协作用的
✅ JSS 是给"出了事能站得住脚的人"用的
```

---

### 一句话应用场景

```
JSS is built for situations where photos become proof.

When multiple parties, inspectors, and liability are involved,
we help general contractors capture, control, and present evidence
— without friction.
```

**这比"拍照管理"高级一个维度**

---

## 🏗️ 实战场景：温哥华商业装修项目

### 项目背景（CEO原话）

**项目：** 温哥华店铺装修项目

**涉及角色：**
- 业主（Property Owner）
- 设计师（Designer）
- 总包（General Contractor - CEO本人）
- 员工（Staff）
- 分包（Subtrade）
- 检查员（Inspector）

**核心需求：**
```
1. 我和员工：拍照记录工程进度

2. 我选择部分照片分享给业主、设计师

3. Inspector要求记录防火墙建造过程
   订每一层板都要做记录

4. 权限分级：
   - 我有最大权限
   - 员工只能在授权项目上传和修改自己的照片
   - 员工离开公司不再拥有任何权限
   - 其他个体只有view权限
```

---

## 💡 COO的4个核心补充

### 1. 针对Inspector的"合规模式"（Compliance Vault）

**温哥华Inspector的严苛要求：**
- 防火墙（1-hour或2-hour rating）
- 每一层板都要记录
- 错缝（Staggered joints）必须清晰可见

**JSS的解决方案：**

**层级嵌套拍照：**
```
员工拍第一层板（5/8" Type X）时
→ JSS自动打上"Layer 1"标签

拍第二层时
→ 系统对比上一张照片
→ 确保错缝清晰可见
```

**一键交付：**
```
到了验收环节
→ 不需要在手机里翻几百张图
→ 直接发一个"Firewall Inspection Link"
→ Inspector看到的是按时间、按层数排列整齐的施工记录

这种"职业感"能极大降低他找麻烦的概率
```

---

### 2. "分包责任追溯"（Subtrade Liability Buffer）

**在温哥华做总包最怕：**
```
分包进场后互相"伤害"
- 电工割断了水管
- 弄脏了刚刷好的墙
```

**状态交接记录：**
```
Subtrade进场前
→ 员工用JSS扫描一遍现场

分包完工退出后发现损坏
→ JSS的时间戳和地点数据就是最硬的法律证据
```

**虚拟围栏：**
```
给Subtrade开放view权限时
→ 设定为"仅限该项目地址内可见"
→ 防止公司敏感数据外泄
  （其他客户报价、进度等）
```

---

### 3. 员工权限的"熔断机制"（Digital Offboarding）

**离职即作废：**
```
JSS采用企业级权限中心

员工拍照时
→ 照片实际上直接流向云端
→ 不保存在员工个人的本地相册（物理隔绝）

一旦你在后台将其设为"Deactive"
→ 他手机里的JSS入口瞬间失效
```

**操作指纹：**
```
员工修改或上传照片
→ 每一笔都有记录

不仅是防小人
更是为了在出质量问题时
能找回"当时是谁在现场"
```

---

### 4. "业主/设计师"的降噪门户（Curation Portal）

**问题：**
```
业主和设计师往往是"外行看热闹"
给他们看所有原始施工图会增加沟通成本
```

**照片筛选（Pick & Share）：**
```
员工上传50张进度图
→ 你通过JSS后台勾选其中5张
  （最能代表进展、且工序规范的照片）
→ 一键同步到"业主视图"
```

**减压感展示：**
```
甚至可以自动生成一个
"从毛坯到完工"的时移短片
→ 让业主觉得这钱花得值
```

---

### COO战术补充：元数据的法律效力

**在温哥华，涉及保险理赔或Permit纠纷时：**

**单纯的照片是不够的，JSS每一张照片都应自动携带：**

```
✅ 精确到秒的时间戳
✅ GPS坐标（证明是在该店铺拍摄）
✅ 拍摄者的数字签名
✅ 当时的天气情况（对室外工程或混凝土施工尤为重要）
```

---

## 🎯 CPO的4个关键补充

### ① JSS的"核心对象"不是Job，而是Evidence Set

**你们现在的讨论默认是：**
```
Job → Photos → Share
```

**但在合规/扯皮/Inspector世界里，真正重要的是：**
```
Evidence Set（证据包）
```

**举例：**
```
- "2-Hour Firewall – Level 1–3"
- "Steel Beam Encapsulation – Feb 12"
- "Permit Board Daily Proof – Mar 3"
```

**这些不是"相册"，而是：**
```
✅ 有开始
✅ 有结束
✅ 有责任人
✅ 有不可篡改时间线
```

**建议产品层明确一个概念：**
```
Job下面可以有多个Evidence Sets

Inspector/Owner看的是Evidence Set
不是raw photo stream

这一步会让你后面PDF、分享、合规、法律全部顺
```

---

### ② "谁能看什么" ≠ 权限，而是视图（View）隔离

**Inspector不需要看到：**
```
❌ 电工乱拍的照片
❌ 估价阶段的临时图
```

**Owner Client不需要看到：**
```
❌ 防火墙每一层的technical细节
```

**Designer不需要看到：**
```
❌ Subtrade的责任交接记录
```

**所以JSS的权限逻辑应当是：**

```
不是"这张照片谁能看"
而是
"这个人打开JSS，看到的是哪一个View"
```

**这会让分享变得：**
```
✅ 安全
✅ 干净
✅ 不需要反复解释
```

---

### ③ JSS要"默认站在你这一边"（GC Bias）

**这一点很关键，也很少有人敢承认，但你可以：**

```
JSS天生偏向总包/Owner
```

**体现在：**
```
✅ 默认照片归公司
✅ 默认分享是只读
✅ 默认员工是Capture-only
✅ 默认Subtrade看不到别人
```

**这不是不公平，这是现实**

**关键问题：**
```
如果你不帮GC抵挡风险
那GC为什么要为你买单？
```

---

### ④ JSS的真正应用场景总结（记住这3条）

**JSS最适合的不是"记录好看的进度"，而是：**

```
✅ 将来一定会被问到的东西
✅ 当下没人愿意认真整理的东西
✅ 出事时只有你有完整证据的东西
```

**具体场景：**
```
防火墙、permit、封板、封管、subtrade交接
——全部符合
```

---

## 📄 官方Case Study（对外版）

### Vancouver Commercial Renovation · Firewall Compliance

**这是你以后见Investor、Enterprise客户、Inspector都能拿出来的一页**

---

### Case Overview

**Project:**
```
Commercial retail renovation, Vancouver, BC
```

**Stakeholders:**
```
- Property Owner
- Designer
- General Contractor (GC)
- Site Staff
- Subtrades
- City Inspector
```

**Requirement:**
```
City inspector required full visual documentation 
of a 2-hour fire-rated wall,
including each gypsum layer before concealment.
```

---

### The Problem

**On commercial renovations in Vancouver:**

```
❌ Inspectors often require proof after the wall is already closed
❌ Photos are taken by multiple people, on multiple phones
❌ Evidence is scattered, mislabeled, or lost
❌ When questions arise, contractors scramble through 
   personal photo libraries
```

**This creates:**
```
- Inspection delays
- Rework
- Liability risk
```

---

### How JSS Was Used

#### 1. Structured Evidence Capture

**Site staff used JSS to capture photos at each firewall stage:**

```
Stage 1: Framing & firestopping
Stage 2: First layer 5/8" Type X
Stage 3: Second layer with staggered joints
```

**Each photo was automatically recorded with:**
```
✅ Timestamp (to the second)
✅ GPS location
✅ Photographer identity
```

---

#### 2. Controlled Review & Sharing

**The GC curated a Firewall Evidence Set, sharing:**

```
✅ A clean, chronological timeline
✅ Only relevant photos
✅ Read-only access for the inspector
```

**Result:**
```
No raw jobsite clutter
No missing steps
```

---

#### 3. Inspection Outcome

```
✅ Inspector reviewed evidence remotely
✅ No re-opening required
✅ No rework requested
✅ Inspection passed without dispute
```

---

### Why It Matters

```
JSS turned everyday jobsite photos 
into inspection-ready proof
— without slowing the crew down.
```

---

## 📜 JSS权限宪法表（产品级）

### Role-Based Access Constitution

**这张表是"以后谁都不能乱改的真理"**

| Role | Capture | Edit Own | Edit Others | Delete | View Scope | Share | Audit Log |
|------|---------|----------|-------------|--------|------------|-------|-----------|
| **GC / Owner** | ✅ | ✅ | ✅ | ✅ | All Projects | ✅ | ✅ |
| **Staff (Employee)** | ✅ | ✅ | ❌ | ❌ | Assigned Projects Only | ❌ | ✅ |
| **Subtrade** | ❌ | ❌ | ❌ | ❌ | Assigned Evidence Sets | ❌ | ❌ |
| **Designer** | ❌ | ❌ | ❌ | ❌ | Curated Views | ❌ | ❌ |
| **Owner / Client** | ❌ | ❌ | ❌ | ❌ | Curated Views | ❌ | ❌ |
| **Inspector** | ❌ | ❌ | ❌ | ❌ | Compliance Evidence Sets | ❌ | ❌ |

---

### 宪法级规则（必须写进产品）

```
1. 照片永远属于公司，不属于个人

2. 员工是采集终端，不是数据所有者

3. 分享默认只读

4. 权限撤销即时生效（Digital Offboarding）

5. 所有操作必须进入Audit Log
```

**关键：**
```
这是JSS能进入商装、政府、学校项目的前提
```

---

## 🏛️ Evidence Set 产品模型

### 核心定义

```
Evidence Set = 
一个"可交付、可审计、可复用"的施工证据包

它不是相册，也不是文件夹
```

---

### 产品层级关系（非常重要）

```
Company
 └── Project (Job)
      └── Evidence Set
           └── Photos (ordered, immutable)
```

**说明：**
```
Projects organize work
Evidence Sets explain outcomes
```

---

### Evidence Set的属性

| Attribute | Description |
|-----------|-------------|
| **Name** | Human-readable purpose<br>"2-Hour Firewall – Level 1–3" |
| **Scope** | Time range + physical location |
| **Owner** | General Contractor |
| **Contributors** | Staff (capture only) |
| **Status** | Draft → Reviewed → Shared |
| **Audit Log** | Capture, review, share actions |

---

### Evidence Set的行为边界

**Evidence Sets can:**
```
✅ Curate photos from job timelines
✅ Preserve chronological order
✅ Be shared as read-only links
✅ Be exported as inspection-ready reports
```

**Evidence Sets cannot:**
```
❌ Be modified by external viewers
❌ Accept uploads from inspectors or clients
❌ Lose original timestamps or metadata
```

---

### Evidence Set与权限系统的关系

**核心原则：**
```
Evidence Sets are views, not copies
```

**规则：**
```
✅ One photo can belong to multiple Evidence Sets
✅ Permissions apply at the Evidence Set level
✅ Sharing never alters the underlying photo record
```

**这确保了：**
```
✅ Data integrity
✅ Clear responsibility
✅ No duplication chaos
```

---

### Phase 1 vs Phase 2（战略说明）

**Phase 1:**
```
- Evidence Sets exist implicitly
- Created via "Pick & Share" flows
- UI focuses on simplicity
```

**Phase 2:**
```
- Evidence Sets become first-class UI objects
- Templates (Firewall, Rough-in, Close-out)
- Inspector-specific exports
```

---

### 为什么这个模型matters长期

**Evidence Sets allow JSS to scale into:**

```
✅ Commercial renovations
✅ Government & institutional projects
✅ Insurance and warranty documentation
✅ Legal-grade record keeping
```

**Without changing the core data model**

---

### 产品铁律（不可违反）

```
1. Evidence Sets explain work 
   — they do not store opinions

2. Evidence Sets are immutable once shared

3. External parties never modify evidence

4. Auditability always outweighs convenience
```

---

### 最后一句（写给未来的你）

```
If a feature weakens Evidence Sets,
it weakens trust.

If it strengthens Evidence Sets,
it belongs in JSS.
```

---

## 💾 数据库Schema（Phase 1/2兼容）

### 设计目标

```
✅ Phase 1不用改UI就能落Evidence Set的能力
✅ Phase 2直接显性化，不返工
```

**中性逻辑schema，不绑Supabase/Prisma/Drizzle**

---

### 1️⃣ 核心表结构（最小集合）

#### projects

```sql
projects (
  id                uuid PRIMARY KEY,
  company_id        uuid,
  name              text,
  address           text,
  status            enum('active','archived'),
  created_at        timestamptz
)
```

---

#### photos（SnapEvidence核心表）

```sql
photos (
  id                uuid PRIMARY KEY,         -- photoId (幂等)
  project_id        uuid REFERENCES projects(id),
  captured_by       uuid REFERENCES users(id),
  captured_at       timestamptz,              -- 秒级
  lat               numeric,
  lng               numeric,
  r2_key            text,
  variant           text,                     -- preview / legacy
  created_at        timestamptz
)
```

**⚠️ 原则：**
```
photos表永远是"事实表"
不被Evidence Set修改
```

---

### 2️⃣ Evidence Set（核心抽象）

#### evidence_sets

```sql
evidence_sets (
  id                uuid PRIMARY KEY,
  project_id        uuid REFERENCES projects(id),
  name              text,                     -- "2-Hour Firewall – Level 1–3"
  purpose           enum(
                      'firewall',
                      'rough_in',
                      'encapsulation',
                      'permit_daily',
                      'custom'
                    ),
  status            enum('draft','reviewed','shared'),
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz,
  shared_at         timestamptz
)
```

---

#### evidence_set_items

**这是Evidence Set的"灵魂表"**

```sql
evidence_set_items (
  evidence_set_id   uuid REFERENCES evidence_sets(id),
  photo_id          uuid REFERENCES photos(id),
  order_index       int,                      -- 明确顺序
  PRIMARY KEY (evidence_set_id, photo_id)
)
```

**关键特性：**
```
✅ 一张照片可以进入多个Evidence Sets
✅ 顺序在Evidence Set内独立存在
✅ 不复制photo本体
```

---

### 3️⃣ Audit Log（合规护城河）

```sql
audit_logs (
  id                uuid PRIMARY KEY,
  entity_type       enum('photo','evidence_set'),
  entity_id         uuid,
  action            enum('capture','add','remove','share','revoke'),
  actor_id          uuid REFERENCES users(id),
  metadata          jsonb,
  created_at        timestamptz
)
```

**说明：**
```
Inspector / 法务 / 保险 = 只信这个表
```

---

### 4️⃣ Phase 1的"隐形实现方式"

**你现在不用暴露Evidence Set UI，但可以这样用：**

```
"Pick & Share" 
→ 实际是在后台创建evidence_sets

分享链接 
→ 指向evidence_set_id

Inspector/Owner打开的不是"相册"
→ 而是Evidence Set View
```

**效果：**
```
用户感觉很简单
系统实际上已经是enterprise级
```

---

## 👁️ View模型图谱（权限的真正实现）

### 核心原则（写进代码注释）

```
Users don't access data.
They access views of data.
```

---

### View类型定义（Phase 1必须支持的）

```typescript
type ViewType =
  | 'internal_full'        // GC / Owner
  | 'staff_capture'        // Employee
  | 'evidence_readonly'    // Inspector
  | 'curated_client'       // Owner / Designer
  | 'subtrade_scoped';     // Subtrade
```

---

### View → 能看到什么（真表）

| View Type | Photos | Evidence Sets | Edit | Upload | Audit |
|-----------|--------|---------------|------|--------|-------|
| **internal_full** | All | All | ✅ | ✅ | ✅ |
| **staff_capture** | Assigned project | ❌ | Own only | ✅ | ❌ |
| **evidence_readonly** | ❌ | Assigned only | ❌ | ❌ | ❌ |
| **curated_client** | ❌ | Assigned only | ❌ | ❌ | ❌ |
| **subtrade_scoped** | ❌ | Assigned only | ❌ | ❌ | ❌ |

---

### Inspector View（最关键）

**Inspector实际看到的是：**

```
/evidence/{evidence_set_id}/readonly
```

**页面内容：**
```
✅ Evidence Set name
✅ Ordered photos
✅ Timestamp / location / layer label

❌ 无上传
❌ 无评论
❌ 无导航到项目其他内容
```

**这是你们"不扯皮"的核心体验**

---

### 为什么这个View模型很重要

**它解决了5个现实问题：**

```
1. Inspector不会"乱点"
2. Owner不会看到技术噪音
3. Subtrade看不到你公司的资产
4. 员工离职 → 所有view即刻失效
5. 你可以大胆说："照片不是个人的"
```

---

## 📄 Why Inspectors Trust JSS（对外版）

### Why inspectors trust JSS

**Because evidence should explain itself.**

---

**Inspectors don't want more photos.**  
**They want clear proof.**

Proof that:
- work was done in the right order
- at the right location
- before it was concealed

**JSS is built for exactly that moment.**

---

### Built for inspection reality

In cities like Vancouver, inspections don't always happen on schedule.

```
Walls get closed.
Crews move on.
Questions come later.
```

When they do, JSS provides a complete, verifiable visual record  
— without guesswork.

---

### Evidence, not a photo dump

With JSS, inspectors don't receive hundreds of unorganized jobsite photos.

**They receive:**
```
✅ A curated evidence set
✅ Ordered by construction stage
✅ Timestamped to the second
✅ Linked to the jobsite location
✅ Captured by identifiable personnel
```

**No missing steps.**  
**No unclear sequences.**

---

### Read-only by design

Inspectors never need to upload, edit, or manage files.

**They receive a secure, read-only link that shows:**
```
✅ Exactly what was built
✅ Exactly when it was built
✅ Exactly where it was built
```

**Nothing more. Nothing less.**

---

### Trust comes from structure

**Every JSS evidence set includes:**
```
✅ Immutable timestamps
✅ Location metadata
✅ Contributor identity
✅ A clear audit trail
```

This removes ambiguity — and reduces back-and-forth.

---

### Designed to reduce disputes

**When evidence is clear:**
```
✅ Inspections move faster
✅ Rework is avoided
✅ Disputes are resolved quickly
```

**JSS doesn't argue compliance.**  
**It shows it.**

---

### When photos become proof,

inspectors trust systems that respect the process.

---

**JobSite Snap**  
Evidence-first jobsite documentation.

---

## 🚀 Phase 1 / Phase 2升级路线

### Phase 1（现在）

```
✅ Evidence Set隐形存在
✅ UI只露Pick / Share
✅ View靠link + role控制
```

---

### Phase 2（以后）

```
✅ Evidence Set成为一级对象
✅ 模板化（Firewall / Rough-in / Close-out）
✅ Inspector Portal
```

**关键：**
```
不需要迁移，不需要重构
```

---

## 💬 CPO最终收口

### JSS的真正竞争对手

```
不是CompanyCam、Notion、Dropbox

而是：
"当Inspector问你要证据时的那10分钟慌乱"

你现在这套东西
已经把那10分钟直接消灭掉了
```

---

### 到这里，JSS已经有三层结构了

```
Layer 1: SnapEvidence
→ 拍照不阻塞、不丢失

Layer 2: Self-Rescue / Smart Trace
→ 让混乱可控

Layer 3: Evidence Set
→ 让结果可交付、可审计
```

**这三层是互相支撑的，不是功能堆叠**

---

### 最后一句话（写给CEO）

```
如果一个feature weakens Evidence Sets
→ it weakens trust

如果一个feature strengthens Evidence Sets
→ it belongs in JSS
```

---

## 📋 执行清单（CTO/工程团队）

### 数据库实施

```
☐ 创建projects表
☐ 创建photos表（事实表）
☐ 创建evidence_sets表
☐ 创建evidence_set_items表
☐ 创建audit_logs表
☐ 实现View类型定义
☐ 实现权限中间件
```

---

### Phase 1功能实施

```
☐ Pick & Share → 后台创建evidence_set
☐ 分享链接指向evidence_set_id
☐ Inspector View页面（readonly）
☐ Audit Log记录所有操作
☐ 员工离职熔断机制
```

---

### Phase 2准备

```
☐ Evidence Set UI显性化
☐ 模板系统（Firewall/Rough-in等）
☐ Inspector Portal
☐ PDF导出功能
```

---

## 🎯 验收标准

### 功能验收

```
☐ 一张照片可以进入多个Evidence Sets
☐ Evidence Set内照片顺序独立存在
☐ Inspector只能看到分配给他的Evidence Set
☐ 员工离职后立即失去所有权限
☐ 所有操作都进入Audit Log
☐ 分享链接只读且不可修改
```

---

### 体验验收

```
☐ Inspector打开链接立即看到清晰时间线
☐ Owner/Client只看到精选照片
☐ Subtrade看不到其他分包的内容
☐ GC可以一键生成Inspection-ready报告
```

---

### 合规验收

```
☐ 每张照片有精确到秒的时间戳
☐ 每张照片有GPS坐标
☐ 每张照片有拍摄者身份
☐ Audit Log不可篡改
☐ 权限撤销即时生效
```

---

**文档版本：** v1.0  
**创建人：** CEO + CPO + COO  
**审核人：** CTO  
**执行人：** 产品团队 + 工程团队  
**生效日期：** 2026-02-07  
**预计完成：** Phase 1 - 4-6周

---

**当照片变成证据时，你还能不能掌控局面？** 🎯
