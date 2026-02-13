# JSS Magic Import - 完整实施方案（MVP）

> **文档类型：** 产品规划 + 工程执行 + 验收规范  
> **对标产品：** CompanyCam  
> **核心原则：** Project-first · User-confirmed · Zero-magic  
> **创建时间：** 2026-02-08  
> **优先级：** 🔥 P0 - MVP核心功能  
> **预计完成：** 24小时

---

## 📋 一句话目标

```
在Job Details内实现CompanyCam级别的Magic Import：
选Job → 选时间 → 看候选 → 勾选 → 一次性导入 → Done
```

---

## 🎯 MVP范围定义

### ✅ 做什么

```
1. 在Job Details页面提供Import功能
2. 基于Job地址 + 时间范围找照片
3. 用户预览并选择要导入的照片
4. 一次性批量导入到Job
```

---

### ❌ 明确不做（冻结声明）

```
❌ Rescue功能
❌ AI自动分类
❌ 自动整理
❌ 全局扫描
❌ 多半径判断
❌ 无GPS自动放行
```

**原则：**
```
宁愿简单但可信
也不愿聪明但不稳定
```

---

## ⏱️ 24小时工程清单

### 0-2小时：基础前置

**CTO要做：**
```
☐ 确认jobs表有address字段
☐ 确认jobs表有lat/lng字段
☐ Job Details页面可获取job.id/lat/lng
```

**验收标准：**
```
☐ 随便打开一个Job
☐ DevTools console能看到job.lat/lng
☐ 值是数值，不是null
```

**常见问题：**
```
❌ 地址没强制标准化
❌ 老Job没lat/lng

→ 修法：Job没坐标 → 禁用Import
→ 提示："Add address to use Magic Import"
```

---

### 2-4小时：UI入口

**CTO要做：**
```
☐ 在Job Details页面加按钮："Import photos"
☐ 点击打开modal/bottom sheet
```

**MVP规则：**
```
❌ 不放全局入口
❌ 不放sidebar
❌ 不出现Rescue/Organizer字眼
```

**验收标准：**
```
☐ 进入Job能看到Import
☐ 其他地方找不到Import
```

---

### 4-6小时：时间范围选择

**CTO要做：**
```
☐ 提供必须选择的选项：
  ○ Last 30 days
  ○ Last 12 months

☐ 没选 → 禁用下一步

☐ 显示文案（逐字）：
  "We'll only look at photos taken within 
   this time range."
```

**验收标准：**
```
☐ 不选时间 → 不能继续
☐ 选时间 → Next可点
☐ 文案清楚出现
```

**常见错误：**
```
❌ 默认帮用户选（不允许）
❌ 文案没写清楚"only look at"
```

---

### 6-10小时：Preview API（核心）

**CTO要做：**
```
新增API：POST /api/jobs/:jobId/import/preview

过滤逻辑（严格按顺序）：
1. 时间过滤：
   taken_at BETWEEN now - range AND now

2. GPS必须存在：
   photo.lat IS NOT NULL

3. 距离过滤：
   distance(photo, job) <= R
   （R固定100-150m）
```

**MVP禁止：**
```
❌ AI判断
❌ 聚类算法
❌ 多半径
❌ 无GPS自动放行
```

**验收标准：**
```
☐ Network看到preview请求
☐ Response返回photo list
☐ 数据肉眼合理（不是几千张乱图）
```

**常见错误：**
```
❌ 忘了时间过滤 → 扫太多
❌ 没做距离过滤 → 把隔壁工地扫进来
```

---

### 10-13小时：候选照片预览UI

**CTO要做：**
```
☐ Grid/list展示候选照片
☐ 每张照片显示：
  - 缩略图
  - 拍摄日期
☐ 默认全选
☐ 用户可取消勾选
```

**验收标准：**
```
☐ 默认看到全选
☐ 能快速取消几张"明显不对的"
☐ 没有自动隐藏/自动分类
```

**不允许：**
```
❌ 系统帮你自动剔除
❌ 自动分folder
```

---

