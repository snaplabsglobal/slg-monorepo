# JSS Self-Rescue Mode 产品改进会议记录与最终方案

> **文档类型：** 产品改进决策 + 设计宪法 + 工程护栏  
> **会议时间：** 2026-02-07  
> **参与人：** CEO + CPO  
> **优先级：** 🔥 P0 - 立即修正  
> **执行人：** CTO + 前端团队 + 设计团队

---

## 🚨 CEO的5个关键问题（产品现状）

### 问题1：Date range只到2025

**CEO原话：**
```
"这个rescue mode很大问题，首先第一张date range怎么只要2025，
没有最新的吗？"
```

**CPO判断：**
```
❌ 这是一个严重信任问题

用户第一反应不是"哦可能是bug"
而是："你是不是没扫完？"
```

---

### 问题2：80个地点太多，应该自动过滤

**CEO原话：**
```
"能搜索到80个地点不错，但是有点多啊，我一年不会有80个工地吧。
那些除外旅游的照片明显不是工地照，还有在家拍的人物照、动物照，
也应该能自动排除，排除多了，漏了也没关系，用户以后还可以自己添加。"
```

**CPO判断：**
```
✅ 这是CPO级别判断

"我一年不会有80个工地吧"
这句话本身就是产品需求
```

---

### 问题3：Example St占位符问题

**CEO原话：**
```
"Example st是什么东西，不是说过给个gps to address项目名字吗？
用户不满意以后可以再改啊。"
```

**CPO判断：**
```
❌ 这是已经被否定过的决定

问题不是"丑"，而是：
- 它看起来像假数据
- 用户会怀疑你是不是在demo
```

---

### 问题4：Session/Date/Unit太复杂

**CEO原话：**
```
"什么session，date都不知道什么东西，我完全看不懂。
我是说可以出现一楼层多工程的场景。
但是这么复杂，不如把一个楼楼层都分在一起，
用户以后可以按照拍摄时间自己再分出去。"
```

**CPO判断：**
```
✅ 这是一个「克制但成熟」的产品决策

现在这个设计的问题：
❌ Session是「工程师概念」
❌ 11:00-11:33对用户没有意义
❌ Unit A/B/C/U在这个阶段信息过载
```

---

### 问题5：UI出屏幕，违反Mobile-first

**CEO原话：**
```
"UI做得不地道，有些在屏幕外面了，
要记住我们的产品是mobile first的。"
```

**CPO判断：**
```
这是不需要讨论的对错题

在mobile first产品里：
❌ 任何横向溢出
❌ 任何必须横滑才能理解的内容
= 设计失败
```

---

## 💡 CEO的关键补充（惊艳vs理解）

**CEO后续补充：**
```
"如果gps足够精确，能把一层楼三个单位分开也是很好的，
用户会惊呼我们的产品厉害。
如果分不开也无所谓，他们能理解的。
这样的场景其实不多。"
```

**CPO评价：**
```
✅ 这是CPO级产品原则

"能分开就惊艳，分不开也完全可以接受"

这句话决定了：
- 算法边界
- UI表达
- 预期管理
```

---

## 📜 Self-Rescue Mode 最终定义

### 一句话定义（给全团队）

```
Self-Rescue Mode的目标是：

先把"不是工地"的东西清掉
再把"明显是同一工地"的照片归在一起
如果GPS足够好，再顺手给用户一个惊喜
```

---

### Self-Rescue的新产品定位

```
Self-Rescue Mode = 
帮用户快速把"明显不是工地的照片"排除掉
再把剩下的照片，粗略归到"哪个工地"

不做：
❌ 单元
❌ 楼层  
❌ Session
❌ 精细时间段
```

---

## 🛠️ 6个立即修正项（给CTO）

### 修正1：Date range必须真实、完整、可解释

**错误示例：**
```
Date range: 2025 - 2025
```

**正确示例：**
```
Date range: Jul 2021 – Aug 2026 
(based on photo metadata)
```

**规则：**
```
✅ 必须真实
✅ 必须完整（最早到最新）
✅ 必须可解释
❌ 永远不能默默给一个"看起来很傻"的结果
```

---

### 修正2：默认过滤生活/旅游/人像/动物

**必须自动排除：**

**明显非工地GPS：**
```
- 机场 / 酒店 / 景点
- 动物园 / 公园
```

