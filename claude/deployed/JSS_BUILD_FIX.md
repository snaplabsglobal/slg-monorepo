# JSS-web Vercel 构建错误修复

**错误**: You're importing a component that needs "next/headers"

**原因**: Next.js 15+ 中 `next/headers` 变成了异步 API

---

## 🔍 错误分析

### 错误详情

```
Error: Turbopack build failed with 1 errors:
./packages/snap-auth/dist/server.js:2:1

> import { cookies } from 'next/headers';
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You're importing a component that needs "next/headers". 
That only works in a Server Component which is not supported 
in the pages/ directory.

影响范围:
❌ Edge Middleware (middleware.ts)
❌ Client Components
❌ API Routes (部分)
```

### 根本原因

```
Next.js 15+ 重大变更:

❌ 旧版本 (Next.js 14):
import { cookies } from 'next/headers';
const cookieStore = cookies();

✅ 新版本 (Next.js 15+):
import { cookies } from 'next/headers';
const cookieStore = await cookies();
                     ^^^^^ 必须 await

问题:
1. snap-auth 包使用了同步的 cookies()
2. middleware.ts 中不能使用 await cookies()
3. Client Components 中不能导入 server-only 代码
```

---

## 🛠️ 完整修复方案

### 方案 1: 修复 snap-auth 包（推荐）✅

```typescript
// packages/snap-auth/src/server.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for Server Components and Route Handlers
 * Next.js 15+ compatible (async cookies)
 */
export async function createClient() {
  const cookieStore = await cookies(); // ✅ 添加 await
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component 中可能无法设置 cookie
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for Middleware
 * Uses request/response objects instead of cookies()
 */
export function createMiddlewareClient(
  request: Request,
  response: Response
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split('; ')
            .map(cookie => {
              const [name, ...rest] = cookie.split('=');
              return { name, value: rest.join('=') };
            }) || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.headers.append(
              'Set-Cookie',
              `${name}=${value}; Path=${options?.path || '/'}; ${
                options?.httpOnly ? 'HttpOnly;' : ''
              } ${options?.secure ? 'Secure;' : ''}`
            );
          });
        },
      },
    }
  );
}
```

```typescript
// packages/snap-auth/src/index.ts

export { createClient } from './server';
export { createMiddlewareClient } from './server';
export { createBrowserClient } from './client';
```

---

### 方案 2: 修复 middleware.ts

```typescript
// apps/jss-web/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@slo/snap-auth';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // ✅ 使用专门的 middleware client（不依赖 cookies()）
  const supabase = createMiddlewareClient(
    request,
    response
  );
  
  // 刷新 session
  const { data: { session } } = await supabase.auth.getSession();
  
  // 权限检查
  const { pathname } = request.nextUrl;
  
  // 公开路径
  const publicPaths = ['/login', '/signup', '/'];
  if (publicPaths.includes(pathname)) {
    return response;
  }
  
  // 需要登录
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

### 方案 3: 修复 permissions.ts

```typescript
// apps/jss-web/app/lib/permissions/permissions.ts

import { createClient } from '@slo/snap-auth';

/**
 * 检查用户权限（Server Component 用）
 */
export async function checkPermission(
  permission: string
): Promise<boolean> {
  // ✅ await createClient()
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  // 检查权限逻辑
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', user.id)
    .eq('permission', permission)
    .single();
  
  return !!permissions;
}

/**
 * 获取用户所有权限
 */
export async function getUserPermissions(): Promise<string[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];
  
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', user.id);
  
  return permissions?.map(p => p.permission) || [];
}
```

---

### 方案 4: 修复 Client Components

```typescript
// apps/jss-web/app/components/upgrade/upgrade-modal.tsx

'use client'; // ✅ 标记为 Client Component

import { useState } from 'react';
// ❌ 不要在 Client Component 中导入 server-only 代码
// import { checkPermission } from '@/lib/permissions/permissions';

export function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ 通过 props 或 API 获取权限
  // const hasPermission = await fetch('/api/check-permission').then(r => r.json());
  
  return (
    <div>
      {/* Modal content */}
    </div>
  );
}
```

```typescript
// apps/jss-web/app/upgrade/page.tsx (Server Component)

import { UpgradeModal } from '@/components/upgrade/upgrade-modal';
import { checkPermission } from '@/lib/permissions/permissions';

