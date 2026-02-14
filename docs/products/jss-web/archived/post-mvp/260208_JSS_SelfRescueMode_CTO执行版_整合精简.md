# JSS Self-Rescue Mode - CTO执行版（整合精简版）

> **文档类型：** CTO执行指令 + 完整实施方案  
> **整合自：** 3份Self-Rescue Mode完整文档  
> **创建时间：** 2026-02-08  
> **优先级：** 🟡 P1 - 核心功能  
> **预计完成：** 2周

---

## 📋 一句话执行指令

```
Self-Rescue Mode帮contractor整理手机相册里的工地照片
先过滤生活照，再按GPS+时间粗略分组
只建议不决定，用户确认后才应用
```

---

## 🎯 产品核心原则（必须理解）

### 三条铁律（不可违反）

**🧠 铁律1：默认什么都不做**
```
❌ 不自动改
❌ 不自动归档
❌ 不"系统帮你做主"
```

**👆 铁律2：每一步都是"我自己点的"**
```
分组是：建议分组
归档是：你点确认
改错是：你随时能撤
```

**📁 铁律3：它处理的是"我自己的照片"**
```
来源：手机相册 / 硬盘 / 旧项目导出
语义："我在整理我自己的东西"
```

---

## 🚫 立即修正（CEO反馈的5个问题）

### 修正1：Date range必须真实完整

**❌ 错误：**
```
Date range: 2025 - 2025
```

**✅ 正确：**
```
Date range: Jul 2021 – Aug 2026
(based on photo metadata)
```

---

### 修正2：自动过滤生活照

**必须过滤：**
```
- 机场/酒店/景点
- 人像/宠物/食物
- 家庭环境
```

**原则：**
```
漏掉没关系，救错才是灾难
目标：快速清掉80%明显垃圾
```

**UI呈现：**
```
❌ 80 locations found
✅ 12 likely job sites found
   (filtered from personal & travel photos)
```

---

### 修正3：GPS→Address预填，不要Example

**正确格式：**
```
Burnaby – 8290 Kingsway
Vancouver – 5862 Cambie St
```

**UI文案：**
```
Suggested name based on location
You can rename later
```

---

### 修正4：不显示session/unit（简化）

**✅ Rescue Mode只做2层：**

**Layer 1: Job/Building**
```
Burnaby – 8290 Kingsway
360 photos · Jul–Aug 2025
```

**Layer 2: Photo preview**
```
- 按时间排序
- 不要session
- 不要unit  
- 不要hour

只让用户判断："这是同一个工地吗？"
```

**原则：**
```
Rescue Mode solves "which job"
not "which unit"
```

---

### 修正5：Mobile单屏，无横向溢出

**硬性要求：**
```
✅ 所有主操作单屏可见
✅ 无横向滚动
✅ CTA固定底部（safe area）
✅ one-thumb usable
```

---

## 📐 简化流程（3步，不是5步）

### Step 1: Scan & Filter

**UI：**
```
Scanning your photos…
███████████████

Found:
• 1,160 photos total
• 740 likely jobsite photos
• 420 personal/travel photos (filtered out)

Date range: Jul 2021 – Aug 2026
```

**规则：**
```
- 只显示事实统计
- 不出现项目名
- 不做归属判断
```

---

### Step 2: Review Groups

**UI：**
```
Suggested groups (nothing applied yet)

Burnaby – 8290 Kingsway
≈ 360 photos · Jul–Aug 2025
[Preview] [Name this job] [Skip]

Vancouver – 5862 Cambie St
≈ 210 photos · Feb–Apr 2024
[Preview] [Name this job] [Skip]
```

**规则：**
```
- GPS→Address自动预填
- 用户可以改名
- 用户可以跳过
- 不强制命名
```

---

### Step 3: Confirm & Apply

**UI：**
```
Review & confirm

You're about to organize:
• 3 groups named as jobs
• 570 photos organized
• 0 photos deleted

Nothing changes until you click Confirm.

[Confirm & apply] [Go back]
```

**Apply后：**
```
Banner: Rescue applied
        Undo available for 24 hours
        [Undo]
```

---

## 💻 核心实施方案

### 技术栈确认

```
Frontend: Next.js (App Router) + React + Zustand
Backend: Supabase + GPS聚类算法
```

---

### 路由结构

```
/rescue/scan           - 扫描与过滤
/rescue/groups         - 分组列表
/rescue/groups/[id]    - 分组详情（可选）
/rescue/confirm        - 确认应用
```