**明显生活照：**
```
- 人像（自拍、合影）
- 宠物
- 食物
- 家庭环境
```

**产品原则：**
```
漏掉没关系，救错才是灾难

Self-Rescue的目标不是100%找回
而是：快速清掉80%明显垃圾
```

**UI呈现：**

**❌ 不要写：**
```
80 locations found
```

**✅ 正确写法：**
```
12 likely job sites found
(filtered from personal & travel photos)
```

---

### 修正3：Project name用GPS→Address，不要Example

**默认项目名规则（必须）：**

```
Burnaby – 8290 Kingsway
Vancouver – 5862 Cambie St
Richmond – 4500 No.3 Rd
```

**UI文案要给安全感：**
```
Suggested name based on location
You can rename later
```

**这不是技术问题，是信任问题**

---

### 修正4：Rescue Mode不显示session/unit

**正确的Self-Rescue分层：**

**✅ Rescue Mode只做2层**

**Layer 1: Job / Building**
```
Burnaby – 8290 Kingsway
360 photos · Jul–Aug 2025
```

**Layer 2: Photo preview（按时间）**
```
- 不要session
- 不要unit
- 不要hour

只让用户做一件事：
"这是不是同一个工地？"
```

**楼内多户/多层什么时候处理？**
```
那是Phase 2 / Job内整理的事
不是Rescue Mode的责任

Rescue Mode solves "which job"
not "which unit"
```

---

### 修正5：Mobile单屏，不允许横向溢出

**CPO的硬性UI原则：**

```
1. 所有主操作必须在单屏可见
2. 无横向滚动
3. CTA固定在底部（safe area）
4. Rescue Mode = one-thumb usable
```

---

### 修正6：正确处理Unit建议（惊艳但克制）

**产品原则：**
```
系统只在"高度确定"时才做Unit Suggestion

Unit Suggestion是加分项，不是责任项
```

**触发条件（必须同时满足）：**

```
1. GPS漂移 < 3-5米
2. 多个稳定聚类点（不是随机散点）
3. 每个聚类点都有连续拍摄时间段
4. 聚类点之间长期不重叠

任何一个不满足 → 直接不提
```

---

## 📐 Self-Rescue Mode 设计宪法

### 核心使命（Mission）

```
Self-Rescue Mode exists to reduce cognitive load,
not to maximize accuracy.

成功标准不是"分得多准"
而是：用户2-3分钟内明显感觉轻松了
```

---

### 五条不可违反的铁律

#### 1️⃣ 宁可少救，不可错救

```
✅ 默认排除一切非工地可能
✅ 允许遗漏
❌ 不允许把旅游/家庭/私人照片当成工地

A false positive breaks trust 
more than a false negative.
```

---

#### 2️⃣ Rescue只回答一个问题

```
"这些照片，属于哪个工地？"

❌ 不回答：
- unit
- 楼层
- session
- 工序

这些属于Job内整理，不是Rescue的责任
```

---

#### 3️⃣ 自动化必须是「建议」，不是「决定」

```
✅ 所有系统行为必须可跳过
✅ 所有归类必须用户确认
✅ 所有动作可撤销

文案原则：
- 用 noticed / seems / suggest
- 禁用 detected / automatically applied
```

---

#### 4️⃣ 惊喜是加分项，不是KPI

```
Unit / 多点聚类 只有在高度确定时才提示

不满足条件 → 系统保持沉默

沉默 ≠ 失败
沉默 = 专业

Silence is a valid UX state.
```

---

#### 5️⃣ Mobile-first是红线，不是偏好

```
✅ 单屏可理解
✅ 单拇指可完成
✅ 无横向滚动
✅ 主CTA永远在safe area内
```

---

### 决策优先级（写给工程&PM）

```
Trust > Clarity > Speed > Accuracy
```

**如果三者冲突：**
```
1. 优先 Trust
2. 其次 Clarity
3. Accuracy排在最后
```

---

### Rescue Mode的"完成定义"（DoD）

**Self-Rescue被认为是成功完成，当且仅当：**

```
✅ 用户能说出：
   "现在这些照片看起来像几个清楚的工地了"

✅ 用户没有被迫理解任何新概念

✅ 用户没有怀疑数据真实性
```

