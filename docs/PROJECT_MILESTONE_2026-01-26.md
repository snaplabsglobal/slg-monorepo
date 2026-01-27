# SnapLabs Global - 项目里程碑文档
**Project Milestone Document**

---

## 📊 项目概览

**公司**: SnapLabs Global  
**CTO**: Patrick Jiang  
**日期**: 2026-01-26  
**状态**: MVP 开发阶段

---

## 🎯 产品矩阵

### 1. LedgerSnap（费用管理）
```yaml
定位: B2B SaaS - 收据拍照识别
目标用户: 中小企业、自由职业者
核心功能:
  - AI 收据识别
  - 费用自动分类
  - 报表生成
  - 云端存储

当前状态: ✅ Landing Page 已上线
URL: https://dev.ledgersnap.app
```

### 2. JobSite Snap（工地考勤）
```yaml
定位: B2B SaaS - 建筑工地数字化
目标用户: 建筑承包商、工地经理
核心功能:
  - 纸质考勤卡数字化
  - 工时自动识别
  - 工人管理
  - 工资报表

当前状态: ✅ Landing Page 已上线
URL: https://dev.jobsitesnap.app
```

### 3. SnapLabs Corporate（公司官网）
```yaml
定位: 企业门户网站
目标用户: 投资人、客户、合作伙伴
核心功能:
  - 公司介绍
  - 产品展示
  - 联系方式

当前状态: ✅ Landing Page 已上线
URL: https://dev.snaplabs.global
```

---

## 🏗️ 技术架构

### 技术栈
```yaml
前端框架: Next.js 16 (App Router)
语言: TypeScript
包管理: pnpm 8.x
样式: Tailwind CSS
组件库: shadcn/ui (计划)

后端:
  数据库: Supabase (PostgreSQL)
  认证: Supabase Auth
  存储: Supabase Storage
  实时: Supabase Realtime

部署:
  平台: Vercel
  CI/CD: GitHub → Vercel 自动部署
  域名: Namecheap/其他

代码管理:
  仓库: GitHub (Private)
  架构: Monorepo
  工作区: pnpm workspaces
```

### Monorepo 结构
```
slg-monorepo/
├── apps/
│   ├── ls-web/           # LedgerSnap
│   ├── jss-web/          # JobSite Snap
│   └── slg-corporate/    # 公司官网
├── packages/
│   ├── snap-ui/          # 共享 UI 组件
│   └── snap-types/       # 共享类型定义
├── supabase/
│   └── migrations/       # 数据库迁移
├── pnpm-workspace.yaml
└── turbo.json
```

### 部署策略
```yaml
分支策略:
  main (生产环境):
    → www.ledgersnap.app
    → www.jobsitesnap.app
    → www.snaplabs.global
  
  dev (开发环境):
    → dev.ledgersnap.app
    → dev.jobsitesnap.app
    → dev.snaplabs.global

Vercel 配置:
  - 每个应用独立的 Vercel 项目
  - Root Directory 分别指向 apps/xxx
  - 自动部署（Git push 触发）
  - Preview Deployment Protection: 关闭
```

---

## ✅ 已完成的里程碑

### Phase 1: 基础设施搭建 (完成日期: 2026-01-26)

```yaml
✅ Monorepo 架构设计
  - 3 个应用目录结构
  - pnpm workspace 配置
  - Turbo 构建系统

✅ Vercel 部署配置
  - 3 个独立 Vercel 项目
  - Root Directory 配置正确
  - pnpm 包管理器配置
  - TypeScript 依赖完整
  - 自动部署 Webhook

✅ 三个 Landing Pages
  - LedgerSnap: Hero + Features + CTA
  - JobSite Snap: Hero + Features + CTA
  - SnapLabs Corporate: 公司介绍 + 产品展示

✅ 域名配置
  - dev.ledgersnap.app ✅
  - dev.jobsitesnap.app ✅
  - dev.snaplabs.global ✅
  - DNS 解析正常
  - HTTPS 自动配置

✅ 移动端适配
  - 响应式设计
  - 移动端访问正常
  - Vercel Authentication 问题已解决
```