---

### 状态管理（Zustand）

```typescript
type RescueStore = {
  // 扫描结果
  photos: RescuePhoto[]
  groups: PhotoGroup[]
  
  // 用户编辑
  groupNames: Map<string, string>  // groupId -> 用户命名
  skippedGroups: Set<string>       // 用户跳过的group
  
  // 状态
  phase: 'scan' | 'review' | 'confirm' | 'applied'
  
  // 操作
  nameGroup: (groupId: string, name: string) => void
  skipGroup: (groupId: string) => void
  confirmApply: () => Promise<void>
  undo: () => Promise<void>
}
```

---

### 数据类型

```typescript
type RescuePhoto = {
  photoId: string
  localUri: string
  takenAtUtc: string
  lat?: number
  lng?: number
  filtered: boolean  // 是否被过滤为生活照
}

type PhotoGroup = {
  groupId: string
  photoIds: string[]
  centroid: { lat: number; lng: number }
  dateRange: { start: string; end: string }
  suggestedAddress?: string
  stats: {
    photoCount: number
    spanDays: number
  }
}
```

---

## 🎫 执行Tickets（7个，简化版）

### T1 - Scan页面（过滤 + 统计）

**Scope:**
```
- 扫描进度条
- 实时counters（total / jobsite / filtered / date range）
- 自动过滤生活照
- 完成后 → /rescue/groups
```

**验收：**
```
☐ Date range真实完整
☐ 过滤规则正确（机场/人像/宠物等）
☐ UI无横向溢出
```

---

### T2 - Groups列表页面

**Scope:**
```
- GroupCard列表
- 每个card显示：
  - GPS→Address预填名称
  - Photo count + date range
  - Preview thumbnails（3-5张）
  - Actions: Name/Preview/Skip
```

**验收：**
```
☐ 预填地址格式正确（City – Address）
☐ 用户可编辑名称
☐ Skip group不影响其他group
```

---

### T3 - Name Group交互

**Scope:**
```
- Input预填suggestedAddress
- 用户可以：
  - 直接接受（按Enter）
  - 修改部分
  - 全删重写
- 保存到groupNames
```

**验收：**
```
☐ 预填不等于自动确认
☐ 用户必须有明确操作
☐ 可以留空（Keep unassigned）
```

---

### T4 - Preview Drawer（可选）

**Scope:**
```
- 打开group详情
- 按时间排序的照片网格
- 不显示session/unit
- 只用于review，不做编辑
```

**验收：**
```
☐ 照片按时间排序
☐ 无session/unit概念
☐ 不能拖拽重新分组
```

---

### T5 - Confirm页面

**Scope:**
```
- 汇总统计（groups/photos/deleted）
- 明确文案："Nothing changes until you click Confirm"
- Confirm按钮 + Go back
- Apply后显示Undo banner
```

**验收：**
```
☐ 统计数字准确
☐ Apply前不修改数据
☐ Undo banner可用（24h）
```

---

### T6 - GPS聚类算法（后端）

**Scope:**
```
- 输入：RescuePhoto[]
- 算法：DBSCAN或简单距离聚类
- 输出：PhotoGroup[]
- 过滤规则：机场/人像/宠物等
```

**验收：**
```
☐ 距离阈值：30-50m
☐ 时间连续性考虑
☐ 生活照过滤率>80%
```

---

### T7 - Reverse Geocoding（地址预填）

**Scope:**
```
- 调用geocoding API
- 格式化为：City – Address
- 作为suggestedAddress存储
- 允许用户修改
```

**验收：**
```
☐ 格式统一（City – Address）
☐ API失败fallback到GPS坐标
☐ 不阻塞主流程
```

---

## 🔒 防护规则（必须实施）

### UI文案规则

**✅ 允许使用：**
```
noticed / seems / suggest / might / likely
```

**❌ 禁止使用：**
```
detected / automatically / AI decided / confirmed
```

---

### 数据不变量

```typescript
// INV-A: filtered photos不进入groups
assert(!groups.some(g => 
  g.photoIds.some(pid => 
    photos.find(p => p.photoId === pid)?.filtered
  )
))

// INV-B: 一个photo不能在多个group
const allGroupPhotoIds = groups.flatMap(g => g.photoIds)
assert(allGroupPhotoIds.length === new Set(allGroupPhotoIds).size)

// INV-C: Apply前groupNames只存在内存
assert(!hasWrittenToDatabase)
```

---

