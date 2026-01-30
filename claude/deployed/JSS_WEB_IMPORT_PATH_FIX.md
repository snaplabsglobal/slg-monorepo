# JSS-Web 导入路径修复

**修复日期**: 2026-01-28  
**问题**: `Module not found: Can't resolve '@/app/lib/permissions/permissions'`

---

## 🐛 问题描述

在 `apps/jss-web/middleware.ts` 中，导入路径错误导致模块无法解析：

```
Module not found: Can't resolve '@/app/lib/permissions/permissions'
```

---

## 🔍 根本原因

`tsconfig.json` 中的路径别名配置：
```json
"paths": {
  "@/*": ["./app/*"]
}
```

这意味着 `@/` 已经指向 `./app/` 目录。

**错误的导入路径**:
```typescript
import { ... } from '@/app/lib/permissions/permissions'
// 这会被解析为: ./app/app/lib/permissions/permissions ❌
```

**正确的导入路径**:
```typescript
import { ... } from '@/lib/permissions/permissions'
// 这会被解析为: ./app/lib/permissions/permissions ✅
```

---

## ✅ 修复内容

### 1. 修复 `middleware.ts`
**文件**: `apps/jss-web/middleware.ts`

**修复前**:
```typescript
import { checkAppAccess, logAppAccess } from '@/app/lib/permissions/permissions'
```

**修复后**:
```typescript
import { checkAppAccess, logAppAccess } from '@/lib/permissions/permissions'
```

### 2. 修复 `permissions.ts`
**文件**: `apps/jss-web/app/lib/permissions/permissions.ts`

**修复前**:
```typescript
import { createClient } from '@/app/lib/supabase/server'
```

**修复后**:
```typescript
import { createClient } from '@/lib/supabase/server'
```

---

## 📋 路径别名规则

根据 `tsconfig.json` 配置：

| 导入路径 | 实际路径 | 说明 |
|---------|---------|------|
| `@/lib/permissions/permissions` | `./app/lib/permissions/permissions` | ✅ 正确 |
| `@/app/lib/permissions/permissions` | `./app/app/lib/permissions/permissions` | ❌ 错误（重复 app） |
| `@/components/Button` | `./app/components/Button` | ✅ 正确 |
| `@/app/components/Button` | `./app/app/components/Button` | ❌ 错误（重复 app） |

---

## ✅ 验证

- ✅ Linter 检查通过
- ✅ 导入路径已修复
- ✅ 模块应该可以正常解析

---

## 🎯 总结

**问题**: 导入路径中重复了 `app` 目录  
**原因**: `@/` 别名已经指向 `./app/`，不需要再加 `app`  
**修复**: 移除导入路径中的 `app` 前缀  
**状态**: ✅ 已修复

---

**现在模块应该可以正常导入了！** ✅
