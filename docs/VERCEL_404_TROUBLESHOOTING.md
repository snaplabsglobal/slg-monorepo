# Vercel 404 错误排查指南

## 错误说明

### 1. ERR_BLOCKED_BY_CLIENT
```
vcd15cbe7772f49c399c6a5babf22c1241717689176015:1  Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```

**原因：** 这是浏览器扩展（如广告拦截器、隐私保护扩展）阻止了资源加载。

**解决方案：** 
- 这不是代码问题，可以忽略
- 如果影响功能，建议用户在浏览器中禁用相关扩展
- 或者使用无痕模式/其他浏览器测试

### 2. 404 错误
```
(index):1  Failed to load resource: the server responded with a status of 404 ()
```

**可能原因：**

1. **构建输出目录配置错误**
   - 检查 Vercel Dashboard 中的 Output Directory 设置
   - 应该设置为 `.next`（如果 Root Directory 是 `apps/ls-web`）
   - 或者 `apps/ls-web/.next`（如果 Root Directory 是根目录）

2. **Next.js 16 已知问题**
   - Next.js 16 在 Vercel 上有时会出现根路由 404 的问题
   - 即使 `app/page.tsx` 存在且正确，也可能返回 404

3. **构建失败或缓存问题**
   - 检查 Vercel 构建日志
   - 尝试清除构建缓存并重新部署

## 排查步骤

### 步骤 1: 检查 Vercel 项目设置

在 Vercel Dashboard 中检查：

1. **Root Directory**: 应该设置为 `apps/ls-web`
2. **Framework Preset**: Next.js
3. **Build Command**: `cd ../.. && pnpm install && pnpm --filter ls-web build`
4. **Output Directory**: `.next`
5. **Install Command**: `cd ../.. && pnpm install`

### 步骤 2: 验证构建输出

在 Vercel 构建日志中检查：
- 构建是否成功完成
- `.next` 目录是否被正确创建
- 是否有任何警告或错误

### 步骤 3: 检查路由文件

确保以下文件存在且正确：
- `apps/ls-web/app/page.tsx` - 根路由页面
- `apps/ls-web/app/layout.tsx` - 根布局

### 步骤 4: 清除缓存并重新部署

在 Vercel Dashboard 中：
1. 进入项目设置
2. 清除构建缓存
3. 触发新的部署

### 步骤 5: 检查环境变量

确保所有必需的环境变量都已设置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`（如果使用）

## 当前配置

### vercel.json (apps/ls-web/vercel.json)
```json
{
  "version": 2,
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter ls-web build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install",
  "devCommand": "cd ../.. && pnpm --filter ls-web dev"
}
```

### next.config.mjs
- 使用 webpack（生产环境）
- 已优化 watchOptions（仅开发环境）

## 如果问题仍然存在

1. **检查 Vercel 构建日志** - 查看是否有隐藏的错误
2. **尝试本地构建** - 运行 `pnpm --filter ls-web build` 检查是否有构建错误
3. **检查 Next.js 版本** - 考虑升级或降级 Next.js 版本
4. **联系 Vercel 支持** - 如果确认是平台问题

## 相关链接

- [Vercel 404 错误指南](https://vercel.com/guides/why-is-my-deployed-project-giving-404)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
