# AUTH-LOCK-NGROK-001

> SEOS Incident Record - First Brick

## Metadata

| Field | Value |
|-------|-------|
| **Incident ID** | AUTH-LOCK-NGROK-001 |
| **Date** | 2026-02-12 |
| **Category** | AUTH_SYSTEM |
| **Severity** | High (P0) |
| **Error Class** | AUTH_LOCK_ABORT |
| **Status** | RESOLVED |

## Summary

localhost 登录正常，ngrok 登录失败。CTO 声称 E2E 通过，CEO 手机不行。

## Root Cause

`navigatorLock` 的 `acquireTimeout` 在 ngrok/dev 环境触发 abort，导致 Auth 初始化失败。

### Technical Path

```
handleLogin
  → createClient()
  → GoTrueClient initialize
  → navigator.locks.request()
  → abortController.abort()          ← 超时触发
  → AbortError
  → session 未建立
  → middleware 重定向 /login
  → 用户看到"登录不了"
```

### Contributing Factors

| Factor | Impact |
|--------|--------|
| HMR / 多实例环境 | dev 模式下多个 client 实例竞争同一个 lock |
| ngrok 隧道延迟 | 增加了 lock 获取时间，更容易超时 |
| 使用 localStorage 而非 cookies | Middleware 无法读取 session |
| Service Worker 干扰 | SW 可能竞争 lock |

## Why E2E Missed It

| E2E Environment | Real Browser Environment |
|-----------------|-------------------------|
| 无 HMR | 有 HMR（dev 模式） |
| 无多实例 | 可能多 tab / SW 干扰 |
| 初始化时间短 | ngrok 隧道延迟 |
| 无 Service Worker 干扰 | 可能有 SW 竞争 lock |

**Lesson:** E2E 通过 ≠ 真实环境通过。必须在真实条件下验证。

## Fix Applied

| # | Fix | File |
|---|-----|------|
| 1 | 改用 `@supabase/ssr` 的 `createBrowserClient`（cookies 而非 localStorage） | `packages/snap-auth/src/client.ts` |
| 2 | Supabase client 单例化（globalThis 缓存） | `packages/snap-auth/src/client.ts` |
| 3 | Dev 环境禁用 Service Worker | `apps/jss-web/app/layout.tsx` |
| 4 | Middleware 透传 cookie options（不改写） | `packages/snap-auth/src/middleware.ts` |
| 5 | 新增诊断端点 `/api/diag/auth-target` | `apps/jss-web/app/api/diag/auth-target/route.ts` |

## Verification

| Test | Result |
|------|--------|
| localhost 登录成功 | PASS |
| 刷新后 session 保持 | PASS |
| 登出后 cookie 清除 | PASS |
| 无 AbortError | PASS |
| Supabase auth cookie 正确设置 | PASS |

## Rules Born From This Incident

1. **Rule 1 (AUTH-RULE-001):** Auth 初始化阶段禁止使用 navigatorLock
2. **Rule 2 (AUTH-RULE-002):** Lock 只允许用于 refresh token 并发保护
3. **Rule 3 (AUTH-RULE-003):** Auth 相关修复 PR 必须包含可重复自动验证脚本
4. **Rule 4 (AUTH-RULE-004):** Auth/Cookie/Proxy 变更必须在真实浏览器环境验证

## SEOS Significance

| Aspect | Value |
|--------|-------|
| Autonomy Level | B（允许自动修复，但必须二次验证） |
| Resolution Method | CTO 自主闭环：自写脚本 → 自测 → 自诊 → 自修 → 自验通过 |
| SEOS Milestone | 第一个真实的 Detect → Diagnose → Patch → Re-test → Pass 闭环 |

## Related Documents

- `docs/architecture/SLG_Auth_Governance_v1.md`
- `docs/architecture/SLG_SEOS_Case_Study_1_Auth.md`
- `governance/policy.json`
