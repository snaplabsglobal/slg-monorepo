# LedgerSnap 环境架构规划方案
**CTO Claude | 多环境部署最佳实践**

---

## 📐 当前架构诊断

### 你的现有设置（理解正确性验证）

```yaml
Supabase 云端（supabase.com）:
  ✅ JobSite-Snap-Core（生产环境）
     - 用途: 生产数据
     - 关联域名: www.ledgersnap.app, www.jobsitesnap.app
     - 稳定性: 高（不能随便改）
  
  ✅ JobSite-Snap-Dev（开发环境）
     - 用途: 开发测试
     - 关联域名: dev.ledgersnap.app, dev.jobsitesnap.app
     - 灵活性: 高（可以测试新功能）

Supabase 本地（127.0.0.1:54322）:
  ⚠️ 刚启动的本地实例
     - 用途: ？？？（这是你的疑问）
     - 数据: 空的（独立数据库）
     - 关联: 无（不连接云端）

Vercel 部署:
  ✅ 3 个应用门户
     - ls-web (LedgerSnap)
     - jss-web (JobSite Snap)
     - corporate-hub (官网)
  
  ✅ 2 个环境
     - dev.*.app (开发预览)
     - www.*.app (生产环境)

当前问题:
  ❓ 本地 Supabase 和云端的关系？
  ❓ 如何在多台机器开发？
  ❓ 本地修改如何同步到云端？
  ❓ 数据库迁移如何管理？
```

---

## ✅ 你的原设计评估

### 评分: ⭐⭐⭐⭐⭐ (5/5) 非常专业！

```yaml
优点:
  ✅ 生产/开发环境分离（标准实践）
  ✅ 域名隔离（dev/www）
  ✅ 多应用 Monorepo 架构
  ✅ Vercel 自动部署
  ✅ 任意机器可开发

这是企业级 SaaS 的标准架构！
```

### 但是...

```yaml
疑问点（你的担忧是对的）:
  
  ⚠️ 本地 Supabase 的定位不清晰
     - 它不会自动同步到云端
     - 它是完全独立的数据库实例
     - 需要明确使用场景

  ⚠️ 迁移文件的管理
     - 本地写的迁移如何推到 Dev？
     - Dev 测试通过如何推到 Core？
     - 多人协作如何避免冲突？

  ⚠️ 环境变量配置
     - 本地开发用哪个数据库？
     - 如何切换环境？
```

---

## 🎯 推荐架构：4 环境策略

### 标准的多环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                  开发流程（从左到右）                       │
└─────────────────────────────────────────────────────────────┘

Local Dev        →    Dev Cloud    →    Staging    →    Production
(本地机器)            (云端测试)        (预发布)        (生产)

┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ 本地      │      │ Supabase │      │ (可选)   │      │ Supabase │
│ Supabase  │ ──→  │ Dev      │ ──→  │ Staging  │ ──→  │ Core     │
│          │      │          │      │          │      │          │
│ 你的电脑  │      │ 云端     │      │ 云端     │      │ 云端     │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     ↓                  ↓                                    ↓
localhost:3000    dev.*.app                           www.*.app


各环境用途:

1️⃣ Local Dev（本地开发）:
   - 用途: 快速迭代、实验新功能
   - 数据库: 本地 Supabase (127.0.0.1:54322)
   - 好处: 
     ✅ 不需要网络
     ✅ 改坏了不影响别人
     ✅ 速度快（本地）
     ✅ 免费（不消耗云端配额）
   - 坏处:
     ⚠️ 数据不真实（需要自己造测试数据）
     ⚠️ 不能多人协作

2️⃣ Dev Cloud（云端开发）:
   - 用途: 团队协作、集成测试
   - 数据库: Supabase JobSite-Snap-Dev
   - 域名: dev.ledgersnap.app
   - 好处:
     ✅ 多人共享同一环境
     ✅ 真实的网络环境
     ✅ 可以给 COO 预览
   - 坏处:
     ⚠️ 多人改可能冲突
     ⚠️ 需要网络

3️⃣ Staging（预发布，可选）:
   - 用途: 上线前最后验证
   - 数据库: Supabase JobSite-Snap-Staging（需创建）
   - 域名: staging.ledgersnap.app
   - 好处:
     ✅ 和生产环境完全一致
     ✅ 用生产数据的副本测试
   - 何时需要:
     - 团队 > 5 人
     - 用户 > 1000
     - 需要合规审计

