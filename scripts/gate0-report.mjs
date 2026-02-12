#!/usr/bin/env node
/**
 * Gate0 Telemetry Report (v1)
 *
 * Usage:
 *   node scripts/gate0-report.mjs <fileOrDir> [more...] [--since ISO] [--until ISO]
 *
 * Examples:
 *   node scripts/gate0-report.mjs .gate0-telemetry/events.jsonl
 *   node scripts/gate0-report.mjs artifacts/
 *   node scripts/gate0-report.mjs artifacts/ --since "2026-02-04T00:00:00Z" --until "2026-02-11T00:00:00Z"
 */
import fs from "node:fs";
import path from "node:path";

// ══════════════════════════════════════════════════════════
// CLI 参数解析
// ══════════════════════════════════════════════════════════

const rawArgs = process.argv.slice(2);

function takeArg(name) {
  const idx = rawArgs.indexOf(name);
  if (idx === -1) return null;
  return rawArgs[idx + 1] ?? null;
}

const sinceArg = takeArg("--since");
const untilArg = takeArg("--until");
const sinceTs = sinceArg ? Date.parse(sinceArg) : null;
const untilTs = untilArg ? Date.parse(untilArg) : null;

// 过滤掉 --since/--until 及其值，剩下的是文件/目录参数
const fileArgs = rawArgs.filter((x, i) => {
  const prev = rawArgs[i - 1];
  if (x === "--since" || x === "--until") return false;
  if (prev === "--since" || prev === "--until") return false;
  if (x.startsWith("-")) return false;
  return true;
});

if (!fileArgs.length || rawArgs.includes("-h") || rawArgs.includes("--help")) {
  console.log(`
Usage:
  node scripts/gate0-report.mjs <fileOrDir> [more...] [--since ISO] [--until ISO]

Options:
  --since   Only include events at or after this timestamp
  --until   Only include events before this timestamp

If an argument is a directory, all *.jsonl files under it are included recursively.
  `);
  process.exit(fileArgs.length ? 0 : 1);
}

// ══════════════════════════════════════════════════════════
// 文件读取
// ══════════════════════════════════════════════════════════

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function listJsonlRec(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && ent.name.endsWith(".jsonl")) out.push(full);
    }
  }
  return out;
}

function readJsonl(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.ts) events.push(obj);
    } catch { /* skip malformed */ }
  }
  return events;
}

// ══════════════════════════════════════════════════════════
// 聚合 & 统计
// ══════════════════════════════════════════════════════════

const AUTO_FIX_WINDOW_MIN = 30;
const AUTO_WHITELIST = new Set(["LOCKFILE_OUT_OF_SYNC", "TS_NO_EXPORTED_MEMBER"]);

function fmtPct(n, d) { return d ? `${Math.round((n / d) * 1000) / 10}%` : "—"; }
function fmtMin(x) { return Number.isFinite(x) ? `${Math.round(x * 10) / 10}m` : "—"; }
function clamp100(x) { return Math.max(0, Math.min(100, Number.isFinite(x) ? x : 0)); }