### 13-16小时：Confirm API（唯一写入）

**CTO要做：**
```
新增API：POST /api/jobs/:jobId/import/confirm

行为（必须幂等）：
UPDATE job_photos
SET job_id = :jobId
WHERE id IN (:photo_ids)
  AND job_id IS NULL;
```

**验收标准（一定要亲自）：**
```
☐ 点Import X photos
☐ 跳回Job
☐ 照片数量立刻增加
☐ 再点一次Confirm：
  - 不重复
  - 不报错
```

---

### 16-18小时：Import成功反馈

**CTO要做：**
```
☐ 显示明确成功提示：
  "X photos imported to [Job Name]"

☐ 自动回到Job Details（或直接刷新）
```

**验收标准：**
```
☐ 用户知道"发生了什么"
☐ 不会怀疑"到底导没导"
```

---

### 18-20小时：边界 & 防翻车

**CTO要做：**
```
☐ Job没地址 → Import按钮disabled

☐ Preview返回0：
  显示："No photos found within this range."
  
☐ 不报错、不500
```

**验收标准：**
```
☐ 故意选一个很远的时间段
☐ UI正常，不恐慌
```

---

### 20-24小时：自用验收（CEO亲测）

**按真实场景走一遍：**
```
☐ 新建一个Job（真实地址）
☐ Import last 30 days
☐ 看候选是否"像这个工地"
☐ 取消2-3张
☐ 一次性导入
☐ 进Job看时间线
```

**成功标准：**
```
"我愿意以后一直用这个方式导历史照片"
```

---

## 📝 GitHub Issue/PR Checklist模板

### Issue目标（必须先写清楚）

**What this issue delivers:**

```
☐ 在Job Details页面提供Magic Import功能
☐ 用户可基于Job地址+时间范围导入历史照片
☐ 系统不自动做任何归类或判断
☐ 用户始终掌控导入范围与结果
```

**超出以上4点 → 拆分Issue**

---

### 功能Checklist（必须全部勾选）

#### 1️⃣ Job前置条件

```
☐ Job必须有标准地址
☐ Job必须有lat/lng
☐ Job没有地址时：
  - Import按钮disabled
  - 明确提示："Add address to use Magic Import"
```

---

#### 2️⃣ UI入口（单一入口）

```
☐ 入口只存在于Job Details页面
☐ 按钮文案："Import photos"
☐ 未在sidebar/全局工具中暴露
```

---

#### 3️⃣ 时间范围选择（强制）

```
☐ 用户必须选择时间范围：
  - Last 30 days
  - Last 12 months

☐ 未选择时间范围时：
  - Next/Continue按钮disabled
  - 明确显示文案（逐字）：
    "We'll only look at photos taken within 
     this time range."
```

---

#### 4️⃣ Preview API（只计算，不写）

```
☐ Endpoint：POST /api/jobs/:jobId/import/preview

☐ 过滤顺序正确：
  1. 按时间范围过滤
  2. 仅包含有GPS的照片
  3. 距离Job ≤ 固定半径（100-150m）

☐ Preview不写数据库
☐ Preview返回候选照片列表（可为空）
```

---

#### 5️⃣ 候选照片预览UI

```
☐ 使用grid/list展示
☐ 每张照片显示：
  - 缩略图
  - 拍摄日期
☐ 所有照片默认选中
☐ 用户可取消勾选任意照片
☐ 系统不自动剔除、不自动分组
```

---

#### 6️⃣ Confirm API（唯一写入点）

```
☐ Endpoint：POST /api/jobs/:jobId/import/confirm

☐ Confirm行为：
  - 批量更新job_photos.job_id
  - 仅更新job_id IS NULL的照片

☐ 幂等性：
  - 重复confirm不重复导入
  - 不报错
```

---

#### 7️⃣ 成功反馈与跳转

```
☐ 显示成功提示：
  "X photos imported to [Job Name]"

☐ 自动回到Job Details或刷新Job内容
☐ 用户能立即看到新增照片
```

---

#### 8️⃣ 空态 & 防翻车