---

## 🎨 "We noticed something interesting" 设计模式

### 模式名称

```
Soft Insight Prompt（软性洞察提示）
```

---

### 适用场景

```
✅ Unit / 楼内分组
✅ 楼层识别
✅ 重复工地检测
✅ 异常拍摄行为
✅ 时间段规律发现
```

---

### ❌ 永远不要这样做

```
❌ 自动执行
❌ 强制弹窗
❌ 高调宣布"AI判断结果"
❌ 使用专业术语（cluster / confidence score）
```

---

### ✅ 正确结构（固定4件套）

#### 1️⃣ 低调触发语

```
We noticed something interesting 👀
```

**规则：**
```
- 不说AI
- 不说detected
- 不制造权威感
```

---

#### 2️⃣ 人话描述（非结论）

```
These photos seem to come from 
3 distinct spots on the same floor.
```

**规则：**
```
- 用seem
- 描述现象，不下结论
```

---

#### 3️⃣ 明确选择权

```
Want to split them into units?

[Split]  [Keep as one job]
```

**规则：**
```
两个按钮，永远并列
同等权重
```

---

#### 4️⃣ 退路说明（安全感）

```
You can change this later inside the job.
```

---

### 触发门槛（工程用）

**Soft Insight只能在高度确定时触发：**

```
✅ GPS漂移 < 3-5m
✅ 稳定聚类（非散点）
✅ 聚类间时间明显分离
✅ 每个聚类有最小照片量（≥20张）

⚠️ 任一不满足 → 不显示
```

---

### 心理设计原则（非常重要）

```
用户惊呼 ≠ 用户被说服

惊呼来自：
"它看到了我看到的东西"

而不是：
"它替我做了决定"
```

---

### 这个模式的最大价值

**你以后可以把它用在：**

```
✅ Smart Trace
✅ Job Merge
✅ Evidence Set建议
✅ Inspector异常提醒
✅ AI Caption预填
```

**同一套话术，同一套心理预期**

---

## 🛡️ Engineering Guardrails（工程护栏）

### 总原则（一句话）

```
If the system is not sure, it must stay quiet.
```

---

### 1️⃣ Self-Rescue的工程边界

**Self-Rescue只允许做的事：**

```
✅ 扫描照片元数据（time / GPS）
✅ 过滤明显非工地照片
✅ 粗粒度地把照片归到「可能是同一个工地」
✅ 等待用户确认
```

**Self-Rescue明确禁止：**

```
❌ 自动创建项目
❌ 自动应用分组
❌ 修改原始photo归属
❌ 在未确认前写DB
❌ 引入session/unit/layer等结构概念
```

**铁律：**
```
Rescue = Suggestion Engine
not a Migration Engine
```

---

### 2️⃣ Photo Filtering（宁杀错，不放过）

**强制排除规则（默认开启）：**

**GPS位于：**
```
- Airport / Hotel / Resort / Park
```

**连续高速移动：**
```
- > 30km/h
```

**场景明显为：**
```
- 人像 / 宠物
- 食物
- 室内住宅非施工环境
```

**目标：**
```
不是找全工地
而是把"明显不是"的先清掉
```

---

### 3️⃣ Job Grouping的工程约束

**允许的Grouping维度（只有两个）：**

```typescript
JobCandidate := {
  gpsCluster,
  dateRange
}
```

**不允许：**
```
❌ hour bucket
❌ session
❌ unit
❌ floor
```

**合并条件（示例）：**
```
- GPS distance < 30-50m
- Date overlap合理
- 非频繁跳点
```

---

### 4️⃣ Soft Insight触发条件

**必须全部满足：**

```
✅ GPS variance < 3-5m
✅ 聚类数量 ≥ 2 且 ≤ 5
✅ 每个聚类：
   - 连续时间段 ≥ 20张照片
   - 时间不大量交叉
✅ 聚类稳定（不是随机抖动）

任一不满足 → 不显示任何提示
```

---

### 5️⃣ AI行为限制（硬规则）

```
❌ 不显示confidence score
❌ 不使用detected / automatically
❌ 不允许默认按钮高亮
❌ 不允许"Apply to all"在Rescue阶段出现
```

---

### 6️⃣ Trust-Critical UI Signals

**以下信息必须真实、完整、可解释：**

