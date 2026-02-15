# JSS Domain Binding Runbook

**Intervention ID:** `mi_20260214_174500_infra1`
**Type:** INFRA_DEPENDENCY
**Owner:** Ops / Domain Owner
**ETA:** 5 minutes

## Problem

`jss.snaplabs.global` returns `MIDDLEWARE_INVOCATION_FAILED` while `jss-web.vercel.app` and `www.jobsitesnap.com` work correctly. The custom domain is not bound to the jss-web production deployment.

## Step 1: Vercel Domain Configuration

1. Go to: https://vercel.com/snap-labs-global/jss-web/settings/domains
2. Check if `jss.snaplabs.global` exists in the domain list
   - **If missing:** Click "Add" → Enter `jss.snaplabs.global` → Click "Add"
   - **If exists but broken:** Click the three dots (⋮) → "Remove" → Re-add
3. Ensure domain shows "Production" badge (not Preview)
4. Note the CNAME value shown (should be `cname.vercel-dns.com`)

## Step 2: Cloudflare DNS Configuration

1. Go to: Cloudflare Dashboard → snaplabs.global → DNS
2. Find record for `jss` subdomain
3. Verify settings:
   - **Type:** CNAME
   - **Name:** jss
   - **Target:** `cname.vercel-dns.com`
   - **Proxy status:** DNS only (gray cloud, NOT orange)
4. If proxy is enabled (orange cloud), click to toggle to gray cloud

## Step 3: Verification

Run this command (or paste in browser):

```bash
curl -sS "https://jss.snaplabs.global/api/proof-pack" | jq '.health.status'
```

**Expected output:** `"HEALTHY"`

If still failing, wait 2-3 minutes for DNS propagation and retry.

## Step 4: Close Intervention

Once verified, update intervention log:

```bash
# In slg-monorepo directory
echo '{"event":"resolved","id":"mi_20260214_174500_infra1","ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'","resolved_by":"ops","verification":"jss.snaplabs.global/api/proof-pack=HEALTHY"}' >> packages/seos/logs/manual-interventions.jsonl
```

## Prevention

This runbook should be replaced by:
1. CTO obtains Vercel Team Member role with domain management permissions
2. Domain-binding guard added to Gate0 (automatic verification)

---

**Contact:** CTO / SEOS System
**Last Updated:** 2026-02-14