4️⃣ Production（生产）:
   - 用途: 真实用户使用
   - 数据库: Supabase JobSite-Snap-Core
   - 域名: www.ledgersnap.app
   - 原则:
     ✅ 只部署测试通过的代码
     ✅ 有回滚计划
     ✅ 监控告警
```

---

## 🔧 推荐方案（适合你的团队规模）

### 方案 A: 3 环境（推荐 ✅）

```yaml
适合: 团队 < 5 人，MVP 阶段

环境:
  1. Local（本地 Supabase）
  2. Dev Cloud（JobSite-Snap-Dev）
  3. Production（JobSite-Snap-Core）

跳过:
  - Staging（现阶段不需要）

工作流程:
  CEO 在本地开发 → 推到 Dev Cloud 测试 → COO 验收 → 合并到 Production
```

### 方案 B: 2 环境（最简单）

```yaml
适合: 单人开发，快速迭代

环境:
  1. Dev Cloud（JobSite-Snap-Dev）
  2. Production（JobSite-Snap-Core）

跳过:
  - Local Supabase（直接用云端 Dev）

工作流程:
  CEO 直接改 Dev Cloud → COO 验收 → 合并到 Production

优点:
  ✅ 最简单
  ✅ 不需要管理本地数据库

缺点:
  ❌ 改代码需要网络
  ❌ 多人可能冲突
```

---

## 🎯 我的推荐：方案 A（3 环境）

### 原因

```yaml
你的情况:
  - CEO + COO 2 人团队
  - MVP 阶段（需要快速迭代）
  - CEO 在学习开发（需要试错空间）
  - 有时在家，有时在办公室（多机器）

最佳方案:
  Local Dev（你的安全沙盒）
    ↓
  Dev Cloud（团队共享测试）
    ↓
  Production（用户使用）

为什么需要 Local？
  ✅ CEO 学习时可以随便试错（改坏了不影响 COO）
  ✅ 离线开发（温哥华的地铁上）
  ✅ 速度快（不需要等云端响应）
  ✅ 免费（不消耗 Supabase 配额）

为什么保留 Dev Cloud？
  ✅ COO 要看开发进度（实时预览）
  ✅ 多机器同步（家里 + 办公室）
  ✅ 集成测试（Gemini API、邮件网关等需要真实网络）
```

---

## 🔄 具体实施方案

### Step 1: 配置环境变量

```bash
# 文件结构:
apps/ls-web/
├── .env.local              # 本地开发（不提交 Git）
├── .env.development        # Dev Cloud 配置
└── .env.production         # Production 配置（Vercel 管理）

# ================================
# .env.local（本地开发）
# ================================

# Supabase（本地实例）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的本地anon key

# Gemini API（开发用）
GEMINI_API_KEY=你的API Key

# 环境标识
NEXT_PUBLIC_ENV=local

# ================================
# .env.development（Dev Cloud）
# ================================

# Supabase（云端 Dev）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # JobSite-Snap-Dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Dev anon key

# Gemini API
GEMINI_API_KEY=你的API Key

# 环境标识
NEXT_PUBLIC_ENV=development

# ================================
# .env.production（Production）
# ================================

# Supabase（云端 Core）
NEXT_PUBLIC_SUPABASE_URL=https://yyyyy.supabase.co  # JobSite-Snap-Core
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Core anon key

# Gemini API
GEMINI_API_KEY=你的API Key

# 环境标识
NEXT_PUBLIC_ENV=production
```

---

### Step 2: Git 配置

```bash
# .gitignore（确保敏感信息不泄露）

# 本地环境变量（不提交）
.env.local
.env*.local

# Supabase 本地数据（不提交）
supabase/.branches
supabase/.temp

# 允许提交的配置（团队共享）
!.env.development
!.env.production
```

---

### Step 3: 数据库迁移管理

#### 关键概念：迁移文件 = 代码

```yaml
迁移文件的生命周期:

1️⃣ 在本地创建迁移
   $ supabase migration new add_ml_tables
   → 生成: supabase/migrations/20260125000000_add_ml_tables.sql
   → 编写 SQL（CREATE TABLE ...）
   → 提交到 Git ✅

2️⃣ 在本地测试
   $ supabase db reset
   → 本地数据库应用迁移
   → 测试是否工作 ✅