function buildReport(events) {
  const norm = events
    .map((e) => ({ ...e, __t: new Date(e.ts).getTime() }))
    .filter((e) => Number.isFinite(e.__t))
    .sort((a, b) => a.__t - b.__t);

  const checks = norm.filter((e) => e.stage === "check");
  const selfheals = norm.filter((e) => e.stage === "selfheal");

  const totalChecks = checks.length;
  const failedChecks = checks.filter((e) => !e.ok).length;
  const okChecks = checks.filter((e) => e.ok).length;

  // Failed class breakdown
  const failedClassCount = new Map();
  for (const e of checks) {
    if (!e.ok) failedClassCount.set(e.class, (failedClassCount.get(e.class) ?? 0) + 1);
  }

  // Auto-fixable failures
  let autofixableFailures = 0;
  for (const e of checks) {
    if (!e.ok && AUTO_WHITELIST.has(e.class)) autofixableFailures++;
  }

  // Self-heal success: look for OK check in same branch within window
  const checksByBranch = new Map();
  for (const c of checks) {
    const b = c.branch ?? "unknown";
    if (!checksByBranch.has(b)) checksByBranch.set(b, []);
    checksByBranch.get(b).push(c);
  }

  let selfhealAttempts = 0, selfhealSuccess = 0;
  const selfhealByClass = new Map();

  for (const s of selfheals) {
    selfhealAttempts++;
    const cls = s.class ?? "UNKNOWN";
    if (!selfhealByClass.has(cls)) selfhealByClass.set(cls, { attempts: 0, success: 0 });
    selfhealByClass.get(cls).attempts++;

    const arr = checksByBranch.get(s.branch ?? "unknown") ?? [];
    const deadline = s.__t + AUTO_FIX_WINDOW_MIN * 60_000;
    if (arr.find((c) => c.__t >= s.__t && c.__t <= deadline && c.ok)) {
      selfhealSuccess++;
      selfhealByClass.get(cls).success++;
    }
  }

  // MTTR: failed check → next OK check in same branch
  const mttrDeltas = [];
  for (const f of checks.filter((e) => !e.ok)) {
    const arr = checksByBranch.get(f.branch ?? "unknown") ?? [];
    const nextOk = arr.find((c) => c.__t > f.__t && c.ok);
    if (nextOk) mttrDeltas.push((nextOk.__t - f.__t) / 60_000);
  }
  const mttrAvg = mttrDeltas.length
    ? mttrDeltas.reduce((a, b) => a + b, 0) / mttrDeltas.length : NaN;

  // v0.4: CI Duration tracking
  const ciDurations = checks
    .map((e) => e.ci_duration_ms)
    .filter((d) => Number.isFinite(d) && d > 0);
  const avgCiDurationMs = ciDurations.length
    ? ciDurations.reduce((a, b) => a + b, 0) / ciDurations.length : NaN;

  return {
    total: norm.length,
    firstTs: norm[0]?.ts ?? "—",
    lastTs: norm.at(-1)?.ts ?? "—",
    totalChecks, failedChecks, okChecks,
    failedClassCount, autofixableFailures,
    selfhealAttempts, selfhealSuccess, selfhealByClass,
    mttrAvg, mttrSamples: mttrDeltas.length,
    avgCiDurationMs, ciDurationSamples: ciDurations.length,
  };
}

// ══════════════════════════════════════════════════════════
// Health Score (0-100) — v0.4: 含波动惩罚 S_vol
// ══════════════════════════════════════════════════════════

/**
 * @param {object} r - 当前周期聚合数据
 * @param {number|null} prevScore - 上一周期 Health Score（首次运行传 null）
 */
function gate0HealthScore(r, prevScore = null) {
  const failureRate = r.totalChecks ? r.failedChecks / r.totalChecks : 0;
  const selfhealRate = r.selfhealAttempts > 0
    ? r.selfhealSuccess / r.selfhealAttempts : 1;
  const coverage = r.failedChecks > 0
    ? r.autofixableFailures / r.failedChecks : 1;
  const mttrMin = Number.isFinite(r.mttrAvg) ? r.mttrAvg : 0;

  const S_fail = clamp100(100 * (1 - failureRate / 0.30));
  const S_fix  = clamp100(100 * Math.max(0, Math.min(1, selfhealRate)));
  const S_cov  = clamp100(100 * Math.max(0, Math.min(1, coverage)));
  const S_mttr = clamp100(100 * (1 - mttrMin / 20));

  // v0.4: 波动惩罚项
  // 首次运行（无上周数据）= 满分（不惩罚）
  // Calculate base score without volatility to compare with prevScore
  const baseScore = 0.30 * S_fail + 0.22 * S_fix + 0.13 * S_cov + 0.25 * S_mttr;
  const normalizedBase = baseScore / 0.90 * 100; // Scale to 0-100
  const deltaScore = prevScore !== null ? Math.abs(prevScore - normalizedBase) : 0;
  const S_vol = clamp100(100 * (1 - deltaScore / 30));

  // v0.4 weights: 30% fail, 22% fix, 13% cov, 25% mttr, 10% vol
  const score = 0.30 * S_fail + 0.22 * S_fix + 0.13 * S_cov
              + 0.25 * S_mttr + 0.10 * S_vol;

  let band = "Green";
  if (score < 60) band = "Red";
  else if (score < 75) band = "Yellow";
  else if (score < 90) band = "Light Green";

  return { score: Math.round(score * 10) / 10, band,
    parts: { S_fail, S_fix, S_cov, S_mttr, S_vol },
    deltaScore: Math.round(deltaScore * 10) / 10 };
}

// ══════════════════════════════════════════════════════════
// Markdown 渲染
// ══════════════════════════════════════════════════════════