### Phase 2: Service Snap QR 功能设计 (完成日期: 2026-01-26)

```yaml
✅ 数据库架构设计
  核心表结构（8张表）:
    1. properties - 房产信息
    2. companies - 公司信息
    3. equipment_registry - 设备注册（核心）
    4. service_history - 服务记录
    5. qr_scan_logs - 扫描日志
    6. service_requests - 服务请求
    7. company_ratings - 公司评分
    8. qr_generation_config - QR 生成配置

✅ 功能特性:
  - 设备全生命周期管理
  - 隐私分级（公开/私有/授权）
  - 智能路由（附近师傅推荐）
  - 地理位置搜索
  - 完整服务历史追踪
  - 评分系统

✅ 性能优化:
  - 20+ 个关键索引
  - 复杂查询视图
  - 自动化触发器
  - Row Level Security (RLS)

✅ 交付文件:
  - service_snap_qr_migration.sql
  - 完整的 SQL 迁移脚本
  - 示例数据
```

### Phase 3: Home Hero 免费贴纸引流方案 (完成日期: 2026-01-26)

```yaml
✅ 商业模式设计
  核心逻辑: "领贴纸" → "成客户"
  
  获客成本 (CAC): $0.40
    - 印刷成本: $0.05/张
    - 预期激活率: 12.5%
    - 10张贴纸 = 1个注册用户
  
  对比 Google Ads: $5-10/点击
  ROI: 86倍 🚀

✅ 产品层级设计
  Home Hero (免费):
    - 最多 20 台设备
    - 最多 5 个房产
    - 基础服务提醒
    - 基础报表
  
  Pro ($29/月):
    - 无限设备和房产
    - 高级财务报表
    - API 访问
    - 白标定制
  
  Enterprise (定制):
    - Pro + 专属支持

✅ 技术实现设计
  数据库扩展（4张新表）:
    1. qr_batches - 批次管理
    2. pre_activation_qr_codes - 预激活码
    3. user_subscription_tiers - 订阅层级
    4. 扩展字段到 equipment_registry
  
  核心功能:
    - 批量 QR Code 生成（10,000+）
    - 扫码即绑定流程
    - 设备数量限制检查
    - 智能升级提示
    - 批次效果追踪
    - 转化漏斗分析

✅ 安全机制
  - HMAC-SHA256 签名验证
  - 一次性验证令牌
  - IP 限制（防批量激活）
  - 时间窗口限制

✅ 交付文件:
  - home_hero_sticker_campaign_migration.sql
  - HOME_HERO_STICKER_CAMPAIGN_SPEC.md
  - 完整的技术规格文档
  - API 端点设计
  - 前端实现示例
```

---

## 📂 重要文件清单

### 数据库迁移文件

```yaml
1. service_snap_qr_migration.sql
   位置: /mnt/user-data/outputs/
   内容:
     - 8张核心表
     - 20+ 索引
     - 触发器和函数
     - RLS 策略
     - 视图
     - 示例数据
   状态: ✅ 已生成，待执行

2. home_hero_sticker_campaign_migration.sql
   位置: /mnt/user-data/outputs/
   内容:
     - 4张扩展表
     - 订阅层级系统
     - 批量生成函数
     - 激活流程函数
     - 统计视图
   状态: ✅ 已生成，待执行
```

### 技术文档

```yaml
3. HOME_HERO_STICKER_CAMPAIGN_SPEC.md
   位置: /mnt/user-data/outputs/
   内容:
     - 完整商业逻辑
     - 用户流程（师傅 + 屋主）
     - API 端点设计
     - 前端实现代码
     - 安全防伪机制
     - 成本和 ROI 分析
     - 实施时间表
   状态: ✅ 已生成
```

---

## 🎯 下一步行动计划

### Week 1-2: 数据库 + 认证系统

