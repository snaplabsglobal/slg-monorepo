# 管理员权限与智能重定向实现文档

## 概述

实现了基于邮箱的管理员权限系统和智能重定向逻辑，确保管理员和普通用户访问正确的页面。

## 核心功能

### 1. 权限常量定义

**位置**: `packages/snap-types/src/auth.ts`

```typescript
export const ADMIN_EMAIL = 'admin@snaplabsglobal.com'
export const ADMIN_DASHBOARD_URL = '/admin/dashboard'
```

**功能**:
- 定义系统级管理员邮箱
- 提供权限检查工具函数 `isAdminEmail()`
- 提供智能重定向函数 `getRedirectUrl()`

### 2. 智能重定向逻辑

**实现位置**: `packages/snap-auth/src/components/auth/login-form.tsx`

**逻辑流程**:

1. **Admin 用户登录**:
   - 检测到 `admin@snaplabsglobal.com`
   - 自动重定向到 `https://dev.snaplabs.global/admin/dashboard`

2. **普通用户登录**:
   - LS 应用用户 → `https://dev.ledgersnap.app/dashboard`
   - JSS 应用用户 → `https://dev.jobsitesnap.app/dashboard`
   - SLG 应用用户 → `/dashboard`

**代码实现**:
```typescript
if (isAdminEmail(userEmail)) {
  // Admin: redirect to admin dashboard
  const adminUrl = getAdminDashboardUrl(adminDomain)
  window.location.href = adminUrl
} else {
  // Regular user: redirect based on app origin
  const finalRedirect = getRedirectUrl(userEmail, appOrigin, redirectTo)
  // ...
}
```

### 3. Middleware 路由保护

**实现位置**: `apps/slg-corporate/middleware.ts`

**保护逻辑**:

1. **Admin 路径保护** (`/admin/*`):
   - 未登录用户 → 重定向到 `/login`
   - 非 Admin 用户 → 返回 403 并重定向到 `/dashboard`
   - Admin 用户 → 允许访问

2. **登录后重定向**:
   - Admin 用户登录后 → 重定向到 `/admin/dashboard`
   - 普通用户登录后 → 重定向到 `/dashboard`

**代码实现**:
```typescript
// Admin routes - require admin email
const isAdminPath = request.nextUrl.pathname.startsWith('/admin')

if (isAdminPath) {
  if (!user) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (!isAdminEmail(user.email)) {
    // Redirect non-admin users to their dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url), { status: 403 })
  }
}
```

### 4. Admin Dashboard

**位置**: `apps/slg-corporate/app/admin/dashboard/page.tsx`

**功能**:
- 系统管理仪表板
- 成员邀请入口
- 用户管理
- 组织管理
- 系统设置
- 分析和审计日志

**访问控制**:
- 服务端检查用户身份
- 非 Admin 用户自动重定向

### 5. 成员邀请功能

**位置**: `apps/slg-corporate/app/admin/invite/page.tsx`

**功能**:
- 发送邀请邮件
- 设置用户角色（User/Admin）
- 邀请确认页面

**UI 集成**:
- Admin Dashboard 显示 "Invite Member" 按钮
- 普通 Dashboard 显示 "Admin Dashboard" 按钮（仅 Admin 可见）

## 应用配置

### LS-Web (LedgerSnap)

**登录页面**: `apps/ls-web/app/login/page.tsx`
```typescript
<LoginForm
  appOrigin="LS"  // 标识应用来源
  // ...
/>
```

**重定向逻辑**:
- Admin → `https://dev.snaplabs.global/admin/dashboard`
- 普通用户 → `https://dev.ledgersnap.app/dashboard`

### JSS-Web (JobSite Snap)

**登录页面**: `apps/jss-web/app/login/page.tsx`
```typescript
<LoginForm
  appOrigin="JSS"  // 标识应用来源
  // ...
/>
```