### Mobile-First检查清单

```
☐ 所有卡片单列显示
☐ CTA按钮minimum 44×44pt
☐ 无需横向滚动
☐ 关键操作在thumb zone
☐ 字体大小>=14px
```

---

## 📄 关键页面代码

### 1. Scan页面

```typescript
// app/rescue/scan/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useRescueStore } from "@/lib/rescue/store"

export default function ScanPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    jobsite: 0,
    filtered: 0,
    dateRange: ""
  })

  useEffect(() => {
    // 模拟扫描过程
    const scan = async () => {
      // 调用后端API或本地扫描
      const result = await scanPhotos()
      
      setStats({
        total: result.photos.length,
        jobsite: result.photos.filter(p => !p.filtered).length,
        filtered: result.photos.filter(p => p.filtered).length,
        dateRange: formatDateRange(result.photos)
      })
      
      // 保存到store
      useRescueStore.setState({
        photos: result.photos,
        groups: result.groups,
        phase: 'review'
      })
      
      router.push('/rescue/groups')
    }
    
    scan()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Scanning your photos…
      </h1>
      
      <div className="h-2 w-full bg-gray-200 rounded-full mb-6">
        <div 
          className="h-2 bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="space-y-2 text-gray-700">
        <div>• {stats.total} photos total</div>
        <div>• {stats.jobsite} likely jobsite photos</div>
        <div>• {stats.filtered} personal/travel photos (filtered out)</div>
        <div className="mt-4 font-semibold">
          Date range: {stats.dateRange}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        Suggestions only. Nothing changes unless you confirm.
      </div>
    </div>
  )
}
```

---

### 2. Groups列表页面

```typescript
// app/rescue/groups/page.tsx
"use client"

import { useRescueStore } from "@/lib/rescue/store"
import { useState } from "react"

export default function GroupsPage() {
  const { groups, groupNames, nameGroup, skipGroup } = useRescueStore()
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Suggested groups
      </h1>
      <p className="text-gray-600 mb-6">
        Nothing applied yet. Review and name your jobs.
      </p>

      <div className="space-y-4">
        {groups.map(group => (
          <GroupCard
            key={group.groupId}
            group={group}
            currentName={groupNames.get(group.groupId)}
            isEditing={editingGroupId === group.groupId}
            onStartEdit={() => setEditingGroupId(group.groupId)}
            onSaveName={(name) => {
              nameGroup(group.groupId, name)
              setEditingGroupId(null)
            }}
            onSkip={() => skipGroup(group.groupId)}
          />
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg"
          onClick={() => router.push('/rescue/confirm')}
        >
          Review & confirm
        </button>
        <button
          className="px-6 py-3 border rounded-lg"
          onClick={() => router.push('/')}
        >
          Exit
        </button>
      </div>
    </div>
  )
}

function GroupCard({ group, currentName, isEditing, onStartEdit, onSaveName, onSkip }) {
  const [inputValue, setInputValue] = useState(
    currentName || group.suggestedAddress || ""
  )

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <div>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 mb-2"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Job name"
                autoFocus
              />
              <div className="text-sm text-gray-500 mb-2">
                Suggested: {group.suggestedAddress}
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-500 text-white px-4 py-1 rounded text-sm"
                  onClick={() => onSaveName(inputValue)}
                >
                  Save
                </button>
                <button
                  className="border px-4 py-1 rounded text-sm"
                  onClick={() => setInputValue(currentName || group.suggestedAddress || "")}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-lg mb-1">
                {currentName || group.suggestedAddress || `Group ${group.groupId}`}
              </div>
              <div className="text-sm text-gray-600">
                {group.stats.photoCount} photos · {formatDateRange(group.dateRange)}
              </div>
              {!currentName && group.suggestedAddress && (
                <div className="text-xs text-gray-500 mt-1">
                  Suggested name based on location
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2">
            <button
              className="border px-4 py-2 rounded text-sm"
              onClick={onStartEdit}
            >
              Name
            </button>
            <button
              className="border px-4 py-2 rounded text-sm text-gray-600"
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        )}
      </div>

      {/* Preview thumbnails */}
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {group.previewThumbnails?.slice(0, 5).map((thumb, i) => (
          <img
            key={i}
            src={thumb}
            className="w-16 h-16 object-cover rounded"
            alt=""
          />
        ))}
      </div>
    </div>
  )
}
```

---

### 3. Confirm页面

