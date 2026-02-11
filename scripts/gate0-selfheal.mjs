#!/usr/bin/env node
/**
 * Gate0 Self-Heal (v0.2 Strategy Pattern)
 *
 * Ultra-Safe: Only fixes whitelisted mechanical errors.
 * - LOCKFILE_OUT_OF_SYNC → pnpm install + commit lockfile
 * - TS_NO_EXPORTED_MEMBER → patch import path (whitelisted files only)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ══════════════════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════════════════

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts });
}
function shInherit(cmd) {
  execSync(cmd, { stdio: "inherit", encoding: "utf8" });
}
function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function readFile(p) { return fs.readFileSync(p, "utf8"); }
function writeFile(p, s) { fs.writeFileSync(p, s, "utf8"); }

// ══════════════════════════════════════════════════════════
// 白名单安全阀（加固版：路径规范化 + 精确范围）
// ══════════════════════════════════════════════════════════

function normalize(file) {
  return path.posix.normalize(file.replace(/\\/g, "/"));
}

function isWhitelisted(file) {
  const f = normalize(file);
  if (f === "pnpm-lock.yaml") return true;
  if (f === "package.json") return true;
  if (f.startsWith("scripts/")) return true;
  if (f.startsWith("apps/jss-web/app/components/")) return true;
  if (
    f.startsWith("apps/jss-web/app/") &&
    f.endsWith(".tsx") &&
    f.includes("TestHarness")
  ) return true;
  return false;
}

function stageAndCommit(files, message) {
  // 白名单硬阀
  for (const f of files) {
    if (!isWhitelisted(f)) {
      throw new Error(`BLOCKED: Non-whitelisted file: ${f}`);
    }
    shInherit(`git add ${f}`);
  }
  // 防空 commit
  const status = sh("git status --porcelain");
  if (!status.trim()) {
    console.log("Nothing to commit.");
    return;
  }
  // 最大改动文件数限制
  if (files.length > 2) {
    throw new Error(`BLOCKED: Too many files (${files.length}). Max 2.`);
  }
  shInherit(`git commit -m "${message}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"`);
}

// ══════════════════════════════════════════════════════════
// 防循环：同一 class 只自动修 1 次
// ══════════════════════════════════════════════════════════

function alreadyAutofixedRecently(gateClass) {
  const out = sh("git log -n 10 --pretty=%s");
  return out.split("\n").some(
    (s) => s.includes("chore(gate0): autofix") && s.includes(gateClass)
  );
}

// ══════════════════════════════════════════════════════════
// 诊断摘要（可直接贴 PR）
// ══════════════════════════════════════════════════════════

function printSummary({ gateClass, logPath, suggestion }) {
  console.log("\n==== Gate0 Self-Heal Summary ====");
  console.log(`Class:      ${gateClass}`);
  console.log(`Log:        ${logPath}`);
  console.log(`Suggestion: ${suggestion}`);
  console.log("================================\n");
}

// ══════════════════════════════════════════════════════════
// 错误解析器（优先 GATE0_CLASS，fallback 正则）
// ══════════════════════════════════════════════════════════

function parseGate0Class(log) {
  const m = log.match(/\[GATE0_CLASS\]\s+([A-Z0-9_]+)/);
  return m ? m[1] : null;
}

function parseOutdatedLockfile(log) {
  return /ERR_PNPM_OUTDATED_LOCKFILE/.test(log) ||
         /Lockfile out of sync/i.test(log);
}

function parseCannotResolve(log) {
  const m = log.match(/Can't resolve '(@slo\/[^']+)'/);
  return m ? { pkg: m[1] } : null;
}

function parseNoExportedMember(log) {
  const m = log.match(
    /Module ['"](.+?)['"] has no exported member ['"](.+?)['"]/
  );
  return m ? { moduleSpec: m[1], member: m[2] } : null;
}

// ══════════════════════════════════════════════════════════
// Importer 定位器
// ══════════════════════════════════════════════════════════

function locateImporterFromLog(log) {
  const importerMatch =
    log.match(/\.\/(apps\/jss-web\/app\/[^\s:]+):\d+(?::\d+)?/) ||
    log.match(/\.\/(app\/[^\s:]+):\d+(?::\d+)?/);
  if (!importerMatch) return null;
  const rel = importerMatch[1].startsWith("apps/")
    ? importerMatch[1]
    : path.join("apps/jss-web", importerMatch[1]);
  const abs = path.join(ROOT, rel);
  return fileExists(abs) ? abs : null;
}

function resolveAppAliasToFile(moduleSpec) {
  if (!moduleSpec.startsWith("@/")) return null;
  const rel = moduleSpec.replace(/^@\//, "apps/jss-web/app/");
  const candidates = [
    `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`, `${rel}/index.tsx`,
  ].map((c) => path.join(ROOT, c));
  return candidates.find(fileExists) ?? null;
}

function findExportLocation(member) {
  const patterns = [
    `export function ${member}\\b`,
    `export const ${member}\\b`,
    `export\\s*\\{[^\\}]*\\b${member}\\b`,
  ];
  for (const p of patterns) {
    try {
      const out = sh(`rg -n "${p}" .`, { cwd: ROOT });
      const first = out.split("\n").find(Boolean);
      if (!first) continue;
      return path.join(ROOT, first.split(":")[0]);
    } catch { /* ignore */ }
  }
  return null;
}

