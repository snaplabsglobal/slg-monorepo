#!/usr/bin/env node
/**
 * Gate0 Trend Comparator
 *
 * Usage:
 *   node scripts/gate0-trend.mjs <this-week.md> <prev-week.md>
 *
 * Extracts Health Score, Failure Rate, MTTR, Auto-fix Rate, Top Class
 * from both reports and inserts a "Trend vs last week" block into this-week.md.
 */
import fs from "node:fs";

const weeklyPath = process.argv[2];
const prevPath = process.argv[3];

if (!weeklyPath || !prevPath) {
  console.log("Usage: node gate0-trend.mjs <weekly.md> <prev.md>");
  process.exit(1);
}

function read(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function pick(re, s) {
  const m = s.match(re);
  return m ? m[1] : null;
}

// ── 从 Markdown 提取指标 ──

function parseScore(md) {
  const v = pick(/\*\*Score:\*\*\s+\*\*([0-9.]+)\s+\/\s+100\*\*/i, md);
  return v ? Number(v) : null;
}

function parseFailPct(md) {
  const v = pick(/Failed:\s+\*\*\d+\*\*\s+\(([\d.]+)%\)/i, md);
  return v ? Number(v) : null;
}

function parseMttr(md) {
  const v = pick(/Average:\s+\*\*([\d.]+)m\*\*/i, md);
  return v ? Number(v) : null;
}

function parseSelfhealPct(md) {
  const v = pick(/Success.*\(([\d.]+)%\)/i, md);
  return v ? Number(v) : null;
}

function parseTopClass(md) {
  const section = md.split("## Top failure classes")[1] || "";
  const row = section.split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("|") && !l.includes("Class") && !l.includes("---"));
  if (!row) return null;
  return row.split("|").map((x) => x.trim()).filter(Boolean)[0] || null;
}

// ── 趋势计算 ──

function delta(a, b) {
  if (a == null || b == null) return null;
  return Math.round((a - b) * 10) / 10;
}

function arrow(d, lowerIsBetter = false) {
  if (d == null) return "—";
  const abs = Math.abs(d).toFixed(1);
  if (d === 0) return `→${abs}`;
  const up = d > 0;
  // 对于"越低越好"的指标，上升是坏事
  return (up ? "↑" : "↓") + abs +
    (lowerIsBetter ? (up ? " ⚠️" : " ✅") : (up ? " ✅" : " ⚠️"));
}

// ── v0.4: Tech Debt Hotspot 检测 ──

/**
 * 检测技术债热点
 * @param {string[]} weeklyTopClasses - 最近 N 周的 Top 1 failure class（最新在前）
 *   例如: ["TS_NO_EXPORTED_MEMBER", "TS_NO_EXPORTED_MEMBER", "TS_NO_EXPORTED_MEMBER"]
 */
function detectTechDebtHotspot(weeklyTopClasses) {
  if (weeklyTopClasses.length < 2) return null;

  const current = weeklyTopClasses[0];
  if (!current) return null;

  // 计算连续周数（从最新周起）
  let streak = 0;
  for (const c of weeklyTopClasses) {
    if (c === current) streak++;
    else break;
  }

  if (streak >= 3) {
    return {
      level: "HOTSPOT",
      class: current,
      weeks: streak,
      message: `🔥 **Tech Debt Hotspot:** \`${current}\` has been Top 1 failure for **${streak} consecutive weeks**. Schedule structural fix.`,
    };
  }
  if (streak >= 2) {
    return {
      level: "EMERGING",
      class: current,
      weeks: streak,
      message: `⚠️ **Emerging Debt:** \`${current}\` has been Top 1 for **${streak} weeks**. Prepare fix plan.`,
    };
  }
  return null;
}

// ── 主流程 ──

const weekly = read(weeklyPath);
const prev = read(prevPath);

const sW = parseScore(weekly),  sP = parseScore(prev);
const fW = parseFailPct(weekly), fP = parseFailPct(prev);
const mW = parseMttr(weekly),    mP = parseMttr(prev);
const aW = parseSelfhealPct(weekly), aP = parseSelfhealPct(prev);
const tW = parseTopClass(weekly), tP = parseTopClass(prev);

// v0.4: Tech Debt Hotspot detection
// Note: For full 3+ week detection, we'd need more historical data
// Here we check this week and last week for a 2-week streak
const weeklyTopClasses = [tW, tP].filter(Boolean);
const hotspot = detectTechDebtHotspot(weeklyTopClasses);

const trendLines = [
  `## Trend vs last week`,
  ``,
  `| Metric | This week | Last week | Δ |`,
  `|--------|-----------|-----------|---|`,
  `| Health Score | **${sW ?? "—"}** | ${sP ?? "—"} | ${arrow(delta(sW, sP))} |`,
  `| Failure rate | ${fW != null ? fW + "%" : "—"} | ${fP != null ? fP + "%" : "—"} | ${arrow(delta(fW, fP), true)} |`,
  `| MTTR | ${mW != null ? mW + "m" : "—"} | ${mP != null ? mP + "m" : "—"} | ${arrow(delta(mW, mP), true)} |`,
  `| Auto-fix success | ${aW != null ? aW + "%" : "—"} | ${aP != null ? aP + "%" : "—"} | ${arrow(delta(aW, aP))} |`,
  `| Top failure class | **${tW ?? "—"}** | ${tP ?? "—"} | ${tW && tP && tW !== tP ? "⚠️ changed" : "same"} |`,
  ``,
];

// v0.4: Add Tech Debt Hotspot warning if detected
if (hotspot) {
  trendLines.push(`### 🔥 Technical Debt Alert`);
  trendLines.push(``);
  trendLines.push(hotspot.message);
  trendLines.push(``);
  trendLines.push(`> This indicates a systemic issue — likely a module boundary or TestHarness design problem.`);
  trendLines.push(`> Suggested action: schedule a structural fix sprint rather than patching imports.`);
  trendLines.push(``);
}

const trendBlock = trendLines.join("\n");

// 插入到标题下方
const merged = weekly.replace(
  /^(# Gate0 Telemetry Report \(v1\)\n)/m,
  `$1\n${trendBlock}\n`
);

fs.writeFileSync(weeklyPath, merged, "utf8");
console.log("Trend block inserted into:", weeklyPath);