```
☐ Preview返回0张照片时：
  显示："No photos found within this range."

☐ 全流程：
  - 不出现500
  - 不出现scan_failed
  - 不出现loading > 1秒的假进度
```

---

### 明确禁止（PR Review必须检查）

```
❌ 未引入Rescue/Organizer/Cleanup相关逻辑
❌ 未扫描用户全量相册
❌ 未自动分类/自动分组
❌ 未修改系统相册结构
❌ 未新增AI依赖或ai_classification字段
```

---

### 手动验收步骤（Reviewer必走）

```
1. 创建一个有地址的Job
2. 点击Import photos
3. 选择Last 30 days
4. 看到合理数量的候选照片
5. 取消勾选2-3张
6. 点击Import
7. 回到Job，确认照片已加入
8. 再点一次Import/Confirm，确保不重复导入
```

**若任一步不清楚、犹豫、或"不敢点" → 未通过**

---

### 设计确认（Reviewer勾选）

```
☐ 用户清楚系统"看了什么、没看什么"
☐ 用户清楚"导入 ≠ 自动整理"
☐ 用户始终拥有最终决定权
```

---

### MVP冻结声明（必须保留）

```
本PR只实现Magic Import MVP。
Rescue / AI / 自动整理为Post-MVP议题，
不得在本PR中引入。
```

---

## 💬 UI文案逐字稿（可直接复制）

### ① Job Details页面入口

**按钮文案：**
```
Import photos
```

**无地址时（disabled状态）：**
```
按钮：Import photos (disabled)

辅助文案：
Add a job address to import photos.
```

---

### ② Import Modal/Bottom Sheet（Step 1）

**标题：**
```
Import photos to [Job Name]
```

**副标题：**
```
Bring existing photos into this job.
```

---

### ③ 时间范围选择（Step 2）

**Section标题：**
```
Choose a time range
```

**选项：**
```
○ Last 30 days
○ Last 12 months
```

**说明文案（⚠️ 必须逐字）：**
```
We'll only look at photos taken within this time range.
```

**未选择时按钮状态：**
```
[ Continue ]  (disabled)
```

---

### ④ 扫描/Preview状态

**Loading文案（不超过1秒）：**
```
Finding photos near this job…
```

**❌ 不要用：**
```
❌ Analyzing
❌ Scanning your library
❌ Processing photos
```

---

### ⑤ 候选照片预览（Step 3）

**标题：**
```
Photos found near this job
```

**副标题（动态）：**
```
We found X photos taken near [Job Name].
```

**每张照片下方信息：**
```
Taken on Mar 12, 2026
```

**选择说明：**
```
All photos are selected by default. 
Uncheck any you don't want to import.
```

---

### ⑥ 空态（Preview = 0）

**主文案：**
```
No photos found
```

**说明文案：**
```
We couldn't find any photos near this job 
within the selected time range.
```

**行动建议：**
```
Try a different time range.
```

---

### ⑦ 确认导入（Step 4）

**按钮文案（动态）：**
```
Import X photos
```

**按钮下方小字：**
```
Imported photos will be added to this job.
```

---

### ⑧ 导入成功反馈

**成功提示（Toast/Inline）：**
```
X photos imported to [Job Name]
```

**次级提示：**
```
You can find them in the job timeline.
```

---

### ❌ 文案黑名单（不应该出现）

**PR Review时Ctrl+F查这些词：**

```
❌ Rescue
❌ Cleanup
❌ Fix
❌ AI
❌ Automatically
❌ We think these photos belong to…
```

**一旦出现 → 心智跑偏**

---

## 🎨 UI Flow Wireframe（文字版）

### Screen A — Job Details（入口）

```
┌──────────────────────────────────────┐
│ Job Details: [Job Name]              │
│ Address: [Standard Address]          │
│                                      │
│ [ Import photos ]                    │
│                                      │
│ Photos Timeline (existing)           │
│  - ...                               │
└──────────────────────────────────────┘
```