function patchImportToNewModule(importerFile, member, oldModuleSpec, newFileAbs) {
  const appRoot = path.join(ROOT, "apps/jss-web/app/");
  if (!newFileAbs.startsWith(appRoot)) return false;
  let newModuleSpec = "@/" + path.relative(appRoot, newFileAbs)
    .replace(/\\/g, "/").replace(/\.(ts|tsx)$/, "").replace(/\/index$/, "");
  const src = readFile(importerFile);
  const escaped = oldModuleSpec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `import\\s*\\{([^}]*\\b${member}\\b[^}]*)\\}\\s*from\\s*['"]${escaped}['"];?`, "m"
  );
  if (!re.test(src)) return false;
  const replaced = src.replace(re, (_, inside) =>
    `import { ${inside.trim()} } from '${newModuleSpec}'`
  );
  if (replaced === src) return false;
  writeFile(importerFile, replaced);
  return true;
}

// ══════════════════════════════════════════════════════════
// Telemetry 写入
// ══════════════════════════════════════════════════════════

function emitTelemetry(stage, gateClass, ok, extra = {}) {
  const telDir = path.join(ROOT, ".gate0-telemetry");
  fs.mkdirSync(telDir, { recursive: true });
  const tel = path.join(telDir, "events.jsonl");
  const sha = sh("git rev-parse --short HEAD").trim();
  const branch = sh("git rev-parse --abbrev-ref HEAD").trim();
  const event = {
    ts: new Date().toISOString(),
    run_id: `${sha}-${Date.now()}`,
    where: process.env.GITHUB_ACTIONS ? "ci" : "local",
    actor: process.env.GITHUB_ACTOR ?? "local",
    branch, sha, stage, class: gateClass, ok,
    ...extra,
  };
  fs.appendFileSync(tel, JSON.stringify(event) + "\n");
}

// ══════════════════════════════════════════════════════════
// Strategy Handlers
// ══════════════════════════════════════════════════════════

async function handleLockfileFix({ gateClass, logPath }) {
  if (alreadyAutofixedRecently(gateClass)) {
    printSummary({ gateClass, logPath,
      suggestion: "Already attempted lockfile autofix once. Manual check required." });
    emitTelemetry("selfheal", gateClass, false, { reason: "loop_prevention" });
    process.exit(1);
  }
  shInherit("pnpm -w install");
  const diff = sh("git diff --name-only").trim().split("\n").filter(Boolean);
  if (!diff.includes("pnpm-lock.yaml")) {
    printSummary({ gateClass, logPath,
      suggestion: "pnpm install did not change lockfile. Verify Node/pnpm versions match CI." });
    emitTelemetry("selfheal", gateClass, false, { reason: "no_lockfile_diff" });
    process.exit(1);
  }
  stageAndCommit(["pnpm-lock.yaml"], `chore(gate0): autofix ${gateClass}`);
  emitTelemetry("selfheal", gateClass, true, { files_changed: 1 });
  console.log("Committed lockfile. Re-running Gate0...");
  shInherit("pnpm gate0:check");
}