```typescript
// app/rescue/confirm/page.tsx
"use client"

import { useRescueStore } from "@/lib/rescue/store"
import { useRouter } from "next/navigation"

export default function ConfirmPage() {
  const router = useRouter()
  const { groups, groupNames, skippedGroups, confirmApply } = useRescueStore()

  const namedGroups = groups.filter(g => 
    groupNames.has(g.groupId) && !skippedGroups.has(g.groupId)
  )
  
  const totalPhotos = namedGroups.reduce((sum, g) => 
    sum + g.stats.photoCount, 0
  )

  const handleConfirm = async () => {
    await confirmApply()
    router.push('/rescue/done')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Review & confirm
      </h1>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Groups named:</span>
            <span className="font-semibold">{namedGroups.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Photos organized:</span>
            <span className="font-semibold">{totalPhotos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Photos deleted:</span>
            <span className="font-semibold">0</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-blue-900">
          Nothing changes until you click Confirm.
          <br />
          You can undo for 24 hours.
        </div>
      </div>

      <div className="space-y-3">
        {namedGroups.map(group => (
          <div key={group.groupId} className="border rounded p-3">
            <div className="font-semibold">
              {groupNames.get(group.groupId)}
            </div>
            <div className="text-sm text-gray-600">
              {group.stats.photoCount} photos
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold"
          onClick={handleConfirm}
        >
          Confirm & apply
        </button>
        <button
          className="px-6 py-3 border rounded-lg"
          onClick={() => router.back()}
        >
          Go back
        </button>
      </div>
    </div>
  )
}
```

---

## 🧪 测试与验收

### 功能测试

```
☐ Scan正确过滤生活照
☐ Date range显示真实完整
☐ GPS→Address格式正确
☐ 用户可以编辑/跳过任何group
☐ Confirm前不写入数据库
☐ Apply后显示Undo banner
☐ Undo功能正常工作
```

---

### UI测试（Mobile）

```
☐ 所有页面无横向滚动
☐ 文字大小>=14px
☐ CTA按钮>=44×44pt
☐ 单手拇指可完成所有操作
☐ 在iPhone SE上正常显示
```

---

### 文案测试

```
☐ 不出现"automatically"
☐ 不出现"AI decided"
☐ 所有建议用"seems/might/suggested"
☐ 明确说明"Nothing changes unless you confirm"
```

---

### 性能测试

```
☐ 1000张照片扫描<5秒
☐ Groups列表渲染流畅
☐ 照片预览不卡顿
```

---

## 📊 实施时间表

### Week 1

```
Day 1-2: T1 (Scan页面)
Day 3-4: T2 (Groups列表)
Day 5: T3 (Name交互)
```

---

### Week 2

```
Day 1-2: T4-T5 (Preview + Confirm)
Day 3-4: T6-T7 (后端聚类 + Geocoding)
Day 5: 测试与修正
```

---

## ⚠️ 常见错误与避免

### 错误1：自动应用分组

**❌ 错误做法：**
```typescript
// 扫描完立即创建项目
await createProjects(groups)
```

**✅ 正确做法：**
```typescript
// 只保存到临时状态
useRescueStore.setState({ groups, phase: 'review' })
// 用户确认后才创建
```

---

### 错误2：强制命名

**❌ 错误做法：**
```
required input, 不允许跳过
```

**✅ 正确做法：**
```
optional input, 可以Skip或Keep unassigned
```

---

### 错误3：显示session/unit

**❌ 错误做法：**
```
Session 10:00-11:30 · Unit A
```

**✅ 正确做法：**
```
360 photos · Jul–Aug 2025
只显示总数和日期范围
```

---

## 💬 最后检查清单

### 产品完成定义

```
✅ 用户能说出：
   "现在这些照片看起来像几个清楚的工地了"

✅ 用户没有被迫理解任何新概念

✅ 用户没有怀疑数据真实性

✅ 用户感觉"这是我自己在整理，不是系统帮我做主"
```

---

### 技术完成定义

```
✅ 所有Tickets完成且验收通过
✅ Mobile UI无横向溢出
✅ 文案符合规则（suggest不说auto）
✅ 不变量检查通过
✅ 性能达标（1000张<5秒）
✅ Undo功能正常
```

---

**文档版本：** v1.0  
**创建人：** CPO（整合）  
**审核人：** CEO  
**执行人：** CTO + 前后端团队  
**生效日期：** 立即生效  
**预计完成：** 2周

---

**Self-Rescue Mode：让contractor第一次把自己的人生相册救回来！** 🎯
