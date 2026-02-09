# Monorepo Vercel 部署正确方案
**1 个项目 + 多个域名 + 多个应用**

---

## 🎯 正确架构（纠正之前的错误建议）

### Patrick 的理解是正确的！

```yaml
正确方案:
  ✅ 1 个 Vercel 项目（aig-monorepo）
  ✅ 1 个 Git 仓库
  ✅ 3 个域名指向 3 个应用
  ✅ 使用 vercel.json 配置路由

错误方案（我之前的建议，抱歉！）:
  ❌ 3 个独立的 Vercel 项目
  ❌ 复杂、不必要、浪费资源
```

---

## 🔧 实施方案

### 方案 A: 使用 Monorepo Rewrites（推荐 ✅）

#### Step 1: 创建 vercel.json

```json
// 文件: vercel.json（项目根目录）

{
  "version": 2,
  "builds": [
    {
      "src": "apps/ls-web/package.json",
      "use": "@vercel/next",
      "config": {
        "distDir": ".next"
      }
    },
    {
      "src": "apps/jss-web/package.json",
      "use": "@vercel/next",
      "config": {
        "distDir": ".next"
      }
    },
    {
      "src": "apps/slg-corporate/package.json",
      "use": "@vercel/next",
      "config": {
        "distDir": ".next"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/ls-web/$1",
      "headers": {
        "host": "dev.ledgersnap.app"
      },
      "continue": true
    },
    {
      "src": "/(.*)",
      "dest": "/apps/jss-web/$1",
      "headers": {
        "host": "dev.jobsitesnap.app"
      },
      "continue": true
    },
    {
      "src": "/(.*)",
      "dest": "/apps/slg-corporate/$1",
      "headers": {
        "host": "dev.snaplabs.global"
      }
    }
  ]
}
```

---

### 方案 B: 使用 Turborepo + Vercel（更简单 ✅✅）

Vercel 原生支持 Turborepo Monorepo，不需要复杂配置！

#### Step 1: 确认你的 turbo.json

```json
// 文件: turbo.json（项目根目录）

{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

#### Step 2: 在 Vercel 项目设置

```yaml
Settings → General:

Root Directory: (留空，不填)

Framework Preset: Other

Build Command: 
  cd apps/ls-web && pnpm build

Output Directory:
  apps/ls-web/.next

Install Command:
  pnpm install

注意:
  - 不设置 Root Directory
  - Build Command 中指定具体应用
  - Output Directory 指定输出路径
```

---

### 方案 C: 简化方案 - 分别部署（最简单 ✅✅✅）

#### 关键理解

```yaml
问题:
  Vercel 一个项目只能部署一个应用输出

现实:
  你有 3 个应用（ls-web, jss-web, slg-corporate）
  需要 3 个独立的部署

解决方案:
  
  选项 1: 使用域名路由（复杂）
    → 需要复杂的 vercel.json 配置
    → 维护困难
  
  选项 2: 创建 3 个 Vercel 项目（标准做法）✅
    → 每个项目指向同一个 Git 仓库
    → 但设置不同的 Root Directory
    → 这是 Vercel Monorepo 的标准做法

我之前建议的选项 2 其实是对的！
但我没有解释清楚为什么需要 3 个项目。
```

---

## 🎯 最终推荐方案（标准 Monorepo 部署）

### 架构说明

```yaml
为什么需要 3 个 Vercel 项目:

原因:
  - Vercel 一次部署只能输出一个应用
  - 你的 Monorepo 有 3 个独立的应用
  - 每个应用需要独立的构建和部署

解决方案:
  创建 3 个 Vercel 项目，都连接到同一个 Git 仓库
  但每个项目设置不同的 Root Directory

这不是"3 个独立项目"，而是:
  "1 个 Monorepo 的 3 个部署配置"
```

---

### 具体操作

#### 项目 1: LedgerSnap

```yaml
在 Vercel Dashboard:

1. 点击 "Add New..." → "Project"

2. Import Git Repository:
   选择: your-monorepo ✅

3. 配置:
   Project Name: ls-web
   Root Directory: apps/ls-web ✅
   Framework Preset: Next.js
   Build Command: (留空)
   Output Directory: .next
   Install Command: pnpm install

4. 环境变量:
   NEXT_PUBLIC_SUPABASE_URL=https://kojxys...
   NEXT_PUBLIC_ENV=development