async function handleNoExportFix({ log, gateClass, logPath }) {
  if (alreadyAutofixedRecently(gateClass)) {
    printSummary({ gateClass, logPath,
      suggestion: "Already attempted TS import fix once. Manual intervention required." });
    emitTelemetry("selfheal", gateClass, false, { reason: "loop_prevention" });
    process.exit(1);
  }
  const ne = parseNoExportedMember(log);
  if (!ne) {
    printSummary({ gateClass, logPath,
      suggestion: "Class says TS_NO_EXPORTED_MEMBER but parser failed. Check log format." });
    emitTelemetry("selfheal", gateClass, false, { reason: "parse_failed" });
    process.exit(1);
  }
  const importerAbs = locateImporterFromLog(log);
  if (!importerAbs) {
    printSummary({ gateClass, logPath,
      suggestion: "Cannot locate importer file from log. Manual fix required." });
    emitTelemetry("selfheal", gateClass, false, { reason: "importer_not_found" });
    process.exit(1);
  }
  const newLoc = findExportLocation(ne.member);
  if (!newLoc) {
    printSummary({ gateClass, logPath,
      suggestion: `No export found for '${ne.member}'. Either re-export it or update harness.` });
    emitTelemetry("selfheal", gateClass, false, { reason: "export_not_found" });
    process.exit(1);
  }
  const patched = patchImportToNewModule(importerAbs, ne.member, ne.moduleSpec, newLoc);
  if (!patched) {
    printSummary({ gateClass, logPath,
      suggestion: "Import patch failed (pattern mismatch). Manual update needed." });
    emitTelemetry("selfheal", gateClass, false, { reason: "patch_failed" });
    process.exit(1);
  }
  const relFile = path.relative(ROOT, importerAbs);
  stageAndCommit([relFile], `chore(gate0): autofix ${gateClass}`);
  emitTelemetry("selfheal", gateClass, true, { files_changed: 1 });
  console.log("Patched import. Re-running Gate0...");
  shInherit("pnpm gate0:check");
}

async function handleWorkspaceResolveHint({ gateClass, logPath }) {
  printSummary({ gateClass, logPath,
    suggestion: "Workspace pkg resolve error. Check: CI root install (pnpm -w install), turbo build graph, next.config.js transpilePackages for @slo/*." });
  emitTelemetry("selfheal", gateClass, false, { reason: "not_auto_fixable" });
  process.exit(1);
}

async function handleManualHint({ gateClass, logPath }) {
  printSummary({ gateClass, logPath,
    suggestion: "Not auto-fixable under v0.2 whitelist. Inspect log and fix manually, then rerun pnpm gate0:check." });
  emitTelemetry("selfheal", gateClass, false, { reason: "not_auto_fixable" });
  process.exit(1);
}

// ══════════════════════════════════════════════════════════
// Strategy Dispatch Table
// ══════════════════════════════════════════════════════════

const HANDLERS = {
  LOCKFILE_OUT_OF_SYNC:       handleLockfileFix,
  TS_NO_EXPORTED_MEMBER:      handleNoExportFix,
  MODULE_NOT_FOUND_WORKSPACE: handleWorkspaceResolveHint,
  NEXT_BUILD_ERROR_OTHER:     handleManualHint,
  PLAYWRIGHT_TIMEOUT:         handleManualHint,
  PLAYWRIGHT_ASSERTION:       handleManualHint,
  VISUAL_REGRESSION:          handleManualHint,
  UNKNOWN:                    handleManualHint,
};

// ══════════════════════════════════════════════════════════
// Gate 0 执行 + 日志捕获
// ══════════════════════════════════════════════════════════

function runCheckCapture() {
  const logDir = path.join(ROOT, ".gate0-logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `gate0-${Date.now()}.log`);
  try {
    const out = sh("bash scripts/gate0-check.sh", { stdio: "pipe" });
    writeFile(logPath, out);
    return { ok: true, logPath, log: out };
  } catch (e) {
    const log = (e?.stdout ?? "") + "\n" + (e?.stderr ?? "");
    writeFile(logPath, log);
    return { ok: false, logPath, log };
  }
}

// ══════════════════════════════════════════════════════════
// 主流程
// ══════════════════════════════════════════════════════════

async function main() {
  if (!fileExists(path.join(ROOT, "pnpm-workspace.yaml"))) {
    throw new Error("Not at repo root (pnpm-workspace.yaml missing).");
  }

  console.log("== Gate0 SELFHEAL (v0.2 Strategy Pattern) ==");

  const r1 = runCheckCapture();
  console.log("Log:", r1.logPath);

  if (r1.ok) {
    console.log("✅ Gate0 already green. Nothing to do.");
    return;
  }

  // 优先读取 GATE0_CLASS
  const gateClass = parseGate0Class(r1.log) ?? "UNKNOWN";
  console.log("Detected GATE0_CLASS:", gateClass);

  // dispatch
  const handler = HANDLERS[gateClass] ?? handleManualHint;
  await handler({ log: r1.log, gateClass, logPath: r1.logPath });
}

main().catch((e) => { console.error(e); process.exit(1); });