**状态A0：Job没地址**
```
[ Import photos ]  (disabled)
Add a job address to import photos.
```

**验收点：**
```
☐ 没地址：按钮不可点 + 文案出现
☐ 有地址：按钮可点
```

---

### Screen B — Import Sheet（时间范围）

```
┌──────────────────────────────────────┐
│ Import photos to [Job Name]      [X] │
│ Bring existing photos into this job. │
│                                      │
│ Choose a time range                  │
│  ( ) Last 30 days                    │
│  ( ) Last 12 months                  │
│                                      │
│ We'll only look at photos taken      │
│ within this time range.              │
│                                      │
│                  [ Continue ] (dis)  │
└──────────────────────────────────────┘
```

**交互：**
```
点选其中一个time range后：
→ Continue变为enabled
```

**验收点：**
```
☐ 默认不选
☐ 不选不能继续
☐ 文案必须存在
```

---

### Screen C — Finding...（Preview加载）

```
┌──────────────────────────────────────┐
│ Import photos to [Job Name]      [X] │
│                                      │
│ Finding photos near this job…        │
│                                      │
│ (loading spinner, subtle)            │
└──────────────────────────────────────┘
```

**验收点：**
```
☐ 网络慢也不会出现假"进度条"
☐ 超过1-2秒：可加"Still working…"
☐ 但不要百分比
```

---

### Screen D — Preview List（选择照片）

```
┌──────────────────────────────────────┐
│ Photos found near this job       [X] │
│ We found X photos taken near job.    │
│                                      │
│ [Select all] [Deselect all]          │
│                                      │
│  ☑ [thumb]  Taken on Mar 12, 2026    │
│  ☑ [thumb]  Taken on Mar 12, 2026    │
│  ☐ [thumb]  Taken on Mar 11, 2026    │
│  ...                                 │
│                                      │
│ All photos are selected by default.  │
│ Uncheck any you don't want to import.│
│                                      │
│         [ Import X photos ] (enabled)│
└──────────────────────────────────────┘
```

**交互细节：**
```
☐ 默认全选
☐ 单张可取消
☐ Import按钮数量实时变化
☐ 如果用户全取消 → Import按钮disabled
```

**验收点：**
```
☐ 能快速剔除明显不对的照片
☐ 不自动分类、不自动隐藏
```

---

### Screen E — Empty State（Preview=0）

```
┌──────────────────────────────────────┐
│ No photos found                  [X] │
│ We couldn't find any photos near     │
│ this job within the selected time    │
│ range.                               │
│                                      │
│ [ Change time range ]                │
└──────────────────────────────────────┘
```

**交互：**
```
Change time range → 回到Screen B
```

**验收点：**
```
☐ 空态是"正常结果"，不是error
☐ 不出现scan_failed
```

---

### Screen F — Importing...（Confirm写入）

```
┌──────────────────────────────────────┐
│ Importing…                           │
│ Adding X photos to [Job Name]        │
│ (spinner)                            │
└──────────────────────────────────────┘
```

**验收点：**
```
☐ 成功后立刻进入Success
☐ 不要停太久
```

---

### Screen G — Success Toast + 回到Job

**Toast（或inline）：**
```
✓ X photos imported to [Job Name]
You can find them in the job timeline.
```

**随后：**
```
- 自动关闭modal
- 回到Job Details
- 刷新照片列表
```

**验收点：**
```
☐ 用户明确知道导入成功
☐ Job timeline立刻看到新增照片
```

---

## 📸 一页截图式规范（验收对照）

### 【截图①】Job Details页面（入口）

```
┌──────────────────────────────────────┐
│ Job: 5862 Cambie St                  │
│ Address: 5862 Cambie St, Vancouver   │
│                                      │
│ [ Import photos ]   ← (①)            │
│                                      │
│ Photos                               │
│  • …                                 │
└──────────────────────────────────────┘
```

**验收点：**
```
1. 【①】Import photos只出现在Job Details
2. Job没地址 → 按钮disabled + 提示
   "Add a job address to import photos."
3. Sidebar/全局看不到Import
```