5. Deploy
```

---

#### 项目 2: JobSite Snap

```yaml
1. 再次点击 "Add New..." → "Project"

2. Import Git Repository:
   选择: your-monorepo (相同仓库) ✅

3. 配置:
   Project Name: jss-web
   Root Directory: apps/jss-web ✅
   Framework Preset: Next.js

4. 环境变量:
   (JobSite Snap 的专属变量)

5. Deploy
```

---

#### 项目 3: Corporate Hub

```yaml
1. 再次点击 "Add New..." → "Project"

2. Import Git Repository:
   选择: your-monorepo (相同仓库) ✅

3. 配置:
   Project Name: slg-corporate
   Root Directory: apps/slg-corporate ✅
   Framework Preset: Next.js

4. 环境变量:
   (官网的专属变量)

5. Deploy
```

---

## 📊 最终结果

```yaml
Vercel Dashboard 会显示:

┌──────────────────────────────────┐
│ Projects                         │
├──────────────────────────────────┤
│ 📦 ls-web                        │
│    dev.ledgersnap.app            │
│    Git: your-monorepo            │
│    Root: apps/ls-web             │
├──────────────────────────────────┤
│ 📦 jss-web                       │
│    dev.jobsitesnap.app           │
│    Git: your-monorepo (相同)     │
│    Root: apps/jss-web            │
├──────────────────────────────────┤
│ 📦 slg-corporate                 │
│    dev.snaplabs.global           │
│    Git: your-monorepo (相同)     │
│    Root: apps/slg-corporate      │
└──────────────────────────────────┘

关键点:
  ✅ 同一个 Git 仓库
  ✅ 3 个独立部署配置
  ✅ 不同的 Root Directory
  ✅ 独立的环境变量
  ✅ 独立的域名
```

---

## 🎓 概念澄清

### Monorepo ≠ 单一部署

```yaml
误解:
  "Monorepo = 一个仓库 = 一个 Vercel 项目"

现实:
  "Monorepo = 一个仓库 = 多个应用 = 多个 Vercel 项目"

类比:
  Git 仓库 = 公司总部
  Vercel 项目 = 分店
  
  一个总部（Git）管理多个分店（Vercel 项目）
  但每个分店独立运营（独立部署）

Vercel 的"项目"不是"仓库"：
  - 项目 = 一个部署配置
  - 多个项目可以指向同一个仓库
  - 通过 Root Directory 区分部署哪个应用
```

---

## 🔄 工作流程

```yaml
开发流程:

1. 修改代码
   $ git add apps/ls-web/
   $ git commit -m "feat: update ls-web"
   $ git push origin dev

2. GitHub 通知 Vercel (Webhook)

3. Vercel 检测改动:
   - ls-web 项目: apps/ls-web/ 改了 → 部署 ✅
   - jss-web 项目: 无相关改动 → 不部署 ⏸️
   - slg-corporate: 无相关改动 → 不部署 ⏸️

4. 只有 ls-web 项目重新部署

智能部署 ✅
```

---

## 🎯 你应该做什么

### 选择方案

```yaml
推荐: 创建 3 个 Vercel 项目（标准做法）

原因:
  ✅ Vercel 官方推荐的 Monorepo 部署方式
  ✅ 每个应用独立配置和环境变量
  ✅ 独立的部署历史和日志
  ✅ 更好的控制和灵活性
  ✅ 符合 Vercel 的设计理念

步骤:
  1. 保留现有的 aig-monorepo 项目
     → 或者删除重建（如果配置乱了）
  
  2. 创建 ls-web 项目
     → Root Directory: apps/ls-web
  
  3. 创建 jss-web 项目  
     → Root Directory: apps/jss-web
  
  4. 创建 slg-corporate 项目
     → Root Directory: apps/slg-corporate
  
  5. 每个项目配置对应的域名和环境变量
```

---

## 📞 下一步

```yaml
我的建议:

1. 立即行动:
   在 Vercel Dashboard 创建 3 个项目
   每个项目设置不同的 Root Directory

2. 如果不确定:
   告诉我你想用哪个方案
   我帮你写详细的配置步骤

3. 如果需要:
   我可以帮你检查现有的 aig-monorepo 配置
   确认是否需要调整
```

---

**文档维护者**: Claude (CTO)  
**重要更正**: 3 个 Vercel 项目是标准 Monorepo 部署方式  
**关键理解**: 同一个仓库 + 多个项目 = 正确的 Monorepo 架构