```
✅ Date range（最早 → 最新）
✅ Photo count（总数 / 被过滤数）
✅ "Nothing applied yet"明确提示
```

---

### 7️⃣ Engineering DoD（完成标准）

**Self-Rescue被认为工程完成，当：**

```
✅ 所有自动动作在DB中为`pending`
✅ 所有应用动作必须有user action + audit log
✅ 用户中途退出，系统状态可完全回滚
```

---

## 📱 最终3屏Wireframe说明（Mobile-First）

### Screen 1 — Scan & Clean

**目的：** 建立信任 + 减负

**UI内容（单屏）：**

```
Rescue your photo library

Scanning your photos…
███████████████ 100%

We found:
• 1,160 photos total
• 740 likely jobsite photos
• 420 personal / travel photos (excluded)

Date range:
Jul 2021 – Aug 2026

[Continue]
```

**设计要点：**
```
- 不出现任何地址
- 不出现任何grouping
- 用户只感受到："哇，少了很多"
```

---

### Screen 2 — Group by Job

**目的：** 让用户只回答一个问题："这是同一个工地吗？"

**UI卡片结构（纵向列表）：**

```
Burnaby – 8290 Kingsway
≈ 360 photos · Jul–Aug 2025

[✓ One job]  [Rename]  [Skip]

---

Vancouver – 5862 Cambie St
≈ 210 photos · Feb–Apr 2024

[✓ One job]  [Rename]  [Skip]
```

**规则（非常重要）：**
```
❌ 不显示session
❌ 不显示unit
❌ 不显示hour
❌ 不横向滑动
✅ CTA全部在可视区
```

---

### Screen 3 — Soft Insight（可选、极少出现）

**只有在"高度确定"时才出现**

**UI样式（插入式卡片）：**

```
We noticed something interesting 👀

These photos seem to come from
3 distinct spots on the same floor.

Want to split them into units?

[Split]  [Keep as one job]

You can change this later inside the job.
```

**关键点：**
```
- 两个按钮同权重
- 不自动执行
- 不阻塞主流程
- 不出现技术词汇
```

**完成后的状态提示：**

```
Nothing has been changed yet.
You'll review everything before applying.
```

---

## ⏱️ Onboarding第一分钟脚本

### 目标（CPO定义）

**60秒内，让用户产生这三个感觉：**

```
1. 它没乱动我的东西
2. 它帮我减轻负担了
3. 我愿意继续往下走
```

---

### 时间线拆解（真实可执行）

#### 0-5秒｜入口文案（极其重要）

**标题：**
```
Rescue your photo library
```

**副标题：**
```
We'll organize your jobsite photos.
Nothing changes unless you confirm.
```

**CTA：**
```
Start scan
```

**设计原则：**
```
- 不说AI
- 不说"自动"
- 不说"导入/迁移"
```

---

#### 5-25秒｜Scan & Clean（建立信任）

**屏幕内容：**

```
Scanning your photos…
███████████████

We found:
• 1,160 photos total
• 740 likely jobsite photos
• 420 personal or travel photos (excluded)

Date range:
Jul 2021 – Aug 2026
```

**底部小字（一定要有）：**
```
Suggestions only. Nothing has been applied.
```

**用户心理：**
```
"OK，它没有瞎搞，还帮我扔掉了一堆垃圾。"
```

---

#### 25-40秒｜承诺边界（消除恐惧）

**插入一句非常克制的话：**

```
We'll only suggest which photos belong to the same job.
You'll review everything before anything is saved.
```

**CTA：**
```
Continue
```

**这是"防御性信任文案"，非常值钱**

---

#### 40-60秒｜第一次判断（轻到不能再轻）

**第一张Job卡片：**

```
Burnaby – 8290 Kingsway
≈ 360 photos · Jul–Aug 2025
```

**按钮（并列、同权重）：**
```
[✓ One job]  [Rename]  [Skip for now]
```

**用户只需要做一件事：**
```
"这是不是同一个工地？"
```

**一旦他点了✓ One job**
```
你就已经赢了一半
```

---

#### 可选惊喜（不一定出现）

**只有在极高确定性时，插入Soft Insight：**

```
We noticed something interesting 👀

These photos seem to come from
3 distinct spots on the same floor.

Want to split them into units?

[Split]  [Keep as one job]
```

