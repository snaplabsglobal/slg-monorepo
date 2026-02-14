#!/usr/bin/env ts-node
/**
 * RULE-CT-001: Run ID Immutability Check
 *
 * Constitutional-level rule: run_id must be unique.
 * Overwriting existing run_id directories is a P0 governance violation.
 *
 * Usage:
 *   pnpm proofpack:check-unique <run_id>
 *
 * Exit codes:
 *   0 - Run ID is unique (OK to proceed)
 *   1 - Run ID already exists (GOVERNANCE VIOLATION)
 */

import fs from "fs";
import path from "path";

const PROOF_PACK_DIR = path.resolve("proof-pack");
const RUNS_DIR = path.join(PROOF_PACK_DIR, "runs");

function log(msg: string) {
  console.log(msg);
}

function fail(msg: string): never {
  console.error(`\n🔴 RULE-CT-001 VIOLATION: ${msg}`);
  console.error(`\nThis is a P0 governance violation.`);
  console.error(`Run IDs must be unique. Overwriting evidence is forbidden.`);
  process.exit(1);
}

function main() {
  const runId = process.argv[2];

  log("========================================");
  log("RULE-CT-001: Run ID Immutability Check");
  log("========================================\n");

  if (!runId) {
    log("Usage: pnpm proofpack:check-unique <run_id>");
    log("\nNo run_id provided. Skipping check.");
    process.exit(0);
  }

  log(`Checking run_id: ${runId}`);

  // Validate run_id format (YYYYMMDD-HHMMSS-<sha>-<env>-<browser>)
  const runIdPattern = /^\d{8}-\d{6}-[a-z0-9]+-[a-z0-9]+-[a-z]+$/i;
  if (!runIdPattern.test(runId)) {
    log(`⚠️  Warning: run_id format non-standard (expected: YYYYMMDD-HHMMSS-<sha>-<env>-<browser>)`);
    log(`   Got: ${runId}`);
    // Don't fail on format, but warn
  }

  const runDir = path.join(RUNS_DIR, runId);

  if (fs.existsSync(runDir)) {
    fail(`run_id "${runId}" already exists at ${runDir}`);
  }

  log(`\n✅ RULE-CT-001 PASS: run_id "${runId}" is unique`);
  log(`   Directory ${runDir} does not exist.`);
  log(`   Safe to proceed with proof-pack generation.`);
  process.exit(0);
}

main();
