# JobSite Snap - 工时记录系统 v2.0
## Project-as-Context（项目即上下文）

---

## 🎯 核心理念

> **"项目不是系统算出来的，而是工人顺手选的"**

**系统的责任：**
1. 让选择变得极简单
2. 让错误变得可修正
3. 让老板不用天天盯

---

## 🟢 主流程设计

### 场景 1：一天只在一个项目（80% 情况）

```
工人早上打开 App
    ↓
[START WORK] 大按钮
    ↓
弹出项目选择（只显示一次）:
┌──────────────────────────┐
│ 你今天主要在哪个项目？    │
│                         │
│ ○ 123 Main St          │  ← 上次项目（默认选中）
│   (Downtown Condo)      │
│                         │
│ ○ 456 Oak Ave          │
│   (Burnaby House)       │
│                         │
│ ○ 789 Elm Dr           │
│   (Richmond Townhouse)  │
│                         │
│ [+ 其他项目]            │
└──────────────────────────┘
    ↓
点击 [START] 开始工作
    ↓
✅ 签到成功！
显示：123 Main St - 8:00 AM
    ↓
当天所有后续打卡 = 自动这个项目
    ↓
中午休息？ [BREAK] 按钮
下班？     [END WORK] 按钮
    ↓
不再问项目！
```

### 场景 2：一天跨两个项目（20% 情况）

```
早上在项目 A 工作
    ↓
中午需要去项目 B
    ↓
工人点击：[🔄 SWITCH PROJECT]
    ↓
选择新项目：
┌──────────────────────────┐
│ 切换到哪个项目？         │
│                         │
│ ○ 456 Oak Ave          │  ← 附近项目（GPS排序）
│   (2.3 km away)         │
│                         │
│ ○ 789 Elm Dr           │
│   (5.1 km away)         │
│                         │
│ [+ 其他项目]            │
└──────────────────────────┘
    ↓
系统自动做 3 件事：
1. End 项目 A（12:00 PM）
2. Start 项目 B（12:30 PM）
3. 记录切换原因：manual_switch
    ↓
继续在项目 B 工作
    ↓
下班 [END WORK]
```

### 场景 3：忘了打卡 / 忘了切换（必然发生）

```
晚上工人想起来："糟糕，忘了打卡！"
    ↓
App 里点击：[📝 补录工时]
    ↓
选择日期和项目：
┌──────────────────────────┐
│ 补录工时                │
│                         │
│ 日期：2026-01-27        │
│                         │
│ 项目 A：123 Main St     │
│ 开始：9:00 AM           │
│ 结束：2:00 PM           │
│                         │
│ [+ 添加项目 B]          │  ← 如果去了两个工地
│                         │
│ 项目 B：456 Oak Ave     │
│ 开始：2:30 PM           │
│ 结束：6:00 PM           │
│                         │
│ [提交审批]              │
└──────────────────────────┘
    ↓
标记为 manual_entry = true
    ↓
发送给老板审批
    ↓
老板看到：
"John Smith 补录工时（2026-01-27）"
- 项目 A：5 小时
- 项目 B：3.5 小时
GPS 提示：far（但可能合理）
    ↓
老板一键批准 ✅
```

---

## 📱 界面设计（极简版）

### 工人 App - 主界面

#### 状态 1：还没打卡（早上）

```
┌──────────────────────────┐
│  JobSite Snap           │
│                         │
│  👷 John Smith          │
│                         │
│  ┌────────────────────┐ │
│  │                    │ │
│  │   START WORK       │ │
│  │   [巨大按钮]        │ │
│  │                    │ │
│  └────────────────────┘ │
│                         │
│  上次项目：123 Main St  │
│  本周工时：34.5 小时    │
│                         │
│  [查看详情]             │
└──────────────────────────┘
```

#### 状态 2：已打卡（工作中）