```yaml
优先级 P0:

☐ 运行数据库迁移
  1. 登录 Supabase Dashboard
  2. SQL Editor → 执行 service_snap_qr_migration.sql
  3. 执行 home_hero_sticker_campaign_migration.sql
  4. 验证表结构和触发器

☐ 开发认证系统
  1. 创建 /login 页面
  2. 创建 /register 页面
  3. 集成 Supabase Auth
  4. 实现登录/注册逻辑
  5. Session 管理
  6. 密码重置功能

☐ 认证中间件
  1. 保护需要登录的路由
  2. 公开路径白名单
  3. 重定向逻辑
```

### Week 3-4: Service Snap QR - 后端 API

```yaml
优先级 P1:

☐ QR Code 生成 API
  POST /api/qr/generate
  - 生成唯一 QR Code
  - 关联设备信息
  - 返回 QR 图片 URL

☐ QR 扫描 API
  GET /api/qr/scan/:qr_code
  - 验证 QR Code
  - 返回设备信息
  - 记录扫描日志

☐ 设备激活 API
  POST /api/qr/activate
  - 绑定设备到用户
  - 验证订阅限制
  - 创建设备记录

☐ 服务历史 API
  POST /api/service/history
  GET /api/service/history/:equipment_id
  - 添加服务记录
  - 查询服务历史
  - 计算下次维护日期

☐ 智能路由 API
  GET /api/service/nearby-companies
  - 地理位置搜索
  - 评分排序
  - 可用性检查
```

### Week 5-6: Service Snap QR - 前端 UI

```yaml
优先级 P1:

☐ 师傅端界面
  1. 设备注册表单
  2. QR Code 生成页面
  3. 设备列表管理
  4. 服务记录添加

☐ 屋主端界面
  1. 扫码公开查看页面
  2. 服务历史展示
  3. 服务请求表单
  4. 附近师傅推荐

☐ 订阅管理
  1. 订阅状态显示
  2. 升级提示 UI
  3. 限制达到提醒
  4. 升级流程
```

### Week 7-8: Home Hero 贴纸引流

```yaml
优先级 P2:

☐ 贴纸设计和生产
  1. 设计 QR Code 贴纸模板
  2. 联系印刷供应商
  3. 测试材料样品
  4. 批量生产（10,000 张）

☐ 批量生成系统
  1. 批量生成 QR Codes
  2. 导出打印文件
  3. 批次管理界面
  4. 效果追踪 Dashboard

☐ 批发商对接
  1. 联系 Emco Vancouver
  2. 联系 Andrew Sheret Burnaby
  3. 展示产品演示
  4. 签署合作协议
  5. 配送贴纸
```

---

## 📊 关键指标追踪

### 开发进度

```yaml
整体完成度: 25%

基础设施: 100% ✅
  - Monorepo 架构 ✅
  - Vercel 部署 ✅
  - Landing Pages ✅

数据库设计: 100% ✅
  - Service Snap QR ✅
  - Home Hero Campaign ✅

认证系统: 0% ⏳
  - 待开发

核心功能: 0% ⏳
  - 待开发

贴纸引流: 50% ⚠️
  - 设计完成 ✅
  - 实施待启动 ⏳
```

### 商业指标（预测）

```yaml
Home Hero 免费贴纸引流:
  投资: $500 (10,000张 × $0.05)
  预期激活: 1,250 用户 (12.5%)
  CAC: $0.40
  
  预期升级: 125 付费用户 (10%)
  年收入: $43,500 (125 × $29 × 12)
  ROI: 8,600% 🚀

Service Snap QR:
  目标市场: 温哥华地区建筑维护
  目标用户: HVAC/锅炉维修师傅
  
  Phase 1 目标:
    - 50 个注册师傅
    - 500 台注册设备
    - 10 个付费升级
```

---

## 🔐 安全和合规

### 当前安全措施