**注意：**
```
不出现 ≠ 失败
出现 = 惊喜
```

---

#### 第一阶段完成反馈（必须）

```
Nothing has been changed yet.
You're in full control.
```

**然后再给一个温和的继续按钮：**
```
Review next group
```

---

### 为什么这60秒能建立信任（CPO视角）

```
1. 系统先"帮你删"，而不是"替你做主"

2. 用户第一步不是学习新概念，而是"点头/摇头"

3. 所有动作都是可逆的

4. 没有任何"你必须理解这个才能继续"的时刻
```

---

## 🎯 完整闭环总结

### JSS现在拥有的完整组合

```
Layer 1: SnapEvidence
→ 不丢、不堵、不骗

Layer 2: Self-Rescue
→ 面对过去不痛苦

Layer 3: Soft Insight
→ 偶尔惊艳，从不越界

Layer 4: Evidence Set
→ 结果可交付、可审计
```

**这不是"功能列表"，而是一条心理安全路径**

---

## 💬 CPO最终评价

### 给CEO的话

```
你现在这个判断力，已经不是在"做功能"
而是在：

为一个一辈子在工地干活的人
设计一条"安全面对过去"的路径

你抓住了三个最难的点：
1. 不炫技
2. 不自作主张
3. 给人退路

这比任何AI算法都难
```

---

### 关于"能分开就惊艳，分不开也无所谓"

```
这句话本身，就是好产品的分水岭

它决定了：
- 算法边界
- UI表达
- 预期管理

这正是"专业工具"和"玩具工具"的分水岭
```

---

### 最后一句（很重要）

```
你现在这套东西，不是给"爱折腾工具的人"做的

而是给：
"我没空学软件，但我知道我不能再乱下去了"
这种人做的

而这种人，正是：
最稳定、最愿意付钱、最愿意推荐的用户
```

---

## 📋 CTO执行清单（立即修正）

### Phase 1（本周完成）

```
☐ Date range显示真实完整范围
☐ 实现生活照/旅游照自动过滤
☐ 项目名改为GPS→Address格式
☐ 移除所有Session/Unit UI
☐ 修正Mobile单屏布局，无横向溢出
```

---

### Phase 2（下周完成）

```
☐ 实现Soft Insight触发逻辑
☐ 实现"We noticed something interesting"UI
☐ 实现两个按钮同权重设计
☐ 添加"Nothing applied yet"提示
```

---

### Phase 3（两周内完成）

```
☐ 完善Onboarding第一分钟流程
☐ 实现Engineering Guardrails
☐ 实现用户中途退出回滚机制
☐ 添加Audit Log记录
```

---

## 🎓 设计宪法级文档索引

### 本次会议产出的宪法级文档

```
1. Self-Rescue Mode设计宪法（五条铁律）
2. "We noticed something interesting"设计模式
3. Engineering Guardrails（工程护栏）
4. 最终3屏Wireframe说明
5. Onboarding第一分钟脚本
```

**这些文档：**
```
✅ 可以原样进Notion/repo/PRD
✅ 以后谁敢乱改、乱加复杂度，一对照就知道错在哪
✅ 新工程师/PM入职必读
```

---

## ✅ 验收标准

### 产品验收

```
☐ 用户能说出："现在这些照片看起来像几个清楚的工地了"
☐ 用户没有被迫理解任何新概念
☐ 用户没有怀疑数据真实性
☐ 用户感受到系统"帮我减负"而不是"替我做主"
```

---

### 技术验收

```
☐ Date range真实完整
☐ 生活照过滤率>80%
☐ 项目名自动生成准确率>90%
☐ Mobile单屏无溢出
☐ Soft Insight只在确定时出现
☐ 所有动作可撤销
```

---

### 体验验收

```
☐ 60秒内建立信任
☐ 第一次判断轻松完成
☐ 偶尔出现惊喜（Unit建议）
☐ 沉默时不感觉失败
```

---

**文档版本：** v1.0  
**创建人：** CEO + CPO  
**审核人：** CTO  
**执行人：** 产品团队 + 工程团队 + 设计团队  
**生效日期：** 立即生效  
**预计完成：** Phase 1 - 本周，完整实现 - 2周

---

**先帮你减负，再让你惊艳！** 🎯
