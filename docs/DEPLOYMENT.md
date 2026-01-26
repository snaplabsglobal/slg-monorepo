# 部署指南 - ls-web 到 Dev Cloud

## 部署到 Vercel Dev 环境

### 方法 1: 使用 Vercel CLI（推荐）

```bash
# 1. 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 在 ls-web 目录下部署到开发环境
cd apps/ls-web
vercel --prod=false

# 或者直接部署到开发环境
vercel dev
```

### 方法 2: 通过 Vercel Dashboard

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 导入 GitHub 仓库 `snaplabsglobal/slg-monorepo`
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/ls-web`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter ls-web build`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && pnpm install`

### 环境变量配置

在 Vercel Dashboard 中设置以下环境变量：

**Development 环境：**
```
NEXT_PUBLIC_SUPABASE_URL=https://kojxysllasxnybahbggu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvanh5c2xsYXN4bnliYWhiZ2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTM0NzMsImV4cCI6MjA4NDAyOTQ3M30.47L-ryoXYRbYDM42eQ7FXumCvnBTzdfV45BaasSTz24
NEXT_PUBLIC_ENV=development
GEMINI_API_KEY=AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI
```

**Production 环境：**
```
NEXT_PUBLIC_SUPABASE_URL=https://zqbudwdlwogimrzdmduq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[生产环境的 anon key]
NEXT_PUBLIC_ENV=production
GEMINI_API_KEY=AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI
```

### 方法 3: 使用 Git Push（自动部署）

如果已配置 Vercel GitHub 集成：

```bash
# 1. 提交代码
git add .
git commit -m "feat: prepare ls-web for deployment"
git push origin dev

# 2. Vercel 会自动检测并部署（如果配置了自动部署）
```

### 验证部署

部署成功后，访问：
- **Preview URL**: `https://ls-web-xxx.vercel.app`（每次 push 生成新的预览）
- **Production URL**: `https://ls-web.vercel.app`（如果设置了生产域名）

### 故障排查

1. **构建失败**：
   - 检查 `package.json` 中的依赖
   - 确保 `pnpm` 已安装
   - 检查构建日志

2. **环境变量未生效**：
   - 在 Vercel Dashboard 中重新设置环境变量
   - 重新部署项目

3. **路由 404**：
   - 检查 `next.config.ts` 配置
   - 确保 `app/page.tsx` 存在