3️⃣ 推送到 Dev Cloud
   $ git push origin dev
   → Vercel 自动部署到 dev.ledgersnap.app
   → 手动应用迁移到 JobSite-Snap-Dev:
     
     方法 A: Supabase Dashboard
     → 登录 supabase.com
     → 选择 JobSite-Snap-Dev
     → SQL Editor
     → 粘贴 SQL 并运行 ✅
     
     方法 B: Supabase CLI（推荐）
     $ supabase link --project-ref xxxxx  # Dev 项目 ID
     $ supabase db push
     → 自动应用所有新迁移 ✅

4️⃣ COO 在 Dev Cloud 验收
   → 访问 dev.ledgersnap.app
   → 测试新功能
   → 确认没问题 ✅

5️⃣ 合并到 Production
   $ git checkout main
   $ git merge dev
   $ git push origin main
   
   → Vercel 自动部署到 www.ledgersnap.app
   → 手动应用迁移到 JobSite-Snap-Core:
     $ supabase link --project-ref yyyyy  # Core 项目 ID
     $ supabase db push
   → 生产环境更新 ✅
```

---

### Step 4: 多机器开发工作流

#### 场景：你在家开发，然后去办公室

```bash
# ========== 在家（Mac）==========

# 1. 拉取最新代码
$ git pull origin dev

# 2. 启动本地 Supabase
$ supabase start

# 3. 开发新功能（例如添加 ML 表）
$ supabase migration new add_user_corrections
# 编辑 SQL...

# 4. 在本地测试
$ supabase db reset
$ pnpm dev
# 测试功能...

# 5. 提交代码（但不推送）
$ git add .
$ git commit -m "feat: add user corrections table"

# 6. 关闭本地 Supabase（节省资源）
$ supabase stop

# ========== 去办公室（另一台电脑）==========

# 7. 拉取你在家的提交
$ git pull origin dev

# 8. 启动本地 Supabase
$ supabase start

# 9. 应用迁移（自动同步）
$ supabase db reset
# 你在家写的 ML 表自动创建 ✅

# 10. 继续开发...

# ========== 功能完成后 ==========

# 11. 推送到 Dev Cloud
$ git push origin dev

# 12. 在 Supabase Dashboard 应用迁移到 JobSite-Snap-Dev
# 或者用 CLI:
$ supabase link --project-ref xxxxx
$ supabase db push

# 13. COO 在 dev.ledgersnap.app 验收 ✅
```

---

## 🗂️ 迁移文件管理最佳实践

### 原则：迁移文件 = 唯一真相来源

```yaml
✅ 正确做法:

1. 所有数据库改动都通过迁移文件
   ❌ 不要直接在 Supabase Dashboard 改表结构
   ✅ 创建迁移文件 → 应用到各环境

2. 迁移文件只增不改
   ❌ 不要修改已应用的迁移
   ✅ 创建新迁移来修正错误

3. 迁移文件提交到 Git
   ✅ 团队共享
   ✅ 版本控制
   ✅ 可回滚

4. 迁移文件命名清晰
   ✅ 20260125000000_add_ml_tables.sql
   ✅ 20260126000000_add_vendor_index.sql
   ❌ migration_1.sql

示例:
  # 错误：直接在 Dashboard 改表
  在 Supabase Dashboard 点击 "Add Column"
  → 其他机器不知道这个改动
  → 代码会报错

  # 正确：通过迁移
  $ supabase migration new add_email_column
  # 编辑 SQL...
  ALTER TABLE users ADD COLUMN email TEXT;
  
  $ git add supabase/migrations/xxx_add_email_column.sql
  $ git commit -m "feat: add email column"
  $ git push
  
  → 其他机器 git pull 后自动同步 ✅
```

---

## 🔐 环境隔离最佳实践

### 数据隔离

```yaml
问题: 开发时会污染生产数据吗？

答案: ❌ 不会（如果正确配置）

原因:
  Local Dev → 本地数据库（127.0.0.1:54322）
    - 完全独立
    - 数据互不影响
  
  Dev Cloud → JobSite-Snap-Dev
    - 测试数据
    - 可以随便删除
  
  Production → JobSite-Snap-Core
    - 真实用户数据
    - 只部署测试通过的代码

关键: .env 文件配置不同的 SUPABASE_URL
```

### 代码隔离

```yaml
Git 分支策略:

main 分支:
  → 对应 Production（www.ledgersnap.app）
  → 只接受 PR（不直接提交）
  → 代码必须经过 Dev 测试

dev 分支:
  → 对应 Dev Cloud（dev.ledgersnap.app）
  → 日常开发提交到这里
  → 测试通过后合并到 main