```yaml
✅ HTTPS: Vercel 自动提供
✅ 环境变量: 在 Vercel 中保护
✅ 数据库 RLS: 已设计，待实施
✅ API 验证: 待实施

⏳ 待实施:
  - Supabase Auth 集成
  - API 速率限制
  - 输入验证和清理
  - CSRF 保护
  - XSS 防护
```

### 数据隐私

```yaml
设备隐私级别:
  - Public: 任何人可查看（默认）
  - Private: 仅所有者和服务师傅
  - Authorized: 需要访问码

用户数据:
  - 存储在 Supabase (加拿大/美国)
  - Row Level Security
  - 用户只能访问自己的数据
```

---

## 🛠️ 技术债务和已知问题

### 已解决 ✅

```yaml
✅ Vercel 网络配置问题
  - pnpm 无法访问 npm registry
  - 解决: 使用 npm 或配置镜像

✅ TypeScript 依赖缺失
  - Next.js 找不到 TypeScript
  - 解决: 移动到 dependencies

✅ 移动端重定向问题
  - 手机访问跳转到 Vercel 登录
  - 解决: 关闭 Preview Deployment Protection

✅ Root Directory 配置
  - Monorepo 路径问题
  - 解决: 每个项目设置 apps/xxx
```

### 待处理 ⏳

```yaml
⏳ Landing Page 功能链接
  - /login 和 /register 是占位页面
  - 需要实现完整的认证流程

⏳ 全局样式系统
  - 需要定义统一的 Design System
  - 颜色、字体、间距规范

⏳ 错误处理
  - 需要全局错误边界
  - 友好的错误提示

⏳ 加载状态
  - 需要统一的加载指示器
  - Skeleton 屏幕
```

---

## 👥 团队和资源

### 核心团队

```yaml
CTO: Patrick Jiang
  - 技术架构
  - 全栈开发
  - DevOps

COO: [姓名]
  - 产品策略
  - 商业模式
  - 市场推广

开发资源:
  - Cursor + Claude (AI 辅助开发)
  - GitHub Copilot
  - ChatGPT/Claude for 技术咨询
```

### 外部服务

```yaml
基础设施:
  - Vercel (部署托管)
  - Supabase (数据库 + Auth)
  - GitHub (代码托管)

域名和 DNS:
  - Namecheap 或其他注册商

未来可能:
  - Stripe (支付)
  - SendGrid (邮件)
  - Twilio (SMS)
  - AWS S3 (文件存储)
```

---

## 📞 联系和链接

### 重要链接

```yaml
生产环境:
  - https://www.ledgersnap.app (待上线)
  - https://www.jobsitesnap.app (待上线)
  - https://www.snaplabs.global (待上线)

开发环境:
  - https://dev.ledgersnap.app ✅
  - https://dev.jobsitesnap.app ✅
  - https://dev.snaplabs.global ✅

管理后台:
  - Vercel: https://vercel.com/dashboard
  - Supabase: https://supabase.com/dashboard
  - GitHub: https://github.com/snaplabsglobal
```

### 文档位置

```yaml
本地开发:
  - 项目根目录: ~/slg-monorepo
  - 数据库迁移: ~/slg-monorepo/supabase/migrations/

云端资源:
  - 数据库迁移文件: 已下载到本地
  - 技术文档: 已下载到本地
  - 本文档: 项目根目录
```

---

## 🎓 经验教训

### 技术决策

```yaml
✅ 正确的决策:

Monorepo 架构:
  - 代码共享方便
  - 统一依赖管理
  - 但需要仔细配置 Vercel

pnpm 包管理器:
  - 节省磁盘空间
  - 更快的安装速度
  - 但 Vercel 配置需要注意

Next.js 16 App Router:
  - 现代化的架构
  - 更好的性能
  - Server Components 很强大

Supabase:
  - 快速开发
  - 内置认证
  - PostgreSQL 稳定可靠
```

### 避免的陷阱