export default async function UpgradePage() {
  // ✅ 在 Server Component 中获取权限
  const hasPermission = await checkPermission('upgrade');
  
  return (
    <div>
      <h1>Upgrade</h1>
      {/* ✅ 通过 props 传递给 Client Component */}
      <UpgradeModal hasPermission={hasPermission} />
    </div>
  );
}
```

---

## 🚀 给 Cursor 的完整修复指令

```markdown
## URGENT: Fix JSS-web Next.js 15 Build Error

### Error
next/headers must be awaited in Next.js 15+

### Root Cause
snap-auth package uses sync cookies() API
Next.js 15 changed cookies() to async

### Fix Steps

#### 1. Update snap-auth package

File: packages/snap-auth/src/server.ts

```typescript
import { cookies } from 'next/headers';

// ✅ Add async and await
export async function createClient() {
  const cookieStore = await cookies(); // ADD await
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// ✅ Add middleware client (doesn't use cookies())
export function createMiddlewareClient(
  request: Request,
  response: Response
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split('; ')
            .map(c => {
              const [name, ...v] = c.split('=');
              return { name, value: v.join('=') };
            }) || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.headers.append(
              'Set-Cookie',
              `${name}=${value}; Path=/`
            );
          });
        },
      },
    }
  );
}
```

#### 2. Update middleware.ts

File: apps/jss-web/middleware.ts

```typescript
import { createMiddlewareClient } from '@slo/snap-auth';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // ✅ Use middleware client
  const supabase = createMiddlewareClient(request, response);
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Auth logic...
  
  return response;
}
```

#### 3. Update all createClient() calls

Find all files using createClient():
```bash
grep -r "createClient()" apps/jss-web/app
```

Add await:
```typescript
// ❌ Before
const supabase = createClient();

// ✅ After
const supabase = await createClient();
```

#### 4. Fix Client Component imports

File: apps/jss-web/app/components/upgrade/upgrade-modal.tsx

```typescript
'use client';

// ❌ Remove server imports
// import { checkPermission } from '@/lib/permissions';

// ✅ Get data via props or API
export function UpgradeModal({ hasPermission }: { hasPermission: boolean }) {
  // Component code
}
```

#### 5. Rebuild snap-auth

```bash
cd packages/snap-auth
pnpm build
```

#### 6. Test build

```bash
cd apps/jss-web
pnpm build
```

### Success Criteria
□ snap-auth exports createMiddlewareClient
□ createClient is async
□ All createClient() calls use await
□ middleware.ts uses createMiddlewareClient
□ No server imports in Client Components
□ Build succeeds locally
□ Vercel deployment succeeds
```

---

## 📋 快速检查清单

```bash
# 1. 修复 snap-auth
cd packages/snap-auth/src
# 添加 async/await 到 createClient
# 添加 createMiddlewareClient

# 2. 重新构建
cd packages/snap-auth
pnpm build

# 3. 搜索所有 createClient() 调用
cd apps/jss-web
grep -r "createClient()" app/

# 4. 添加 await 到所有调用
# 示例:
# const supabase = await createClient();

# 5. 修复 middleware.ts
# 使用 createMiddlewareClient

# 6. 修复 Client Components
# 移除 server-only 导入

# 7. 本地测试
pnpm build

# 8. 推送验证
git add .
git commit -m "fix: Next.js 15 async cookies compatibility"
git push origin dev
```

---

## 🎯 关键变更总结

```
1. snap-auth/server.ts
   ✅ export async function createClient()
   ✅ export function createMiddlewareClient()

2. middleware.ts
   ✅ 使用 createMiddlewareClient()

3. 所有 Server Components/Route Handlers
   ✅ const supabase = await createClient()

4. Client Components
   ✅ 不导入 server-only 代码
   ✅ 通过 props 或 API 获取数据

5. permissions.ts
   ✅ export async function checkPermission()
   ✅ const supabase = await createClient()
```

---

**快速修复步骤**:

1️⃣ 修改 `packages/snap-auth/src/server.ts` (添加 async/await)

2️⃣ 添加 `createMiddlewareClient` 函数

3️⃣ 重新构建 snap-auth (`pnpm build`)

4️⃣ 修复 `middleware.ts` (使用新的 client)

5️⃣ 搜索并修复所有 `createClient()` 调用 (添加 await)

6️⃣ 修复 Client Components (移除 server 导入)

7️⃣ 测试构建 (`pnpm build`)

8️⃣ 推送验证

🚀 **预计 10-15 分钟完成修复！**