feature/* 分支（可选）:
  → 对应 Local Dev
  → 实验性功能
  → 完成后合并到 dev

工作流:
  feature/ml-learning → dev → main
  (本地实验)      → (团队测试) → (生产发布)
```

---

## 🚀 立即实施步骤

### Phase 1: 配置环境（今天，30 分钟）

```bash
# 在 Cursor 中操作:

# 1. 创建环境变量文件
Cmd + L → 

"Claude，帮我创建 3 个环境变量文件:
1. .env.local（本地 Supabase）
2. .env.development（JobSite-Snap-Dev）
3. .env.production（JobSite-Snap-Core）

本地 Supabase URL: http://127.0.0.1:54321
Dev Supabase URL: [你的 Dev 项目 URL]
Production Supabase URL: [你的 Core 项目 URL]"

# 2. 更新 .gitignore
确保 .env.local 不被提交

# 3. 验证配置
$ pnpm dev
# 检查连接的是哪个数据库
```

---

### Phase 2: 同步迁移到云端（今天，15 分钟）

```bash
# 你已经在本地创建了 ML 表
# 现在需要同步到 Dev Cloud

# 方法 1: 使用 Supabase CLI（推荐）
$ supabase link --project-ref [你的 Dev 项目 ID]
# 项目 ID 在 Supabase Dashboard → Settings → General

$ supabase db push
# 自动将本地迁移应用到 Dev Cloud ✅

# 方法 2: 手动复制 SQL
$ cat supabase/migrations/20260124000000_ml_training_tables.sql
# 复制 SQL 内容
# 打开 Supabase Dashboard → SQL Editor
# 粘贴并运行 ✅
```

---

### Phase 3: 配置 Vercel 环境变量（今天，10 分钟）

```bash
# 登录 Vercel Dashboard
https://vercel.com/

# 选择 ls-web 项目
→ Settings → Environment Variables

# 添加 Development 变量:
NEXT_PUBLIC_SUPABASE_URL = [JobSite-Snap-Dev URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Dev anon key]
Environment: Preview (dev.ledgersnap.app)

# 添加 Production 变量:
NEXT_PUBLIC_SUPABASE_URL = [JobSite-Snap-Core URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Core anon key]
Environment: Production (www.ledgersnap.app)

# 重新部署
→ Deployments → 点击最新部署 → Redeploy
```

---

## 📊 验收清单

### 环境配置验收

```yaml
☐ 本地开发环境:
  - .env.local 存在
  - 连接到本地 Supabase (127.0.0.1:54321)
  - pnpm dev 能启动
  - 能看到 ML 表

☐ Dev Cloud 环境:
  - .env.development 存在
  - JobSite-Snap-Dev 有 ML 表
  - dev.ledgersnap.app 能访问
  - Vercel 环境变量已配置

☐ Production 环境:
  - .env.production 存在
  - JobSite-Snap-Core 暂时不动（等 Dev 测试通过）
  - www.ledgersnap.app 正常运行

☐ Git 配置:
  - .gitignore 包含 .env.local
  - 迁移文件已提交
  - dev 分支存在
```

---

## 🎯 工作流程示例

### 场景：CEO Patrick 开发新功能

```bash
# ========== Day 1: 本地开发 ==========

# 在家的 Mac 上
$ git checkout dev
$ git pull origin dev
$ supabase start

# 创建新功能（例如商户标准化）
$ supabase migration new vendor_standardization
# 编辑 SQL...

$ supabase db reset  # 应用迁移到本地
$ pnpm dev  # 测试功能

# 本地测试通过
$ git add .
$ git commit -m "feat: vendor standardization"
$ git push origin dev

# ========== Day 2: 云端测试 ==========

# 在 Supabase Dashboard 应用迁移到 Dev
# 或使用 CLI:
$ supabase link --project-ref [Dev ID]
$ supabase db push

# Vercel 自动部署 dev.ledgersnap.app

# 通知 COO: "Gemini，请在 dev.ledgersnap.app 测试商户标准化功能"

# ========== Day 3: COO 验收 ==========

# COO 测试后反馈: "有个 Bug，商户名显示错误"

# CEO 修复:
$ git pull origin dev  # 拉取最新（可能其他改动）
$ supabase start
$ supabase db reset

# 修复 Bug...
$ git commit -m "fix: vendor name display"
$ git push origin dev

# 重新部署到 Dev Cloud
$ supabase db push

# COO 再次测试: "好了，可以上线"

# ========== Day 4: 发布生产 ==========

# CEO 合并到 Production:
$ git checkout main
$ git pull origin main
$ git merge dev  # 合并 dev 分支
$ git push origin main

# Vercel 自动部署到 www.ledgersnap.app

# 应用迁移到 Production:
$ supabase link --project-ref [Core ID]
$ supabase db push

# ✅ 新功能上线
```

---

## 💡 关键洞察

### 本地 Supabase 的价值

```yaml
你的疑问: "本地 Supabase 和云端的关系？"

答案: 
  本地 = 你的私人沙盒
  云端 = 团队共享舞台

本地的价值:
  1. 快速迭代（不需要等云端响应）
  2. 离线开发（地铁上也能写代码）
  3. 安全试错（改坏了不影响别人）
  4. 免费（不消耗云端配额）
  5. 真实环境（和云端 100% 一致）

类比:
  就像画家的草稿本
  - 在草稿本上练习（本地）
  - 满意后画到画布（Dev Cloud）
  - 完成后展览（Production）
```

### 多环境的必要性

```yaml
为什么不直接用 Dev Cloud？

问题:
  ❌ 网络延迟（每次改代码等 3 秒）
  ❌ 多人冲突（你改表时 COO 在测试）
  ❌ 消耗配额（Supabase 有免费额度限制）
  ❌ 无法离线（温哥华的地铁）

有了本地:
  ✅ 即时响应（本地数据库）
  ✅ 独立空间（不影响别人）
  ✅ 无限测试（免费）
  ✅ 离线可用（地铁上写代码）
```

---

## 🚨 常见错误避免

### 错误 1: 在 Dashboard 直接改表结构

```yaml
❌ 错误做法:
  登录 Supabase Dashboard
  → 点击 "New Column"
  → 手动添加字段

问题:
  - 其他机器不知道这个改动
  - Git 没有记录
  - 无法回滚

✅ 正确做法:
  $ supabase migration new add_column
  # 编辑 SQL...
  $ git commit
  $ supabase db push
```

### 错误 2: 修改已应用的迁移

```yaml
❌ 错误做法:
  # 已经应用了 20260124_add_users.sql
  # 发现字段名写错了
  # 直接改文件: ALTER TABLE users ADD COLUMN nam...
  # 改成: ALTER TABLE users ADD COLUMN name...

问题:
  - 其他环境已经有旧版本
  - 重新应用会报错（字段已存在）

✅ 正确做法:
  # 创建新迁移修正错误
  $ supabase migration new fix_column_name
  # 内容: ALTER TABLE users RENAME COLUMN nam TO name;
```

### 错误 3: 环境变量混乱

```yaml
❌ 错误做法:
  本地开发但 .env.local 指向 Production
  → 测试数据写入生产数据库 💥

✅ 正确做法:
  本地: .env.local → 127.0.0.1:54321
  Dev: .env.development → JobSite-Snap-Dev
  Prod: .env.production → JobSite-Snap-Core
  
  Vercel 自动选择对应环境 ✅
```

---

## 📚 总结

### 你的问题回答

```yaml
Q1: "本地 Supabase 和云端的关系？"
A1: 完全独立，通过迁移文件同步架构（不同步数据）

Q2: "怎么在任意机器开发？"
A2: Git 管理代码 + 迁移文件，pull 后自动同步

Q3: "原来的想法怎么样？"
A3: ⭐⭐⭐⭐⭐ 非常专业！加上本地环境更完美

Q4: "现在要怎么做？"
A4: 
  1. 配置 3 个 .env 文件
  2. 同步迁移到 Dev Cloud
  3. 配置 Vercel 环境变量
  4. 开始用标准工作流开发
```

### 最终架构

```
开发流程:
  Local Dev (本地快速迭代)
      ↓
  Dev Cloud (团队协作测试)
      ↓
  Production (用户使用)

数据库:
  Local: 127.0.0.1:54322 (独立)
  Dev: JobSite-Snap-Dev (supabase.com)
  Prod: JobSite-Snap-Core (supabase.com)

域名:
  Local: localhost:3000
  Dev: dev.ledgersnap.app
  Prod: www.ledgersnap.app

Git 分支:
  feature/* → dev → main
```

---

**文档维护者**: Claude (CTO)  
**架构设计**: Patrick (CEO) ⭐⭐⭐⭐⭐ 优秀！  
**当前任务**: 配置多环境  
**预计完成**: 今天（1 小时）