```
┌──────────────────────────┐
│  JobSite Snap           │
│                         │
│  ✅ 工作中              │
│  项目：123 Main St      │
│  开始：8:00 AM          │
│  工时：3.5 小时         │
│                         │
│  ┌────────────────────┐ │
│  │   END WORK         │ │
│  │   [大按钮]          │ │
│  └────────────────────┘ │
│                         │
│  [🔄 切换项目]          │
│  [☕ 休息]              │
│                         │
│  今日工时：3.5 小时     │
└──────────────────────────┘
```

#### 状态 3：项目切换

```
┌──────────────────────────┐
│  切换项目               │
│                         │
│  当前：123 Main St      │
│  工时：4.5 小时         │
│                         │
│  切换到：               │
│  ○ 456 Oak Ave (2km)   │  ← GPS 排序
│  ○ 789 Elm Dr  (5km)   │
│  ○ 321 Pine St (8km)   │
│                         │
│  [+ 其他项目]           │
│                         │
│  [确认切换]             │
└──────────────────────────┘
```

---

## 🧱 数据结构设计

### 核心表：time_entries（工时记录）

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  
  -- 基础信息
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  date DATE NOT NULL,
  
  -- 时间
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  
  -- 工时计算
  total_hours DECIMAL(4,2), -- 自动计算
  break_hours DECIMAL(4,2) DEFAULT 0,
  billable_hours DECIMAL(4,2), -- total_hours - break_hours
  
  -- 来源和可信度
  entry_source TEXT NOT NULL CHECK (entry_source IN (
    'auto',           -- 工人正常打卡
    'manual_entry',   -- 工人补录
    'manual_split',   -- 工人手动分割项目
    'admin_edit'      -- 老板修改
  )),
  
  -- GPS 提示（仅供参考）
  gps_hint TEXT CHECK (gps_hint IN (
    'near',      -- GPS 显示在项目附近（< 500m）
    'moderate',  -- GPS 显示在合理范围（500m - 5km）
    'far',       -- GPS 显示较远（> 5km）
    'unknown'    -- 无 GPS 数据
  )),
  gps_check_in GEOGRAPHY(POINT, 4326),  -- 签到位置
  gps_check_out GEOGRAPHY(POINT, 4326), -- 签退位置
  
  -- 审批状态（仅 manual_entry 需要）
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN (
    'pending',    -- 等待审批
    'approved',   -- 已批准
    'rejected'    -- 已拒绝
  )),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- 元数据
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_time_entries_worker_date ON time_entries(worker_id, date DESC);
CREATE INDEX idx_time_entries_project ON time_entries(project_id, date DESC);
CREATE INDEX idx_time_entries_approval ON time_entries(approval_status) 
  WHERE approval_status = 'pending';
