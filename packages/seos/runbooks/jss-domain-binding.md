# JSS Domain Binding Runbook

> SEOS INFRA_DEPENDENCY Runbook v1.0

## Overview

This runbook handles domain binding issues where Vercel custom domains are not properly assigned to production deployments, causing middleware invocation failures.

## Symptoms

- `MIDDLEWARE_INVOCATION_FAILED` errors on custom domain
- `x-vercel-id` header shows truncated pattern (e.g., `pdx1::` instead of `pdx1::iad1::`)
- `/api/proof-pack` returns error instead of JSON
- Control Tower shows domain as UNHEALTHY

## Root Cause

Custom domain not assigned to the correct Vercel deployment, causing requests to fail before reaching the Next.js middleware layer.

## Required Access

- Vercel Dashboard access (Ops/Domain Owner)
- Cloudflare Dashboard access (for DNS if needed)

## Resolution Steps

### Step 1: Verify Domain Assignment in Vercel

1. Log into Vercel Dashboard
2. Navigate to Project → Settings → Domains
3. Check that all custom domains show green checkmark
4. Verify "Branch" column shows "Production"

### Step 2: Reassign Domain if Needed

1. If domain shows warning/error:
   - Click the domain
   - Click "Assign to Production"
   - Wait for DNS propagation (usually < 5 minutes)

### Step 3: Verify Cloudflare DNS

1. Log into Cloudflare Dashboard
2. Navigate to DNS settings
3. Verify CNAME record points to `cname.vercel-dns.com`
4. Ensure proxy status is "Proxied" (orange cloud)

### Step 4: Test Resolution

```bash
# Test from command line
curl -I https://jss.snaplabs.global/api/proof-pack

# Expected: HTTP 200, application/json content-type
# Look for: x-vercel-id: pdx1::iad1::xxxxx (full pattern)
```

### Step 5: Verify in Control Tower

1. Wait 2-3 minutes for cache refresh
2. Check CEO Dashboard shows green indicator
3. Run domain probe: `pnpm --filter=@slo/seos probe`

## Escalation

If issue persists after following this runbook:
1. Create SEOS Intervention with `category: INFRA_DEPENDENCY`
2. Tag incident as `requires_cto_token: true`
3. Document all attempted steps in intervention log

## Prevention

Guard: `GUARD-005-A` (INFRA MONITOR)
- 10-minute automated domain probing
- Alerts on any domain health failure
- Triggers before user-visible impact

## Related Incidents

- INC-005: Middleware invocation failed on custom domain
- INC-006: Control Tower pointing to wrong domain