---

### 【截图②】Import – 时间范围选择

```
┌──────────────────────────────────────┐
│ Import photos to 5862 Cambie St  [X] │
│ Bring existing photos into this job. │
│                                      │
│ Choose a time range                  │
│  ( ) Last 30 days                    │
│  ( ) Last 12 months                  │
│                                      │
│ We'll only look at photos taken      │
│ within this time range.              │
│                                      │
│                  [ Continue ] (②)    │
└──────────────────────────────────────┘
```

**验收点：**
```
4. 【②】未选择时间 → Continue不可点
5. 文案必须逐字存在
6. 不允许默认选中任何选项
```

---

### 【截图③】Preview Loading

```
┌──────────────────────────────────────┐
│ Finding photos near this job…        │
│ (spinner)                            │
└──────────────────────────────────────┘
```

**验收点：**
```
7. Loading < 1-2秒
8. ❌ 不出现进度条/百分比
9. ❌ 不出现"Scanning your library"
```

---

### 【截图④】候选照片预览（核心）

```
┌──────────────────────────────────────┐
│ Photos found near this job       [X] │
│ We found 142 photos taken near job.  │
│                                      │
│ ☑ [thumb]  Taken on Mar 12, 2026     │
│ ☑ [thumb]  Taken on Mar 12, 2026     │
│ ☐ [thumb]  Taken on Mar 11, 2026     │
│                                      │
│ All photos are selected by default.  │
│ Uncheck any you don't want to import.│
│                                      │
│        [ Import 141 photos ] (③)     │
└──────────────────────────────────────┘
```

**验收点：**
```
10. 默认全部选中
11. 可以单张取消勾选
12. 【③】按钮数量实时变化
13. ❌ 系统不自动剔除
14. ❌ 不显示AI/距离/判断理由
```

---

### 【截图⑤】空态（Preview = 0）

```
┌──────────────────────────────────────┐
│ No photos found                      │
│ We couldn't find any photos near     │
│ this job within the selected time    │
│ range.                               │
│                                      │
│ [ Change time range ]                │
└──────────────────────────────────────┘
```

**验收点：**
```
15. 空态是"正常结果"，不是error
16. ❌ 不出现scan_failed/error code
17. Change time range能回到步骤②
```

---

### 【截图⑥】导入中

```
┌──────────────────────────────────────┐
│ Importing…                           │
│ Adding 141 photos to this job        │
└──────────────────────────────────────┘
```

**验收点：**
```
18. 只有这一处写DB
19. 无长时间等待/无假进度
```

---

### 【截图⑦】成功 + 回到Job

```
✓ 141 photos imported to 5862 Cambie St
You can find them in the job timeline.

（随后显示Job Photos Timeline）
```

**验收点：**
```
20. 明确成功反馈
21. 自动回到Job
22. Timeline立刻看到新照片
```

---

## 🗺️ 标准地址列表问题（重要前置）

### 问题描述

```
"用户一边输入地址的时候就一边给建议那种列表"
```

---

### 解决方案

**✅ 使用Google Places Autocomplete**

```
这是行业标准答案
CompanyCam、Procore、Uber、Airbnb都用这套
```

---

### 为什么是硬前置条件？

**Magic Import的数学前提：**
```
distance(photo_gps, job_gps) <= R
```

**因此Job必须有：**
```
✓ 可信的(lat, lng)
✓ 不能是用户随便打的
✓ 不能是模糊字符串
✓ 不能是"温哥华某某街"
```

---

### MVP正确做法

**用户体验：**
```
用户输入：5862 Cam…
  ↓
系统显示建议列表：
  • 5862 Cambie St, Vancouver, BC, Canada
  • 5862 Cambie Cres, Richmond, BC, Canada
  • 5862 Cambie Rd, Burnaby, BC, Canada
  ↓
用户必须点选其中一条
（不是直接Enter）
```

---

### 保存到数据库的字段

```
job.address_text        // 人类可读
job.place_id            // Google place_id（关键）
job.lat                 // 纬度
job.lng                 // 经度
job.formatted_address   // 格式化地址
```

