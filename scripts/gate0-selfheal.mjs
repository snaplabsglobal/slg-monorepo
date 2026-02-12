#!/usr/bin/env node
/**
 * Gate0 Self-Heal (v0.4 with Circuit Breaker + CI Watcher)
 *
 * Ultra-Safe: Only fixes whitelisted mechanical errors.
 * - LOCKFILE_OUT_OF_SYNC → pnpm install + commit lockfile
 * - TS_NO_EXPORTED_MEMBER → patch import path (whitelisted files only)
 *
 * v0.3 New: CI Watcher replaces sleep 300 with intelligent polling.
 * v0.4 New: Circuit Breaker (熔断机制) prevents infinite retries.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ══════════════════════════════════════════════════════════
// v0.4: 熔断配置 (Circuit Breaker)
// ══════════════════════════════════════════════════════════

const MAX_AUTOFIX_PER_CLASS = 1;   // 同一 class 最多自动修 1 次
const MAX_CI_RETRY = 2;            // 同一 branch 最大 CI 重跑次数
const CIRCUIT_BREAKER_WINDOW_HOURS = 1;  // 熔断检测时间窗口（小时）

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
// v0.4: 熔断机制 (Circuit Breaker)
// ══════════════════════════════════════════════════════════

/**
 * 从 telemetry 文件读取最近 N 小时内同一 branch + class 的 selfheal 尝试次数
 */
function getRecentSelfhealAttempts(branch, gateClass) {
  const telPath = path.join(ROOT, ".gate0-telemetry", "events.jsonl");
  if (!fileExists(telPath)) return 0;

  const cutoffTime = Date.now() - (CIRCUIT_BREAKER_WINDOW_HOURS * 60 * 60 * 1000);
  const events = readFile(telPath)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);

  return events.filter((e) =>
    e.stage === "selfheal" &&
    e.branch === branch &&
    e.class === gateClass &&
    new Date(e.ts).getTime() >= cutoffTime
  ).length;
}

/**
 * 检查熔断：如果最近 1h 内同一 branch + class 的自动修复次数 >= MAX_AUTOFIX_PER_CLASS
 * @returns {{ triggered: boolean, retryCount: number }}
 */
function checkCircuitBreaker(branch, gateClass) {
  const retryCount = getRecentSelfhealAttempts(branch, gateClass);
  return {
    triggered: retryCount >= MAX_AUTOFIX_PER_CLASS,
    retryCount,
  };
}

/**
 * 熔断触发时自动创建 GitHub Issue
 */