**重定向逻辑**:
- Admin → `https://dev.snaplabs.global/admin/dashboard`
- 普通用户 → `https://dev.jobsitesnap.app/dashboard`

### SLG-Corporate

**登录页面**: `apps/slg-corporate/app/login/page.tsx`
```typescript
<LoginForm
  // appOrigin 默认为 SLG
  // ...
/>
```

**重定向逻辑**:
- Admin → `/admin/dashboard`
- 普通用户 → `/dashboard`

## 安全考虑

1. **邮箱验证**: 使用 `isAdminEmail()` 函数进行大小写不敏感的邮箱比较
2. **服务端验证**: Admin Dashboard 在服务端再次验证用户身份
3. **Middleware 保护**: 所有 `/admin` 路径都经过 Middleware 检查
4. **403 响应**: 非 Admin 用户尝试访问 Admin 页面时返回 403

## 使用示例

### 检查用户是否为 Admin

```typescript
import { isAdminEmail } from '@slo/snap-types'

const user = await supabase.auth.getUser()
if (isAdminEmail(user.data.user?.email)) {
  // Admin user logic
}
```

### 获取重定向 URL

```typescript
import { getRedirectUrl } from '@slo/snap-types'

const redirectUrl = getRedirectUrl(userEmail, 'LS', '/dashboard')
// Returns: 'https://dev.ledgersnap.app/dashboard' for regular users
// Returns: '/admin/dashboard' for admin
```

### 获取 Admin Dashboard URL

```typescript
import { getAdminDashboardUrl } from '@slo/snap-types'

const adminUrl = getAdminDashboardUrl('dev.snaplabs.global')
// Returns: 'https://dev.snaplabs.global/admin/dashboard'
```

## 文件清单

### 新增文件

- `packages/snap-types/src/auth.ts` - 权限常量和工具函数
- `apps/slg-corporate/app/admin/dashboard/page.tsx` - Admin Dashboard
- `apps/slg-corporate/app/admin/invite/page.tsx` - 成员邀请页面

### 修改文件

- `packages/snap-types/index.ts` - 导出 auth 模块
- `packages/snap-types/tsconfig.json` - 包含 src 目录
- `packages/snap-auth/src/components/auth/login-form.tsx` - 智能重定向逻辑
- `packages/snap-auth/package.json` - 添加 @slo/snap-types 依赖
- `apps/slg-corporate/middleware.ts` - Admin 路径保护
- `apps/slg-corporate/app/dashboard/page.tsx` - 添加 Admin Dashboard 按钮
- `apps/ls-web/app/login/page.tsx` - 添加 appOrigin 配置
- `apps/jss-web/app/login/page.tsx` - 添加 appOrigin 配置

## 测试场景

### 场景 1: Admin 登录

1. Admin 用户在任意应用登录
2. 自动重定向到 `https://dev.snaplabs.global/admin/dashboard`
3. 可以访问所有 Admin 功能

### 场景 2: 普通用户登录

1. 普通用户在 LS 应用登录
2. 自动重定向到 `https://dev.ledgersnap.app/dashboard`
3. 尝试访问 `/admin/dashboard` 时被重定向回 `/dashboard`

### 场景 3: 未授权访问

1. 普通用户直接访问 `https://dev.snaplabs.global/admin/dashboard`
2. Middleware 检测到非 Admin 用户
3. 返回 403 并重定向到 `/dashboard`

## 后续改进

1. **数据库角色管理**: 将 Admin 角色存储在数据库中，而非仅依赖邮箱
2. **邀请系统**: 实现完整的邀请邮件发送和注册流程
3. **权限级别**: 支持多级权限（Super Admin, Admin, Moderator 等）
4. **审计日志**: 记录所有 Admin 操作
5. **用户管理界面**: 完整的用户 CRUD 操作界面

## 参考

- [认证系统文档](./AUTH_REFACTOR_SUMMARY.md)
- [SSO 配置指南](./SSO_CONFIGURATION.md)
