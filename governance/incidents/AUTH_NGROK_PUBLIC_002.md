# AUTH_NGROK_PUBLIC_002

> SEOS Incident Record - Second Brick (Environment Governance)

## Metadata

| Field | Value |
|-------|-------|
| **Incident ID** | AUTH_NGROK_PUBLIC_002 |
| **Date** | 2026-02-13 |
| **Category** | AUTH_SYSTEM / ENV_GOVERNANCE |
| **Severity** | High (P0) |
| **Error Classes** | AUTH_LOCK_ABORT + AUTH_SW_INVALID_STATE |
| **Status** | RESOLVED |
| **Predecessor** | AUTH-LOCK-NGROK-001 |

## Summary

localhost 登录已修复（Brick #1），但 ngrok public URL 仍然失败。

主要错误：
1. `AbortError: signal is aborted without reason` @ locks.ts
2. `InvalidStateError: Failed to get ServiceWorkerRegistration objects`

## Root Cause

环境判定用 hostname 推断，ngrok 被误判为 prod-like → lock 和 SW 走了不该走的分支。

### Why Brick #1 Didn't Cover It

Brick #1 修了 localhost 的 lock 问题，但没有统一 ngrok 的环境分支判定。

| Brick #1 修复 | 遗漏点 |
|--------------|--------|
| localhost dev no-op lock | ngrok 仍被判定为需要 lock |
| "声称" SW disabled | 实际仍在调用 `getRegistrations()` |

### Technical Path (AbortError)

```
ngrok 请求
  → 被判定为 prod-like（因为不是 localhost）
  → lock = on
  → 隧道延迟 + lock timeout
  → AbortError
```

### Technical Path (InvalidStateError)

```
non-prod 环境
  → console.log("SW disabled")
  → 但仍调用 navigator.serviceWorker.getRegistrations()
  → ngrok/iframe/某些状态下
  → InvalidStateError
```

## Fix Applied

| # | Fix | File |
|---|-----|------|
| 1 | dev/ngrok 完全不触碰 SW API（包括 `getRegistrations`） | `apps/jss-web/app/layout.tsx` |
| 2 | SW 调用必须有强 guard + try-catch | `apps/ls-web/app/components/global/PwaRegister.tsx` |
| 3 | Rule 5-8 写入 policy.json | `governance/policy.json` |
| 4 | ngrok E2E 套件 + Proof Pack | `e2e/auth.ngrok.public.spec.ts` |
| 5 | **L1 Fix: Cookie 名称统一** | `packages/snap-auth/src/client.ts`, `packages/snap-auth/src/middleware.ts` |

### L1 Root Cause & Fix (Cookie Name Mismatch)

**Root Cause:**
- Browser client 使用 ngrok hostname 生成 cookie 名称: `sb-<ngrok-hostname>-auth-token`
- Middleware 使用 Supabase URL (127.0.0.1) 生成 cookie 名称: `sb-127-auth-token`
- **Cookie 名称不匹配 → Middleware 读不到 session → 307 redirect loop**

**Fix:**
在 `packages/snap-auth/` 中添加固定的 `STORAGE_KEY`:
```typescript
const STORAGE_KEY = 'sb-local-auth-token'
```

当使用本地 Supabase 时，browser 和 middleware 都使用这个固定名称，确保 cookie 名称一致。

## Verification

| Test | Result |
|------|--------|
| localhost 登录成功 | PASS |
| 刷新后 session 保持 | PASS |
| 登出后 cookie 清除 | PASS |
| 无 AbortError | PASS |
| 无 InvalidStateError | PASS |
| console-errors-summary.json 为空 | PASS |

## Rules Born From This Incident

| Rule | ID | Description |
|------|-----|-------------|
| **Rule 5** | ENV-RULE-005 | 环境必须显式声明，禁止用 hostname 推断 |
| **Rule 6** | ENV-RULE-006 | ngrok 环境 = dev-like，lock=off，SW=off |
| **Rule 7** | ENV-RULE-007 | Console error 纳入 Gate 断言 |
| **Rule 8** | ENV-RULE-008 | SW API 调用必须有强 guard |

## SEOS Significance

| Aspect | Value |
|--------|-------|
| Autonomy Level | B（允许自动修复，必须二次验证） |
| SEOS Milestone | 第一次"环境治理"实践 — 从"猜环境"到"声明环境" |

### Brick #1 vs Brick #2

| | Brick #1 | Brick #2 |
|---|---------|---------|
| **解决的问题** | localhost 的"自证闭环" | ngrok 的"环境差异 + 代理链路"组合拳 |
| **证明的能力** | 系统能自证 | 系统能**跨环境**自证 |
| **SEOS 价值** | 自治闭环可行 | 环境治理可行 |

## Related Documents

- `docs/architecture/SLG_SEOS_First_Brick_AUTH_LOCK_NGROK_001.md`
- `docs/architecture/SLG_SEOS_Brick_2_AUTH_NGROK_PUBLIC_002.md`
- `docs/architecture/SLG_SEOS_Brick2_to_ProofPack_CTO_Exec_v1.0.md`
- `governance/policy.json`
- `governance/business-contracts/BIZ-AUTH-LOGIN-LAND.json`
- `governance/p0-required-contracts.json`
- `governance/ui-constitution.json`

## Proof Pack Infrastructure (L5-L7)

| Component | Path | Status |
|-----------|------|--------|
| Business Contract Schema | `governance/business-contracts/schema.json` | CREATED |
| Login Contract | `governance/business-contracts/BIZ-AUTH-LOGIN-LAND.json` | CREATED |
| P0 Required | `governance/p0-required-contracts.json` | CREATED |
| UI Constitution | `governance/ui-constitution.json` | CREATED |
| Contract Expect | `governance/contracts-runner/contractExpect.ts` | CREATED |
| Proof Pack Helper | `apps/jss-web/e2e/_helpers/proofpack.ts` | CREATED |
| Build Index Script | `scripts/proofpack/build-index.ts` | CREATED |
| Validate Script | `scripts/proofpack/validate-proofpack.ts` | CREATED |
| Slack Notify | `scripts/notify/slack-proofpack.ts` | CREATED |
| CEO Dashboard | `apps/jss-web/app/ceo/proof/page.tsx` | CREATED |

## Complete Rule Index (Brick #1 + #2 + L2-L7)

| Rule | Content | Source |
|------|---------|--------|
| Rule 1 | Auth 初始化阶段禁止使用 navigatorLock | Brick #1 |
| Rule 2 | Lock 只允许用于 refresh token 并发保护 | Brick #1 |
| Rule 3 | Auth 修复 PR 必须附带自动验证脚本 | Brick #1 |
| Rule 4 | Auth/Cookie/Proxy 变更必须在真实浏览器环境验证 | Brick #1 |
| **Rule 5** | **环境必须显式声明，禁止用 hostname 推断** | **Brick #2** |
| **Rule 6** | **ngrok 环境 = dev-like，lock=off，SW=off** | **Brick #2** |
| **Rule 7** | **Console error 纳入 Gate 断言** | **Brick #2** |
| **Rule 8** | **SW API 调用必须有强 guard** | **Brick #2** |
| **Rule 9** | **登录后必须落在 expected_path 且 SSR 首次 200，禁止 307 回 /login** | **L2** |
| **Rule 10** | **所有关键业务动作必须有 data-testid，缺失则 PR fail** | **L4** |
| **Rule 11** | **P0 Required Contracts 缺席 = BUSINESS_FAIL，CI fail** | **L5** |
| **Rule 12** | **BUSINESS_PASS 为 CEO 唯一验收判据，不接受口头确认** | **L6** |
