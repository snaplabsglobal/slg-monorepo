#!/usr/bin/env node
/**
 * Gate 0-B: Auth Proof Pack Completeness Check
 *
 * SLG_Auth_Governance_v1 Section IV.1
 *
 * Validates that all 10 required Proof Pack artifacts exist.
 * If ANY artifact is missing, the gate FAILS.
 *
 * Usage:
 *   node scripts/gate0/auth/check-proof-pack.mjs [--proof-pack-dir <path>]
 *
 * Exit codes:
 *   0 - All artifacts present
 *   1 - Missing artifacts (build should fail)
 */

import fs from "node:fs";
import path from "node:path";

const REQUIRED_ARTIFACTS = [
  "auth-target.json",
  "trace-webkit.zip",
  "screenshots/01-login.png",
  "screenshots/02-after-login.png",
  "screenshots/03-after-refresh.png",
  "screenshots/04-after-logout.png",
  "cookies-after-login.json",
  "cookies-after-logout.json",
  "auth-token-capture.json", // 4 diagnostic items: URL, status, body, Set-Cookie
  "summary.txt",
];

// HAR is recorded during test, either webkit or chromium
const HAR_ARTIFACTS = ["auth-webkit.har", "auth-chromium.har"];

function parseArgs() {
  const args = process.argv.slice(2);
  let proofPackDir = "apps/jss-web/test-results/auth-proof-pack";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--proof-pack-dir" && args[i + 1]) {
      proofPackDir = args[i + 1];
      i++;
    }
    if (args[i] === "--help") {
      console.log(`
Gate 0-B: Auth Proof Pack Completeness Check

Usage:
  node scripts/gate0/auth/check-proof-pack.mjs [options]

Options:
  --proof-pack-dir <path>   Path to proof pack directory (default: apps/jss-web/test-results/auth-proof-pack)
  --help                    Show this help

Required artifacts (all must exist):
${REQUIRED_ARTIFACTS.map((a) => `  - ${a}`).join("\n")}
  - One of: ${HAR_ARTIFACTS.join(" | ")}
      `);
      process.exit(0);
    }
  }

  return { proofPackDir };
}

function checkProofPack(proofPackDir) {
  const absoluteDir = path.resolve(proofPackDir);

  if (!fs.existsSync(absoluteDir)) {
    console.error(`[Gate 0-B] FAIL: Proof Pack directory not found: ${absoluteDir}`);
    console.error("           Run 'pnpm test:e2e:auth:ngrok' to generate Proof Pack");
    return { success: false, missing: ["<entire directory>"], found: [] };
  }

  const missing = [];
  const found = [];

  // Check required artifacts
  for (const artifact of REQUIRED_ARTIFACTS) {
    const artifactPath = path.join(absoluteDir, artifact);
    if (fs.existsSync(artifactPath)) {
      found.push(artifact);
    } else {
      missing.push(artifact);
    }
  }

  // Check HAR artifacts (at least one must exist)
  const hasHar = HAR_ARTIFACTS.some((har) =>
    fs.existsSync(path.join(absoluteDir, har))
  );
  if (hasHar) {
    const harFound = HAR_ARTIFACTS.find((har) =>
      fs.existsSync(path.join(absoluteDir, har))
    );
    found.push(harFound);
  } else {
    missing.push(`HAR file (one of: ${HAR_ARTIFACTS.join(", ")})`);
  }

  return {
    success: missing.length === 0,
    missing,
    found,
  };
}

function main() {
  const { proofPackDir } = parseArgs();

  console.log("═══════════════════════════════════════════");
  console.log("Gate 0-B: Auth Proof Pack Completeness Check");
  console.log("═══════════════════════════════════════════");
  console.log(`Checking: ${proofPackDir}`);
  console.log();

  const result = checkProofPack(proofPackDir);

  if (result.found.length > 0) {
    console.log("Found artifacts:");
    result.found.forEach((a) => console.log(`  [x] ${a}`));
  }

  if (result.missing.length > 0) {
    console.log();
    console.log("Missing artifacts:");
    result.missing.forEach((a) => console.log(`  [ ] ${a}`));
  }

  console.log();

  if (result.success) {
    console.log("✅ Gate 0-B PASS: Proof Pack complete");
    console.log();
    process.exit(0);
  } else {
    console.error("❌ Gate 0-B FAIL: Proof Pack incomplete");
    console.error();
    console.error("Required: All 10 artifacts must exist");
    console.error("Missing:", result.missing.length);
    console.error();
    console.error("To generate Proof Pack:");
    console.error("  cd apps/jss-web");
    console.error("  E2E_BASE_URL=<url> E2E_EMAIL=<email> E2E_PASSWORD=<pwd> pnpm test:e2e:auth:ngrok");
    console.error();
    process.exit(1);
  }
}

main();