```

### 辅助表：project_switches（项目切换日志）

```sql
CREATE TABLE project_switches (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  
  -- 切换信息
  from_project_id UUID REFERENCES projects(id),
  to_project_id UUID NOT NULL REFERENCES projects(id),
  switch_time TIMESTAMPTZ NOT NULL,
  
  -- GPS 对比
  from_gps GEOGRAPHY(POINT, 4326),
  to_gps GEOGRAPHY(POINT, 4326),
  distance_km DECIMAL(6,2), -- 两个工地距离
  
  -- 自动生成的时间分段
  previous_entry_id UUID REFERENCES time_entries(id),
  new_entry_id UUID REFERENCES time_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 辅助表：worker_project_preferences（工人项目偏好）

```sql
CREATE TABLE worker_project_preferences (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- 统计数据
  last_worked_at TIMESTAMPTZ,
  total_days_worked INTEGER DEFAULT 0,
  total_hours DECIMAL(8,2) DEFAULT 0,
  
  -- 排序权重（自动计算）
  frequency_score DECIMAL(5,2), -- 最近工作频率
  
  UNIQUE(worker_id, project_id)
);
```

---

## 🔄 核心逻辑实现

### 1. 开始工作（选择项目）

```typescript
async function startWork(workerId: string) {
  // 1. 获取推荐项目列表
  const projects = await getRecommendedProjects(workerId);
  
  // 2. 显示项目选择器
  const selectedProject = await showProjectPicker(projects);
  
  // 3. 获取 GPS（仅一次）
  const gpsLocation = await getCurrentLocation();
  
  // 4. 计算 GPS 提示
  const gpsHint = calculateGPSHint(
    gpsLocation, 
    selectedProject.location
  );
  
  // 5. 创建工时记录
  const timeEntry = await supabase
    .from('time_entries')
    .insert({
      worker_id: workerId,
      project_id: selectedProject.id,
      date: getCurrentDate(),
      start_time: new Date(),
      entry_source: 'auto',
      gps_hint: gpsHint,
      gps_check_in: gpsLocation,
      approval_status: 'approved' // 正常打卡自动批准
    });
  
  // 6. 更新工人偏好
  await updateWorkerPreference(workerId, selectedProject.id);
  
  // 7. 显示成功
  showSuccess(`已签到：${selectedProject.name}`);
  
  return timeEntry;
}

// 获取推荐项目（智能排序）
async function getRecommendedProjects(workerId: string) {
  const currentLocation = await getCurrentLocation();
  
  const { data } = await supabase.rpc('get_recommended_projects', {
    p_worker_id: workerId,
    p_current_lat: currentLocation.lat,
    p_current_lng: currentLocation.lng
  });
  
  // 排序逻辑：
  // 1. 最近工作的项目（优先）
  // 2. 附近的项目（GPS 距离）
  // 3. 常去的项目（频率）
  
  return data;
}

// 计算 GPS 提示
function calculateGPSHint(
  currentLocation: GeoLocation,
  projectLocation: GeoLocation
): GPSHint {
  const distance = calculateDistance(currentLocation, projectLocation);
  
  if (distance < 0.5) return 'near';      // 500m 内
  if (distance < 5.0) return 'moderate';  // 5km 内
  return 'far';                           // > 5km
}
```

### 2. 切换项目

```typescript
async function switchProject(
  currentEntryId: string,
  newProjectId: string
) {
  // 1. 结束当前工时
  const currentEntry = await supabase
    .from('time_entries')
    .update({
      end_time: new Date()
    })
    .eq('id', currentEntryId)
    .single();
  
  // 2. 获取 GPS
  const newLocation = await getCurrentLocation();
  
  // 3. 计算 GPS 提示
  const newProject = await getProject(newProjectId);
  const gpsHint = calculateGPSHint(newLocation, newProject.location);
  
  // 4. 创建新工时记录
  const newEntry = await supabase
    .from('time_entries')
    .insert({
      worker_id: currentEntry.worker_id,
      project_id: newProjectId,
      date: currentEntry.date,
      start_time: new Date(),
      entry_source: 'auto', // 虽然是切换，但仍是自动
      gps_hint: gpsHint,
      gps_check_in: newLocation,
      approval_status: 'approved'
    });
  
  // 5. 记录切换日志
  await supabase.from('project_switches').insert({
    worker_id: currentEntry.worker_id,
    from_project_id: currentEntry.project_id,
    to_project_id: newProjectId,
    switch_time: new Date(),
    from_gps: currentEntry.gps_check_in,
    to_gps: newLocation,
    distance_km: calculateDistance(
      currentEntry.gps_check_in,
      newLocation
    ),
    previous_entry_id: currentEntryId,
    new_entry_id: newEntry.id
  });
  
  // 6. 显示成功
  showSuccess(`已切换到：${newProject.name}`);
  
  return newEntry;
}
```

### 3. 补录工时（晚上忘了打卡）

```typescript
async function manualEntry(
  workerId: string,
  entries: Array<{
    projectId: string;
    date: Date;
    startTime: Date;
    endTime: Date;
  }>
) {
  const createdEntries = [];
  
  for (const entry of entries) {
    const project = await getProject(entry.projectId);
    
    // 创建补录记录
    const timeEntry = await supabase
      .from('time_entries')
      .insert({
        worker_id: workerId,
        project_id: entry.projectId,
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        entry_source: entries.length > 1 
          ? 'manual_split'   // 多个项目 = 手动分割
          : 'manual_entry',  // 单个项目 = 补录
        gps_hint: 'unknown', // 补录没有 GPS
        approval_status: 'pending' // 需要审批
      });
    
    createdEntries.push(timeEntry);
  }
  
  // 通知老板
  await notifyManager({
    type: 'manual_entry_request',
    worker_id: workerId,
    entry_count: entries.length,
    date: entries[0].date
  });
  
  showSuccess('补录申请已提交，等待审批');
  
  return createdEntries;
}
```

---

## 👔 老板端设计

### Dashboard - 今日概览

```
┌─────────────────────────────────────────┐
│  今日工时概览 - 2026年1月27日           │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ 15人 │ │127.5h│ │ 3个  │            │
│  │工作中│ │总工时│ │待审批│            │
│  └──────┘ └──────┘ └──────┘            │
│                                         │
│  📍 按项目查看                          │
│  ┌──────────────────────────────────┐  │
│  │ 123 Main St                      │  │
│  │ 5 人工作中 · 27.5 小时          │  │
│  │ 🟢 John  🟢 Mike  🟢 Carlos      │  │
│  │ 🟢 Tom   🟢 Lisa                 │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 456 Oak Ave                      │  │
│  │ 3 人工作中 · 16.0 小时          │  │
│  │ 🟢 Patrick  🟢 Chen  🟢 Kumar   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ⚠️ 需要注意                            │
│  🔴 3 个补录申请待审批                  │
│  🟡 2 人工时异常（GPS 显示 far）       │
│                                         │
│  [实时刷新] [查看详情] [导出]          │
└─────────────────────────────────────────┘
```

### 审批界面 - 补录申请

```
┌─────────────────────────────────────────┐
│  补录工时申请                           │
│                                         │
│  工人：John Smith                       │
│  日期：2026-01-27                       │
│  提交时间：2026-01-27 8:30 PM          │
│                                         │
│  项目 A：123 Main St                   │
│  时间：9:00 AM - 2:00 PM               │
│  工时：5.0 小时                         │
│  GPS：unknown（补录无GPS）              │
│                                         │
│  项目 B：456 Oak Ave                   │
│  时间：2:30 PM - 6:00 PM               │
│  工时：3.5 小时                         │
│  GPS：unknown（补录无GPS）              │
│                                         │
│  📝 工人备注：                          │
│  "早上忘了打卡，下午去了两个工地"      │
│                                         │
│  📊 历史记录：                          │
│  - 最近 30 天补录：2 次                │
│  - 平均出勤率：95%                     │
│  - 可信度评分：⭐⭐⭐⭐⭐              │
│                                         │
│  [✅ 批准] [❌ 拒绝] [💬 留言]        │
└─────────────────────────────────────────┘
```

### 异常工时查看

```
┌─────────────────────────────────────────┐
│  GPS 异常工时（仅供参考）               │
│                                         │
│  🟡 Mike Chen - 2026-01-27             │
│  项目：123 Main St (Downtown)          │
│  GPS：far (12.5 km)                    │
│                                         │
│  可能原因：                             │
│  • 工人住得远（常见）                  │
│  • GPS 信号问题                        │
│  • 确实不在现场                        │
│                                         │
│  历史数据：                             │
│  • 该工人在此项目工作 15 天            │
│  • GPS 始终显示 far                    │
│  • 从未被拒绝                          │
│                                         │
│  建议：                                 │
│  ✅ 自动放行（设为可信）               │
│  或 留待人工审核                       │
│                                         │
│  [设为可信项目] [查看详情]             │
└─────────────────────────────────────────┘
```

---

## 🎯 GPS 的正确使用方式

### ✅ GPS 应该做什么

1. **辅助排序**：把近的项目排前面
2. **提供提示**：显示 `near / moderate / far`
3. **记录线索**：给老板参考（不是判定）

### ❌ GPS 不应该做什么

1. **自动拒绝**：即使 GPS 显示 `far`，也不能拒绝打卡
2. **强制分配**：不能自动判断"你应该在哪个项目"
3. **持续追踪**：不能后台持续监控位置（费电 + 隐私问题）

### 📍 GPS 检查时机

```typescript
// ✅ 正确：只在必要时获取一次
const gpsChecks = {
  startWork: true,      // 开始工作时
  switchProject: true,  // 切换项目时
  endWork: true,        // 结束工作时（可选）
  
  duringWork: false,    // ❌ 工作期间不检查
  breakTime: false,     // ❌ 休息时不检查
  background: false     // ❌ 后台不检查
};
```

---

## 🔐 老板的"隐形保险机制"

### 1. 可信度评分系统

```typescript
interface WorkerTrustScore {
  worker_id: string;
  trust_level: 'high' | 'medium' | 'low';
  
  // 评分因素
  attendance_rate: number;      // 出勤率
  manual_entry_frequency: number; // 补录频率
  gps_consistency: number;      // GPS 一致性
  approval_history: number;     // 审批通过率
  
  // 自动策略
  auto_approve_manual_entry: boolean;
  require_photo_checkin: boolean;
}

// 高可信度工人 → 自动批准补录
// 低可信度工人 → 需要人工审核
```

### 2. 异常模式识别

```typescript
// 系统自动识别的异常模式
const anomalyPatterns = {
  // 🟡 需要注意（不拦截）
  frequent_manual_entries: {
    threshold: 5,  // 每月超过 5 次补录
    action: 'notify_manager'
  },
  
  gps_far_consistently: {
    threshold: 0.8,  // 80% 的打卡 GPS 都是 far
    action: 'suggest_trusted_project'
  },
  
  unusual_hours: {
    threshold: 12,  // 单日超过 12 小时
    action: 'flag_for_review'
  },
  
  // 🔴 严重异常（需要审批）
  impossible_travel: {
    // 1 小时内在两个相距 50km 的工地打卡
    action: 'require_approval'
  }
};
```

### 3. 项目可信规则

```typescript
// 老板可以设置"可信项目"规则
interface TrustedProjectRule {
  worker_id: string;
  project_id: string;
  
  // 规则
  allow_far_gps: boolean;       // 允许 GPS 显示 far
  auto_approve_manual: boolean; // 自动批准补录
  
  // 原因
  reason: string; // "工人住得远" / "常驻项目"
}

// 示例：
// Mike Chen 在 123 Main St 工作，虽然 GPS 总是 far，
// 但老板知道他住得远，设为可信 → 自动放行
```

---

## 📊 数据库函数实现

### 1. 获取推荐项目

```sql
CREATE OR REPLACE FUNCTION get_recommended_projects(
  p_worker_id UUID,
  p_current_lat DECIMAL,
  p_current_lng DECIMAL
)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  project_address TEXT,
  distance_km DECIMAL,
  last_worked_at TIMESTAMPTZ,
  frequency_score DECIMAL,
  recommendation_score DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH worker_prefs AS (
    -- 工人的项目偏好
    SELECT 
      wp.project_id,
      wp.last_worked_at,
      wp.frequency_score
    FROM worker_project_preferences wp
    WHERE wp.worker_id = p_worker_id
  ),
  distances AS (
    -- 计算距离
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.address as project_address,
      ROUND(
        ST_Distance(
          p.location,
          ST_SetSRID(ST_MakePoint(p_current_lng, p_current_lat), 4326)::geography
        ) / 1000,
        2
      ) as distance_km
    FROM projects p
    WHERE p.is_active = true
  )
  SELECT 
    d.project_id,
    d.project_name,
    d.project_address,
    d.distance_km,
    wp.last_worked_at,
    COALESCE(wp.frequency_score, 0) as frequency_score,
    -- 综合评分（3 个因素）
    (
      -- 1. 最近工作的项目（权重 50%）
      CASE 
        WHEN wp.last_worked_at > NOW() - INTERVAL '7 days' THEN 50
        WHEN wp.last_worked_at > NOW() - INTERVAL '30 days' THEN 30
        ELSE 10
      END +
      -- 2. 距离近的项目（权重 30%）
      CASE 
        WHEN d.distance_km < 1 THEN 30
        WHEN d.distance_km < 5 THEN 20
        WHEN d.distance_km < 10 THEN 10
        ELSE 5
      END +
      -- 3. 常去的项目（权重 20%）
      COALESCE(wp.frequency_score * 20, 0)
    ) as recommendation_score
  FROM distances d
  LEFT JOIN worker_prefs wp ON d.project_id = wp.project_id
  ORDER BY recommendation_score DESC, distance_km ASC
  LIMIT 10;
END;
$$;
```

### 2. 自动批准或拒绝工时

```sql
CREATE OR REPLACE FUNCTION auto_approve_time_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_trust_score RECORD;
  v_trusted_rule RECORD;
BEGIN
  -- 如果是 auto 来源，自动批准
  IF NEW.entry_source = 'auto' THEN
    NEW.approval_status := 'approved';
    RETURN NEW;
  END IF;
  
  -- 如果是 manual_entry，检查可信度
  IF NEW.entry_source IN ('manual_entry', 'manual_split') THEN
    -- 获取工人可信度
    SELECT * INTO v_trust_score
    FROM worker_trust_scores
    WHERE worker_id = NEW.worker_id;
    
    -- 高可信度 + 低风险 → 自动批准
    IF v_trust_score.trust_level = 'high' 
       AND v_trust_score.auto_approve_manual_entry = true
    THEN
      NEW.approval_status := 'approved';
      RETURN NEW;
    END IF;
    
    -- 检查是否有可信项目规则
    SELECT * INTO v_trusted_rule
    FROM trusted_project_rules
    WHERE worker_id = NEW.worker_id
      AND project_id = NEW.project_id
      AND auto_approve_manual = true;
    
    IF v_trusted_rule.id IS NOT NULL THEN
      NEW.approval_status := 'approved';
      RETURN NEW;
    END IF;
  END IF;
  
  -- 默认：需要审批
  NEW.approval_status := 'pending';
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_time_entry_trigger
BEFORE INSERT ON time_entries
FOR EACH ROW
EXECUTE FUNCTION auto_approve_time_entry();
```

---

## 🎯 关键设计原则总结

### 1. 项目是"选的"，不是"算的"

```
❌ 错误：系统根据 GPS 自动判断项目
✅ 正确：工人选择项目，GPS 只是参考
```

### 2. 简单 > 准确

```
❌ 错误：复杂的 GPS 追踪 + AI 判断
✅ 正确：工人一次选择 + 需要时手动切换
```

### 3. 可修正 > 不出错

```
❌ 错误：系统拒绝明显错误的打卡
✅ 正确：允许打卡，晚上可以补录修正
```

### 4. 信任 > 监控

```
❌ 错误：GPS 持续追踪，强制验证位置
✅ 正确：一次性检查，给老板参考线索
```

---

## 🚀 MVP 实现优先级

### Phase 1（2周）- 核心流程

**必须有：**
1. ✅ 项目选择器（智能排序）
2. ✅ 开始/结束工作
3. ✅ 切换项目
4. ✅ 补录工时

**暂时不做：**
- ⏸️ 照片签到
- ⏸️ 复杂的可信度评分
- ⏸️ 高级分析报表

### Phase 2（1周）- 老板端

1. ✅ 实时工时查看
2. ✅ 审批补录申请
3. ✅ GPS 异常提示
4. ✅ 基础报表导出

### Phase 3（1周）- 优化

1. ✅ 可信项目规则
2. ✅ 自动批准逻辑
3. ✅ 性能优化

---

## 🎊 最终架构一句话

> **"项目不是系统算出来的，而是工人顺手选的。系统的责任是：让选择变得极简单、让错误变得可修正、让老板不用天天盯。"**

---

**要我开始创建数据库表结构吗？** 🚀
