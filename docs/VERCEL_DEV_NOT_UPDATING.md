# dev.ledgersnap.app 没有更新 - 排查步骤

push 到 `dev` 后，若 https://dev.ledgersnap.app 仍显示旧内容，按下面顺序排查。

## 0. 确认你 push 的分支

- 你刚才 push 的是 **`origin/dev`**（分支名：`dev`）。
- Vercel 的 **Dev 环境 / Preview** 必须部署 **`dev`** 分支，`dev.ledgersnap.app` 必须指向该部署。
- 在 Vercel Dashboard → **Settings → Git** 确认：
  - **Production Branch**：若 dev 域名用的是 Production，则这里应为 `dev`；否则在 **Settings → Domains** 里看 `dev.ledgersnap.app` 绑定到哪个分支/部署。

## 0.1 Vercel 环境变量清单（ls-web）

在 **Vercel 项目 → Settings → Environment Variables** 中，为 **Preview**（或 Dev）环境配置：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL（Dev 用 dev 项目） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `NEXT_PUBLIC_ENV` | ✅ | 填 `development`（Dev 环境） |
| `GEMINI_API_KEY` | ✅ | 收据 AI 分析；未配置会导致 `/api/receipts/[id]/analyze` 500 |
| `SUPABASE_SERVICE_ROLE_KEY` | 可选 | 仅当使用 Cron 清理回收站时需要 |
| `CRON_SECRET` | 可选 | 仅当使用 Vercel Cron 时需要 |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_R2_*` 或 `R2_*` | 可选 | 上传到 R2 时需要 |

漏配 **Supabase URL/Key** 可能导致 SSR/Realtime 报错（如 React #419）；漏配 **GEMINI_API_KEY** 会导致收据分析 500。添加或修改环境变量后需 **Redeploy** 才会生效。

## 1. 确认是 Vercel 部署问题还是缓存问题

### A. 看 Vercel 是否已用最新 commit 部署

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard) → 选 **ls-web**（或对应 monorepo 项目）。
2. 打开 **Deployments** 标签。
3. 看**最新一条**部署：
   - **Branch** 是否为 `dev`？
   - **Commit** 是否为刚 push 的（例如 `55fbddb7`）？
   - **Status** 是否为 **Ready**？若为 Failed，点进去看构建日志。
4. 若最新部署的 commit 不是你的最新 push → 说明 **Vercel 没触发部署** 或 **部署失败**，见下文「Vercel 未部署/失败」。
5. 若最新部署已是正确 commit 且 Ready → 多半是 **缓存**，见「B. 缓存」和「2. 解决缓存」。

### B. 快速自测：是否缓存

- **无痕/隐私窗口** 打开：`https://dev.ledgersnap.app/dashboard`  
  或用手机 4G 开同一链接（不用家里 WiFi）。
- 若**无痕/4G 上是新内容**，本机正常窗口是旧的 → **浏览器或本地网络缓存**。
- 若**无痕/4G 上也是旧的** → 更可能是 **Vercel 域名绑错部署** 或 **CDN 缓存**，继续下面步骤。

---

## 2. 按情况处理

### 情况一：Vercel 未部署或部署失败

- **未触发部署**  
  - 检查 Vercel 项目 **Settings → Git**：确认连的是正确仓库、分支是 `dev`，且 **Production Branch** 或用于 dev.ledgersnap.app 的分支是 `dev`。
  - 可手动 **Redeploy**：Deployments → 选最新一次 → 右上 **⋯** → **Redeploy**（必要时勾选 **Clear Build Cache**）。
- **部署失败**  
  - 点进该次部署看 **Build Logs**，按报错修（依赖、环境变量、Root Directory、Build Command 等）。  
  - 文档参考：`docs/DEPLOYMENT.md`、`docs/VERCEL_404_TROUBLESHOOTING.md`。

### 情况二：Vercel 已是最新，但页面仍是旧的（缓存）

1. **Vercel 域名绑的是哪次部署**  
   - **Settings → Domains**：看 `dev.ledgersnap.app` 指向哪个分支/部署。  
   - 若指向的是旧 Deployment，改成当前 **Production** 或指向 `dev` 分支的最新部署。

2. **强制用最新部署**  
   - **Deployments** → 找到 commit 正确且 Ready 的那次 → **⋯** → **Promote to Production**（若 dev 域名跟 Production 一致）。  
   - 或 **Redeploy** 并勾选 **Clear Build Cache**，再等部署完成。

3. **浏览器/本地缓存**  
   - 硬刷新：`Ctrl+Shift+R`（Windows/Linux）或 `Cmd+Shift+R`（Mac）。  
   - 或 F12 → Application → **Clear site data** / **Empty cache and hard reload**。