function mdTable(rows) {
  const [h, ...body] = rows;
  return [
    `| ${h.join(" | ")} |`,
    `| ${h.map(() => "---").join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

function sortDesc(map) {
  return [...map.entries()].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}

// ══════════════════════════════════════════════════════════
// 主流程
// ══════════════════════════════════════════════════════════

// 收集文件
const files = [];
for (const a of fileArgs) {
  const p = path.resolve(a);
  if (isDir(p)) files.push(...listJsonlRec(p));
  else files.push(p);
}
const uniq = [...new Set(files)].filter((f) => fs.existsSync(f));
if (!uniq.length) { console.error("No .jsonl files found."); process.exit(1); }

// 读取 events
let events = [];
for (const f of uniq) events.push(...readJsonl(f));

// 时间窗口过滤
if (sinceTs || untilTs) {
  events = events.filter((e) => {
    const t = Date.parse(e.ts ?? "");
    if (!Number.isFinite(t)) return false;
    if (sinceTs && t < sinceTs) return false;
    if (untilTs && t >= untilTs) return false;
    return true;
  });
}

if (!events.length) { console.error("No events in range."); process.exit(1); }

const report = buildReport(events);
const hs = gate0HealthScore(report);

// 渲染
const L = [];
L.push(`# Gate0 Telemetry Report (v1)`);
L.push(``);
L.push(`**Range:** ${report.firstTs} → ${report.lastTs}`);
L.push(`**Events:** ${report.total} (from ${uniq.length} file(s))`);
L.push(``);

L.push(`## Gate0 Health Score`);
L.push(`- **Score:** **${hs.score} / 100**`);
L.push(`- **Band:** **${hs.band}**`);
L.push(`- Components: fail=${hs.parts.S_fail.toFixed(1)}, fix=${hs.parts.S_fix.toFixed(1)}, coverage=${hs.parts.S_cov.toFixed(1)}, mttr=${hs.parts.S_mttr.toFixed(1)}, volatility=${hs.parts.S_vol.toFixed(1)}`);
L.push(`- Volatility: Δscore = ${hs.deltaScore} ${hs.deltaScore <= 10 ? "(stable)" : "(unstable ⚠️)"}`);
L.push(``);

L.push(`## Checks`);
L.push(`- Total: **${report.totalChecks}**`);
L.push(`- ✅ OK: **${report.okChecks}**`);
L.push(`- ❌ Failed: **${report.failedChecks}** (${fmtPct(report.failedChecks, report.totalChecks)})`);
L.push(`- Auto-fixable: **${report.autofixableFailures}** (${fmtPct(report.autofixableFailures, report.failedChecks)})`);
L.push(``);

L.push(`## Auto-fix`);
L.push(`- Attempts: **${report.selfhealAttempts}**`);
L.push(`- Success (OK within ${AUTO_FIX_WINDOW_MIN}m): **${report.selfhealSuccess}** (${fmtPct(report.selfhealSuccess, report.selfhealAttempts)})`);
L.push(``);

{
  const rows = [["Class", "Attempts", "Success", "Rate"]];
  for (const [cls] of sortDesc(new Map([...report.selfhealByClass].map(([k, v]) => [k, v.attempts])))) {
    const s = report.selfhealByClass.get(cls);
    rows.push([cls, String(s.attempts), String(s.success), fmtPct(s.success, s.attempts)]);
  }
  L.push(`### Auto-fix by class`);
  L.push(mdTable(rows));
  L.push(``);
}

L.push(`## MTTR`);
L.push(`- Samples: **${report.mttrSamples}**`);
L.push(`- Average: **${fmtMin(report.mttrAvg)}**`);
L.push(``);

// v0.4: CI Duration
function fmtDuration(ms) {
  if (!Number.isFinite(ms)) return "—";
  const secs = Math.round(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return mins > 0 ? `${mins}m${remSecs}s` : `${secs}s`;
}
L.push(`## CI Duration`);
L.push(`- Samples: **${report.ciDurationSamples}**`);
L.push(`- Average: **${fmtDuration(report.avgCiDurationMs)}**${report.avgCiDurationMs > 300000 ? " 🔴 > 5min" : report.avgCiDurationMs > 180000 ? " ⚠️ > 3min" : ""}`);
L.push(``);

{
  const rows = [["Class", "Count"]];
  for (const [cls, cnt] of sortDesc(report.failedClassCount).slice(0, 10))
    rows.push([cls, String(cnt)]);
  L.push(`## Top failure classes`);
  L.push(mdTable(rows));
  L.push(``);
}

process.stdout.write(L.join("\n"));
