#!/usr/bin/env node

/**
 * Deploy Smoke Guard (GateD)
 *
 * Validates deployment accessibility before CEO notification.
 * SEOS Rule: Guard PASS before notifying CEO.
 *
 * Usage:
 *   node scripts/jss-deploy-smoke.mjs --base <url> --route <path> --assert <text>
 *
 * Example:
 *   node scripts/jss-deploy-smoke.mjs \
 *     --base https://jss-web-git-dev-snaplabs.vercel.app \
 *     --route /import-lab \
 *     --assert "Import Lab"
 */

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};

const base = getArg("--base");
const route = getArg("--route");
const assertText = getArg("--assert");
const jsonOutput = args.includes("--json");

if (!base || !route || !assertText) {
  console.error("Usage: --base <url> --route <path> --assert <text> [--json]");
  console.error("");
  console.error("SEOS Rule: --base must be environment domain (dev.jobsitesnap.com or jobsitesnap.com)");
  console.error("           *.vercel.app preview URLs are FORBIDDEN for CEO notification");
  process.exit(1);
}

// SEOS Rule: Block preview URLs - only environment domains allowed
if (base.includes('vercel.app')) {
  console.error("❌ SEOS VIOLATION: Preview URLs (*.vercel.app) are FORBIDDEN");
  console.error("   Use environment domain: https://dev.jobsitesnap.com or https://jobsitesnap.com");
  process.exit(1);
}

const url = base.replace(/\/$/, "") + route;

(async () => {
  console.log(`\n🔍 Deploy Smoke Guard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  // Detect environment from domain
  let env = 'unknown';
  if (base.includes('dev.jobsitesnap.com')) env = 'dev';
  else if (base.includes('jobsitesnap.com') || base.includes('jss.snaplabs.global')) env = 'production';
  else if (base.includes('vercel.app')) env = 'preview (NOT ALLOWED for CEO notification)';

  console.log(`ENV: ${env}`);
  console.log(`BASE_URL: ${base}`);
  console.log(`\nCHECK:`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SEOS-Deploy-Smoke-Guard/1.0',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    console.log(`  GET ${route} → ${res.status}`);

    if (res.status !== 200) {
      console.log(`  ASSERT "${assertText}" → SKIP (non-200)`);
      console.log(`\n❌ Guard: Deploy Smoke Guard → FAIL`);
      console.log(`   Reason: HTTP ${res.status}`);
      process.exit(1);
    }

    const body = await res.text();

    // Check for deployment not found
    if (body.includes('DEPLOYMENT_NOT_FOUND') || body.includes('This deployment is not available')) {
      console.log(`  ASSERT "${assertText}" → SKIP`);
      console.log(`\n❌ Guard: Deploy Smoke Guard → FAIL`);
      console.log(`   Reason: DEPLOYMENT_NOT_FOUND`);
      process.exit(1);
    }

    // Check for auth redirect (login page when expecting public route)
    if (body.includes('Sign in') && body.includes('login') && !route.includes('login')) {
      console.log(`  ASSERT "${assertText}" → SKIP`);
      console.log(`\n❌ Guard: Deploy Smoke Guard → FAIL`);
      console.log(`   Reason: AUTH_REDIRECT (redirected to login)`);
      process.exit(1);
    }

    if (!body.includes(assertText)) {
      console.log(`  ASSERT "${assertText}" → FAIL`);
      console.log(`\n❌ Guard: Deploy Smoke Guard → FAIL`);
      console.log(`   Reason: ASSERT_FAIL (text not found in page)`);
      process.exit(1);
    }

    console.log(`  ASSERT "${assertText}" → PASS`);
    console.log(`\n✅ Guard: Deploy Smoke Guard → PASS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // JSON output for CI integration
    if (jsonOutput) {
      const result = {
        schema: "seos.smoke-status.v0.1",
        app: "jss-web",
        generated_at: new Date().toISOString(),
        environments: [{
          env,
          base_url: base,
          checks: [{
            route,
            expect: { status: 200, contains: assertText },
            result: { status: "pass", http_status: 200, assertion: "pass" }
          }],
          overall: "pass",
          evidence: { log_excerpt: "PASS: Deploy Smoke Guard" }
        }]
      };
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.log(`  GET ${route} → ERROR`);
    console.log(`\n❌ Guard: Deploy Smoke Guard → FAIL`);
    console.log(`   Reason: ${err.message}`);

    if (jsonOutput) {
      const result = {
        schema: "seos.smoke-status.v0.1",
        app: "jss-web",
        generated_at: new Date().toISOString(),
        environments: [{
          env,
          base_url: base,
          checks: [{
            route,
            expect: { status: 200, contains: assertText },
            result: { status: "fail", http_status: null, assertion: "skipped", fail_class: "NETWORK_ERROR" }
          }],
          overall: "fail",
          evidence: { log_excerpt: `FAIL: ${err.message}` }
        }]
      };
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(1);
  }
})();
