#!/usr/bin/env ts-node
/**
 * Proof Pack Self-Test Script
 *
 * Tests RULE-CT-001 enforcement and schema validation:
 * 1. Run ID Override Prevention - verifies overwrite detection
 * 2. Schema Destruction Detection - verifies malformed index.json rejection
 *
 * Usage:
 *   pnpm proofpack:selftest
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PROOF_PACK_DIR = path.resolve("proof-pack");
const RUNS_DIR = path.join(PROOF_PACK_DIR, "runs");
const INDEX_PATH = path.join(PROOF_PACK_DIR, "index.json");
const TEST_RUN_ID = "20260101-000000-selftest-local-chromium";

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

function cleanup() {
  // Clean up test artifacts
  const testRunDir = path.join(RUNS_DIR, TEST_RUN_ID);
  if (fs.existsSync(testRunDir)) {
    fs.rmSync(testRunDir, { recursive: true, force: true });
  }
  // Restore original index.json if backup exists
  const backupPath = INDEX_PATH + ".selftest-backup";
  if (fs.existsSync(backupPath)) {
    if (fs.existsSync(INDEX_PATH)) {
      fs.unlinkSync(INDEX_PATH);
    }
    fs.renameSync(backupPath, INDEX_PATH);
  }
}

function backup() {
  // Backup original index.json
  if (fs.existsSync(INDEX_PATH)) {
    fs.copyFileSync(INDEX_PATH, INDEX_PATH + ".selftest-backup");
  }
}

function runTest(name: string, testFn: () => { passed: boolean; output: string }) {
  log(`\n--- Test: ${name} ---`);
  try {
    const result = testFn();
    results.push({ name, ...result });
    log(result.passed ? `✅ PASS: ${name}` : `❌ FAIL: ${name}`);
    if (result.output) {
      log(result.output);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, output: `Exception: ${errorMsg}` });
    log(`❌ FAIL: ${name} (exception)`);
    log(`   ${errorMsg}`);
  }
}

// ============================================================
// TEST 1: Run ID Override Prevention (RULE-CT-001)
// ============================================================
function testRunIdOverridePrevention(): { passed: boolean; output: string } {
  const testRunDir = path.join(RUNS_DIR, TEST_RUN_ID);

  // Create the test run directory (simulating existing run)
  fs.mkdirSync(testRunDir, { recursive: true });
  fs.writeFileSync(
    path.join(testRunDir, "run-meta.json"),
    JSON.stringify({ run_id: TEST_RUN_ID, timestamp: new Date().toISOString() })
  );

  // Try to run check-run-unique with the same run_id
  // It should FAIL (exit code 1)
  try {
    const output = execSync(
      `npx ts-node scripts/proofpack/check-run-unique.ts ${TEST_RUN_ID}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    // If we get here, the script exited with 0 (BAD - it should have failed)
    return {
      passed: false,
      output: `check-run-unique.ts should have failed but passed.\nOutput: ${output}`,
    };
  } catch (error: unknown) {
    // Expected: script should exit with code 1
    const execError = error as { status?: number; stderr?: string; stdout?: string };
    if (execError.status === 1) {
      const stderr = execError.stderr || "";
      if (stderr.includes("RULE-CT-001 VIOLATION")) {
        return {
          passed: true,
          output: `Correctly detected override attempt.\nStderr: ${stderr.slice(0, 200)}...`,
        };
      }
    }
    return {
      passed: false,
      output: `Unexpected error: status=${execError.status}, stderr=${execError.stderr}`,
    };
  } finally {
    // Cleanup test directory
    if (fs.existsSync(testRunDir)) {
      fs.rmSync(testRunDir, { recursive: true, force: true });
    }
  }
}

// ============================================================
// TEST 2: Run ID Unique Check (Positive Case)
// ============================================================
function testRunIdUniqueCheckPositive(): { passed: boolean; output: string } {
  const uniqueRunId = `20260101-000001-unique-test-chromium`;
  const uniqueRunDir = path.join(RUNS_DIR, uniqueRunId);

  // Ensure directory doesn't exist
  if (fs.existsSync(uniqueRunDir)) {
    fs.rmSync(uniqueRunDir, { recursive: true, force: true });
  }

  try {
    const output = execSync(
      `npx ts-node scripts/proofpack/check-run-unique.ts ${uniqueRunId}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    if (output.includes("RULE-CT-001 PASS")) {
      return { passed: true, output: `Correctly passed for unique run_id` };
    }
    return { passed: false, output: `Unexpected output: ${output}` };
  } catch (error: unknown) {
    const execError = error as { status?: number; stderr?: string };
    return {
      passed: false,
      output: `Should have passed but failed: status=${execError.status}`,
    };
  }
}

// ============================================================
// TEST 3: Schema Destruction Detection (Missing version)
// ============================================================
function testSchemaDestructionMissingVersion(): { passed: boolean; output: string } {
  // Create a malformed index.json without version field
  const malformedIndex = {
    // version: "1.1",  <-- intentionally missing
    latest_run_id: "test",
    latest_business_pass: true,
    generated_at: new Date().toISOString(),
    runs: [],
  };

  fs.mkdirSync(PROOF_PACK_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(malformedIndex, null, 2));

  // Run validate-proofpack, it should fail
  try {
    execSync(`npx ts-node scripts/proofpack/validate-proofpack.ts`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    // If we get here, validation passed (BAD)
    return {
      passed: false,
      output: `Validation should have failed for malformed schema`,
    };
  } catch (error: unknown) {
    const execError = error as { status?: number; stderr?: string };
    if (execError.status === 1) {
      return {
        passed: true,
        output: `Correctly rejected malformed schema (missing version)`,
      };
    }
    return { passed: false, output: `Unexpected error: ${execError.status}` };
  }
}

// ============================================================
// TEST 4: Schema Destruction Detection (Invalid runs array)
// ============================================================
function testSchemaDestructionInvalidRuns(): { passed: boolean; output: string } {
  // Create index.json with invalid runs (not an array)
  const malformedIndex = {
    version: "1.1",
    latest_run_id: "test",
    latest_business_pass: true,
    generated_at: new Date().toISOString(),
    runs: "not-an-array", // Invalid type
  };

  fs.mkdirSync(PROOF_PACK_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(malformedIndex, null, 2));

  // Run validate-proofpack
  try {
    execSync(`npx ts-node scripts/proofpack/validate-proofpack.ts`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      passed: false,
      output: `Validation should have failed for invalid runs type`,
    };
  } catch (error: unknown) {
    const execError = error as { status?: number };
    if (execError.status === 1) {
      return {
        passed: true,
        output: `Correctly rejected malformed schema (invalid runs)`,
      };
    }
    return { passed: false, output: `Unexpected error: ${execError.status}` };
  }
}

// ============================================================
// TEST 5: generated_at Field Presence
// ============================================================
function testGeneratedAtField(): { passed: boolean; output: string } {
  // Run build-index and check if generated_at is set
  fs.mkdirSync(PROOF_PACK_DIR, { recursive: true });

  try {
    execSync(`npx ts-node scripts/proofpack/build-index.ts`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Build might fail if no runs, but should still create index
  }

  if (!fs.existsSync(INDEX_PATH)) {
    return { passed: false, output: `index.json was not created` };
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));

  if (!index.generated_at) {
    return { passed: false, output: `generated_at field is missing` };
  }

  // Validate ISO 8601 format
  const timestamp = new Date(index.generated_at);
  if (isNaN(timestamp.getTime())) {
    return {
      passed: false,
      output: `generated_at is not valid ISO 8601: ${index.generated_at}`,
    };
  }

  return {
    passed: true,
    output: `generated_at field present and valid: ${index.generated_at}`,
  };
}

// ============================================================
// MAIN
// ============================================================
function main() {
  log("========================================");
  log("Proof Pack Self-Test Suite");
  log("RULE-CT-001 + Schema Validation");
  log("========================================");
  log(`Timestamp: ${new Date().toISOString()}`);

  // Backup existing state
  backup();

  try {
    // Run all tests
    runTest("Run ID Override Prevention (RULE-CT-001)", testRunIdOverridePrevention);
    runTest("Run ID Unique Check (Positive)", testRunIdUniqueCheckPositive);
    runTest("Schema Destruction: Missing Version", testSchemaDestructionMissingVersion);
    runTest("Schema Destruction: Invalid Runs", testSchemaDestructionInvalidRuns);
    runTest("generated_at Field Presence", testGeneratedAtField);
  } finally {
    // Always cleanup
    cleanup();
  }

  // Summary
  log("\n========================================");
  log("Self-Test Summary");
  log("========================================");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    log(`${r.passed ? "✅" : "❌"} ${r.name}`);
  }

  log(`\nTotal: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    log("\n🔴 SELF-TEST FAILED");
    log("Fix the issues above before proceeding.");
    process.exit(1);
  }

  log("\n✅ ALL SELF-TESTS PASSED");
  log("RULE-CT-001 enforcement verified.");
  log("Schema validation verified.");
  process.exit(0);
}

main();
