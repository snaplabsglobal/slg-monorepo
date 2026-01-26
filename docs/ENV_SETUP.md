# 环境变量配置说明

## 文件结构

```
slg-monorepo/
├── .env.shared                    # 共享环境变量（根目录）
├── apps/
│   ├── ls-web/
│   │   └── .env.local            # ls-web 应用特定配置
│   ├── jss-web/
│   │   └── .env.local            # jss-web 应用特定配置
│   └── slg-corporate/
│       └── .env.local            # slg-corporate 应用特定配置
```

## 配置说明

### 1. `.env.shared` (根目录)
包含所有应用共享的 Supabase 本地配置：
- `SHARED_SUPABASE_URL_LOCAL` - 本地 Supabase URL
- `SHARED_SUPABASE_ANON_KEY_LOCAL` - 本地 Supabase Anon Key

**注意：** Next.js 不支持直接引用其他 env 文件，所以每个应用的 `.env.local` 中需要复制这些值。

### 2. 各应用 `.env.local` 文件

#### `apps/ls-web/.env.local`
- 引用共享 Supabase 配置
- `GEMINI_API_KEY` - Gemini API 密钥（用于 ML 功能）

#### `apps/jss-web/.env.local`
- 引用共享 Supabase 配置
- `GOOGLE_MAPS_API_KEY` - Google Maps API 密钥

#### `apps/slg-corporate/.env.local`
- 引用共享 Supabase 配置
- `SENDGRID_API_KEY` - SendGrid API 密钥（用于邮件发送）

## Turborepo 配置

`turbo.json` 已配置为：
- 将 `.env.shared` 添加到 `globalDependencies`
- 确保 Turbo 在构建时检测到共享环境变量的变化

## Git 忽略规则

`.gitignore` 已配置为忽略：
- `.env.shared` - 共享环境变量文件
- `.env.local` - 所有应用的本地环境变量
- `*.env` - 所有环境变量文件

## 使用说明

1. **首次设置：**
   ```bash
   # 复制 .env.shared.example（如果存在）或直接编辑 .env.shared
   # 然后更新各应用的 .env.local 文件中的 API 密钥
   ```

2. **更新共享配置：**
   - 修改 `.env.shared` 中的值
   - 同步更新所有应用的 `.env.local` 文件中的对应值

3. **添加新应用：**
   - 创建 `apps/new-app/.env.local`
   - 从 `.env.shared` 复制共享配置
   - 添加应用特定的环境变量

## 环境变量优先级

Next.js 环境变量加载顺序（从高到低）：
1. `.env.local` (所有环境，git 忽略)
2. `.env.development` / `.env.production` (特定环境)
3. `.env` (默认环境)

## 安全提示

- ✅ 所有 `.env.local` 和 `.env.shared` 文件已被 Git 忽略
- ✅ 不要将真实的 API 密钥提交到 Git
- ✅ 使用环境变量管理服务（如 Vercel、Supabase）管理生产环境变量
- ⚠️ 在团队中共享密钥时，使用安全的密钥管理工具