```yaml
❌ 避免的错误:

不要依赖 Vercel Protection:
  - 应该用应用内认证（Supabase Auth）
  - Vercel Protection 只适合内部开发

不要过早优化:
  - 先把功能做出来
  - 再考虑性能优化

不要混淆 dependencies 和 devDependencies:
  - 构建时需要的放 dependencies
  - TypeScript 等需要放 dependencies（Vercel 需要）

不要忘记移动端测试:
  - 很多问题只在移动端出现
  - 用 Chrome DevTools 模拟移动端
```

---

## 🚀 愿景和目标

### 3个月目标

```yaml
产品目标:
  ☐ 3 个应用 MVP 上线
  ☐ 50+ 注册用户（免费）
  ☐ 5+ 付费用户
  ☐ 验证产品市场契合度

技术目标:
  ☐ 完整的认证系统
  ☐ Service Snap QR 核心功能
  ☐ 稳定的部署流程
  ☐ 基础的监控和日志

商业目标:
  ☐ Home Hero 贴纸引流启动
  ☐ 2+ 批发商合作伙伴
  ☐ 初步用户反馈
  ☐ 调整产品方向
```

### 6个月目标

```yaml
产品目标:
  ☐ 200+ 注册用户
  ☐ 30+ 付费用户
  ☐ MRR: $1,000+
  ☐ 产品市场契合度验证

技术目标:
  ☐ 移动端 App（可选）
  ☐ 高级分析功能
  ☐ API 接口开放
  ☐ 第三方集成

商业目标:
  ☐ 10,000 张贴纸分发完成
  ☐ 1,000+ QR Code 激活
  ☐ 100+ Pro 升级
  ☐ 准备 Series A 融资材料
```

### 12个月目标

```yaml
产品目标:
  ☐ 1,000+ 注册用户
  ☐ 150+ 付费用户
  ☐ MRR: $5,000+
  ☐ 多城市扩张

技术目标:
  ☐ 微服务架构（如需要）
  ☐ 机器学习模型优化
  ☐ 实时协作功能
  ☐ 企业级功能

商业目标:
  ☐ 占领温哥华 HVAC 市场 30%
  ☐ 扩展到其他城市
  ☐ Series A 融资完成
  ☐ 团队扩张到 5-10 人
```

---

## 📝 更新日志

```yaml
2026-01-26: 项目里程碑文档创建
  - 完成基础设施搭建
  - 完成 Service Snap QR 设计
  - 完成 Home Hero 引流方案设计
  - 3 个 Landing Page 上线
  - Vercel 部署配置完成
```

---

## 🎯 结语

```yaml
当前阶段: MVP 开发

完成度: 25%
  ✅ 基础设施 100%
  ✅ 数据库设计 100%
  ⏳ 认证系统 0%
  ⏳ 核心功能 0%

下一步:
  1. 运行数据库迁移
  2. 开发认证系统
  3. 实现 Service Snap QR API
  4. 启动贴纸引流计划

信心指数: 🔥🔥🔥🔥🔥
  - 技术架构稳固
  - 商业模式清晰
  - 团队执行力强
  - 准备好起飞！🚀
```

---

**文档维护**: Patrick Jiang (CTO)  
**生成日期**: 2026-01-26  
**版本**: 1.0  
**状态**: Active Development

---

## 附录：快速参考

### 常用命令

```bash
# 启动开发服务器
cd ~/slg-monorepo
pnpm dev

# 构建所有应用
pnpm build

# 运行特定应用
cd apps/ls-web
pnpm dev

# 数据库迁移
cd ~/slg-monorepo
supabase db push

# Git 提交和部署
git add .
git commit -m "feat: your message"
git push origin dev  # 自动部署到 dev 环境
git push origin main # 自动部署到生产环境
```

### 常用链接

```bash
# Vercel Dashboard
https://vercel.com/dashboard

# Supabase Dashboard  
https://supabase.com/dashboard

# GitHub Repository
https://github.com/snaplabsglobal/slg-monorepo

# 开发环境
https://dev.ledgersnap.app
https://dev.jobsitesnap.app
https://dev.snaplabs.global
```

---

**🎉 恭喜完成第一个重要里程碑！继续加油！🚀**