function createCircuitBreakerIssue({ repo, branch, errorClass, retryCount }) {
  const title = `🔴 Gate0 Circuit Breaker: ${errorClass} on ${branch}`;
  const body = `## Gate0 熔断触发

| 项目 | 值 |
|------|---|
| Branch | \\\`${branch}\\\` |
| Error Class | \\\`${errorClass}\\\` |
| 自动修复尝试次数 | ${retryCount} |
| 熔断原因 | 达到 MAX_AUTOFIX_PER_CLASS=${MAX_AUTOFIX_PER_CLASS} |

**需要人工介入。** 可能是环境级问题（runner 故障 / 浏览器下载失败 / API 限流）。

cc @CTO`;

  try {
    shInherit(`gh issue create --repo ${repo} --title "${title}" --body "${body}" --label "gate0,circuit-breaker"`);
    console.log("📋 Circuit Breaker Issue created.");
  } catch (e) {
    // gh 可能未安装或无权限，忽略错误但打印警告
    console.log("⚠️  Could not create circuit breaker issue (gh CLI unavailable or no permission).");
  }
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
  console.log("Committed lockfile.");

  // v0.3: push + watch CI
  console.log("");
  console.log("📤 Pushing to remote...");
  shInherit("git push");

  console.log("");
  console.log("👀 Starting CI Watcher (replacing sleep 300)...");
  watchGate0CI();
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
  console.log("Patched import.");

  // v0.3: push + watch CI
  console.log("");
  console.log("📤 Pushing to remote...");
  shInherit("git push");

  console.log("");
  console.log("👀 Starting CI Watcher (replacing sleep 300)...");
  watchGate0CI();
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
// CI Watcher（v0.3 新增）
// 替代 sleep 300，智能等待 CI 完成
// ══════════════════════════════════════════════════════════

/** 检查 gh CLI 是否可用 */
function hasGhCli() {
  try {
    sh("which gh");
    return true;
  } catch {
    return false;
  }
}

/** 获取当前 git 分支名 */
function getBranch() {
  return sh("git rev-parse --abbrev-ref HEAD").trim();
}

/** 从 git remote origin 解析 GitHub repo slug (org/repo) */
function getRepoSlug() {
  const url = sh("git remote get-url origin").trim();
  // 支持 git@github.com:org/repo.git 和 https://github.com/org/repo.git
  const m = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
  if (!m) throw new Error(`Cannot parse repo from origin: ${url}`);
  return `${m[1]}/${m[2]}`;
}

/** 确认 gh CLI 已认证 */
function requireGhAuth() {
  try {
    sh("gh auth status 2>&1");
  } catch {
    throw new Error(
      "gh is not authenticated.\n" +
      "Fix: run `gh auth login` or set GH_TOKEN environment variable."
    );
  }
}

/**
 * 查找当前分支最新的 Gate 0 workflow run ID
 * 最多等 60 秒让 run 出现
 */
function findLatestRunId({ repo, branch, workflowName }) {
  try {
    const raw = sh(
      `gh run list --repo ${repo}` +
      ` --workflow "${workflowName}"` +
      ` --branch ${branch}` +
      ` --limit 5` +
      ` --json databaseId,status,conclusion,createdAt`
    );
    const runs = JSON.parse(raw);
    if (!runs.length) return null;
    return runs[0].databaseId;
  } catch {
    return null;
  }
}

const MAX_WATCH_MINUTES = 15;  // v0.4: CEO Enhancement ③ — Watcher timeout protection

/**
 * 实时 watch CI run（替代 sleep 300）
 * --exit-status: CI 失败时 gh 返回非零 exit code
 * v0.4: 增加 timeout 保护（防止 runner 卡死/网络断开时无限等待）
 */
function watchRun({ repo, runId }) {
  console.log(`⏳ Watching CI run: ${runId} (timeout: ${MAX_WATCH_MINUTES}m)`);
  console.log(`   https://github.com/${repo}/actions/runs/${runId}`);

  // v0.4: 用 timeout 包裹 gh run watch
  // 如果超过 MAX_WATCH_MINUTES → 自动终止并报错
  try {
    shInherit(
      `timeout ${MAX_WATCH_MINUTES * 60} gh run watch ${runId} --repo ${repo} --exit-status`
    );
    console.log("✅ CI passed.");
  } catch (e) {
    // 区分 timeout vs CI failure
    if (e.status === 124) {
      // timeout 命令返回 124 = 超时
      console.error("");
      console.error(`❌ CI Watcher TIMEOUT after ${MAX_WATCH_MINUTES} minutes.`);
      console.error("Possible causes:");
      console.error("  - GitHub Runner stuck/unresponsive");
      console.error("  - CI job hanging (Playwright browser download, etc.)");
      console.error("  - Network interruption");
      console.error("");
      console.error("Suggested action:");
      console.error("  1. Check GitHub Actions runner status");
      console.error(`  2. Cancel run: gh run cancel ${runId} --repo ${repo}`);
      console.error("  3. Manually re-trigger CI");
    }
    throw e;  // re-throw so caller knows it failed
  }
}

/**
 * CI 失败时自动抓取失败摘要
 */
function summarizeFailure({ repo, runId }) {
  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║   ❌  CI FAILED — Failure Summary    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");

  // 1) 列出失败 jobs
  try {
    const jobsRaw = sh(`gh api repos/${repo}/actions/runs/${runId}/jobs`);
    const jobs = JSON.parse(jobsRaw).jobs || [];
    const failed = jobs.filter((j) => j.conclusion && j.conclusion !== "success");

    if (failed.length) {
      console.log("── Failed Jobs ──");
      for (const j of failed) {
        console.log(`  ❌ ${j.name}: ${j.conclusion}`);
      }
      console.log("");
    }
  } catch {
    console.log("(Could not fetch jobs list)");
  }

  // 2) 打印失败步骤日志
  console.log("── Failed Step Logs ──");
  try {
    shInherit(`gh run view ${runId} --repo ${repo} --log-failed`);
  } catch {
    try {
      console.log("(--log-failed unavailable, falling back to summary)");
      shInherit(`gh run view ${runId} --repo ${repo}`);
    } catch {
      console.log("(Could not fetch logs)");
    }
  }

  // 3) 列出 artifacts
  console.log("");
  console.log("── Artifacts ──");
  try {
    const artsRaw = sh(`gh api repos/${repo}/actions/runs/${runId}/artifacts`);
    const arts = JSON.parse(artsRaw).artifacts || [];
    if (arts.length) {
      for (const a of arts) {
        console.log(`  📦 ${a.name} (${a.size_in_bytes} bytes)`);
      }
    } else {
      console.log("  (No artifacts)");
    }
  } catch {
    console.log("  (Could not fetch artifacts list)");
  }

  console.log("");
  console.log(`🔗 Full run: https://github.com/${repo}/actions/runs/${runId}`);
}

/**
 * CI Watcher 主函数
 * 在 selfheal commit + push 之后调用
 */
function watchGate0CI() {
  if (!hasGhCli()) {
    console.log("⚠️  gh CLI not available. Skipping CI watch.");
    console.log("   Install gh: https://cli.github.com/");
    console.log("   Then run: gh auth login");
    return;
  }

  try {
    requireGhAuth();
  } catch (e) {
    console.log("⚠️  gh not authenticated. Skipping CI watch.");
    console.log("   Run: gh auth login");
    return;
  }

  const repo = getRepoSlug();
  const branch = getBranch();
  const workflowName = "Gate 0 - Full Suite";

  // 等待 run 出现
  console.log("⏳ Waiting for CI run to appear...");
  let runId = null;
  for (let i = 0; i < 20; i++) {
    runId = findLatestRunId({ repo, branch, workflowName });
    if (runId) break;
    execSync("sleep 3");
  }

  if (!runId) {
    console.log("⚠️  Could not find CI run. Check GitHub Actions manually.");
    console.log(`   https://github.com/${repo}/actions`);
    return;
  }

  try {
    watchRun({ repo, runId });
  } catch {
    summarizeFailure({ repo, runId });
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════
// 主流程
// ══════════════════════════════════════════════════════════

async function main() {
  if (!fileExists(path.join(ROOT, "pnpm-workspace.yaml"))) {
    throw new Error("Not at repo root (pnpm-workspace.yaml missing).");
  }

  console.log("== Gate0 SELFHEAL (v0.4 Strategy Pattern + CI Watcher + Circuit Breaker) ==");

  const r1 = runCheckCapture();
  console.log("Log:", r1.logPath);

  if (r1.ok) {
    console.log("✅ Gate0 already green. Nothing to do.");
    return;
  }

  // 优先读取 GATE0_CLASS
  const gateClass = parseGate0Class(r1.log) ?? "UNKNOWN";
  console.log("Detected GATE0_CLASS:", gateClass);

  // v0.4: 熔断检查
  const branch = sh("git rev-parse --abbrev-ref HEAD").trim();
  const circuitBreaker = checkCircuitBreaker(branch, gateClass);

  if (circuitBreaker.triggered) {
    console.log("");
    console.log("╔══════════════════════════════════════╗");
    console.log("║   🔴  CIRCUIT BREAKER TRIGGERED      ║");
    console.log("╚══════════════════════════════════════╝");
    console.log("");
    console.log(`Class:        ${gateClass}`);
    console.log(`Branch:       ${branch}`);
    console.log(`Retry count:  ${circuitBreaker.retryCount}`);
    console.log(`Max allowed:  ${MAX_AUTOFIX_PER_CLASS}`);
    console.log("");
    console.log("This class has been auto-fixed too many times in the last hour.");
    console.log("Manual intervention required.");
    console.log("");

    // 尝试创建 Issue
    if (hasGhCli()) {
      try {
        const repo = getRepoSlug();
        createCircuitBreakerIssue({ repo, branch, errorClass: gateClass, retryCount: circuitBreaker.retryCount });
      } catch { /* ignore */ }
    }

    emitTelemetry("selfheal", gateClass, false, {
      reason: "circuit_breaker",
      retry_count: circuitBreaker.retryCount,
    });
    process.exit(1);
  }

  // dispatch
  const handler = HANDLERS[gateClass] ?? handleManualHint;
  await handler({ log: r1.log, gateClass, logPath: r1.logPath });
}

main().catch((e) => { console.error(e); process.exit(1); });