4. **CDN/边缘缓存**  
   - 项目里已为 `/dashboard` 等动态路由设置 `Cache-Control: private, no-store`（见 `next.config.mjs`），新部署生效后不应长期缓存。  
   - 若仍怀疑 Vercel 边缘缓存：在 Vercel 里对该项目做一次 **Redeploy** 并勾选 **Clear Build Cache**。

---

## 3. 小结

| 现象 | 优先检查 | 建议操作 |
|------|----------|----------|
| Deployments 里没有最新 commit | Git 连接 / 分支 / 触发 | 修设置或手动 Redeploy |
| 最新部署 Failed | Build Logs | 按报错修依赖/配置 |
| 最新部署 Ready，但域名还是旧 | Domains 指向 / Production 分支 | 改域名指向或 Promote 最新部署 |
| 无痕/4G 已是新内容 | 本地/浏览器缓存 | 硬刷新或清站数据 |
| 无痕/4G 也是旧内容 | Vercel 域名 + CDN | Redeploy + Clear Cache，确认域名指向 |

---

## 4. 本项目已做的防缓存配置

- `next.config.mjs` 中为 `/dashboard` 及需要即时更新的路由设置了 **headers**：`Cache-Control: private, no-store`，减少 CDN/浏览器对动态页的缓存。  
- 部署生效后，新访问 `/dashboard` 应拿到最新内容；若仍不更新，按上面步骤排查 Vercel 与缓存即可。

---

## 5. 控制台错误说明（Vercel 部署后）

在 dev.ledgersnap.app 或 Vercel 预览页打开 F12 时，可能看到以下信息，多数**不是应用代码问题**：

| 控制台信息 | 含义 | 处理建议 |
|------------|------|----------|
| **React #419**（Minified error #419） | 服务端渲染某 Suspense 边界时出错，React 回退到客户端渲染。 | 已在 `/dashboard`、`/dashboard/ml` 加 `force-dynamic` 和 try/catch，避免 auth/SSR 抛错导致 419。若仍出现，检查 Vercel 环境变量（Supabase URL/Key）和构建日志。 |
| **POST vercel.com/api/stream/internal** 或 **api/jwt** 报 `net::ERR_BLOCKED_BY_CLIENT` | 页面加载了 Vercel 的 Speed Insights / Analytics 脚本，请求被浏览器扩展（广告/隐私拦截）拦截。 | 来自 Vercel 脚本，非应用请求。可忽略，或关闭对应扩展/将 vercel.com 加入白名单。 |
| **GET …/production-deployment 404** | Vercel Dashboard 或前端脚本在请求项目「生产部署」信息，当前项目/团队下可能没有 production 部署或 API 路径不匹配。 | 属 Vercel 后台/前端逻辑，与 ls-web 业务无关。可忽略。 |
| **The resource &lt;URL&gt; was preloaded using link preload but not used** | Next.js 预加载了部分 chunk，但几秒内未使用。 | 已在 ls-web 中为所有 `<Link>` 添加 `prefetch={false}`，减少预加载的 route chunk，从而减少该警告。若仍有个别出现可忽略。 |
| **GET …/api.knock.app/… 429 (Too Many Requests)** | Knock 通知 feed 请求被限流。 | 来自 Vercel/Knock 集成，请求过于频繁时会出现。可忽略或检查 Knock 用量/限流配置。 |
| **WebSocket connection to …supabase.co/realtime/… failed: WebSocket is closed before the connection is established** | 页面切换或组件卸载时，Supabase Realtime 频道在连接建立前被关闭。 | 已在 `useRealtimeTransactions` 中改为异步清理频道，减少该报错。若偶发可忽略；若频繁出现可检查是否在 layout 中过早卸载订阅。 |
| **GET …/_next/image?url=…supabase.co/… 400 (Bad Request)** | Next.js Image 组件优化外部图片时，未允许 Supabase Storage 域名。 | 已在 `next.config.mjs` 的 `images.remotePatterns` 中加入 `*.supabase.co`（pathname `/storage/v1/object/public/**`）。部署后生效。 |
| **POST …/api/receipts/[id]/analyze 500** | 收据 AI 分析接口报错。 | 在 Vercel 项目 **Settings → Environment Variables** 中配置 **GEMINI_API_KEY**（或项目使用的 Gemini 环境变量名）。未配置或 key 无效会导致 500。 |

若**只有**上述几类，而页面功能正常，无需修改应用代码；若伴随**白屏、接口 4xx/5xx、或业务逻辑错误**，再按部署/环境/接口逐项排查。

### 5.1 已做的预加载优化（减少 “link preload but not used”）

- 在 **ls-web** 中，对所有 `next/link` 的 `<Link>` 组件设置了 **`prefetch={false}`**（包括 Dashboard 侧栏、上传按钮、设置/回收站/项目/事务等内链，以及首页的登录/注册链接）。
- 这样 Next.js 不会在首屏或 hover 时预取这些路由的 chunk，从而减少「预加载了但几秒内未使用」的警告。导航时仍会正常加载对应页面，仅首点可能略慢一帧。