**⚠️ place_id很重要：**
```
以后做去重、对齐permit、地图、智能建议
全都靠它
```

---

### 最小实现（24小时内能完成）

```
☐ 使用Google Places Autocomplete
☐ 限制类型：address
☐ 限制国家：CA, US
☐ 禁止用户跳过选择
```

**UI文案（非常重要）：**
```
在地址输入框下面加一行小字：
"Please select an address from the list."

→ 这句话能挡住90%的脏数据
```

---

### 千万别做的事

```
❌ 自建地址库
❌ 自己调用Geocoding API解析字符串
❌ 允许用户随便输入然后后台try-catch
```

**这些都会导致：**
```
→ 坐标漂移
→ Import出错
→ 后面所有"智能"都塌
```

---

### CPO级别判断标准

```
如果CompanyCam / Uber / Airbnb都没自己做，
那你也不该在MVP阶段自己做。

地址标准化，正是典型例子。
```

---

### 明确建议

**Job创建/编辑页：**
```
☐ 强制Google Places Autocomplete
☐ 禁止free text address
```

**Magic Import：**
```
☐ 没有标准地址 → 按钮disabled
```

**place_id / lat / lng：**
```
☐ 作为Job的"不可变基础属性"
```

---

## ✅ MVP完成的唯一判断标准

```
一个contractor
第一次用
不需要解释
2分钟内
把一个工地的旧照片全部倒进来
```

**如果这条成立 → MVP成功**

---

## 🚀 正式启动指令

### 你可以原样发给CTO/团队：

```
Magic Import MVP 正式启动

本版本目标：
对齐CompanyCam的Project-first Import

功能范围：
仅限Job Details内的Magic Import

明确不做：
Rescue / AI / 自动整理 / 全局扫描

地址必须使用：
Google Places Autocomplete

验收标准：
《Magic Import · 一页截图式规范》

所有实现请严格对照PR Checklist执行，
未通过任一验收点，不得合并。
```

---

## 📊 接下来48小时应该做什么

### 🕐 Day 0（现在）

```
☐ 发启动指令
☐ 把截图式规范 + PR Checklist贴到repo/issue
☐ 明确reviewer是你（CEO）
```

---

### 🕐 Day 1

```
☐ CTO按24小时清单推进
☐ 你不讨论新想法
☐ 只按截图规范验收
```

---

### 🕐 Day 2

**你自己当用户跑一遍：**
```
☐ 新建Job
☐ Import last 30 days
☐ 勾选/取消
☐ 一次性导入
```

**只问一个问题：**
```
"我愿不愿意以后一直这样用？"

如果答案是Yes
→ MVP就完成了
→ 可以开始用、开始卖
```

---

## 💬 CPO最终总结

### 你现在做的不是"终于开始"

**而是：**
```
在所有关键错误都避免之后，再开始。
```

**这会让你：**
```
✓ 少写50%代码
✓ 少背80%技术债
✓ 少走6-12个月弯路
```

---

### 产品方向已经非常清晰

```
不和CompanyCam比"聪明"
只和它比"谁更让contractor放心"

这一步，你已经赢在起跑线上。
```

---

### 三个硬条件（已全部满足）

```
✅ 产品边界已经冻结
✅ 核心依赖已明确、可直接用
✅ MVP验收标准已经写清楚
```

**这在"开始写代码之前"是非常罕见的完整度**

---

## 📁 MVP组件拆分建议

```
<ImportPhotosButton job={...} />
<ImportModal job={...} />
  ├─ <TimeRangeStep />
  ├─ <PreviewStep />
  ├─ <EmptyState />
  └─ <ImportingState />
```

---

## 🔌 API清单

```
POST /api/jobs/:jobId/import/preview
POST /api/jobs/:jobId/import/confirm
```

---

**文档版本：** v1.0  
**创建人：** CPO  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 立即生效  
**预计完成：** 24小时

---

**从"复杂的AI整理"到"简单可信的Magic Import"！** 🎯
