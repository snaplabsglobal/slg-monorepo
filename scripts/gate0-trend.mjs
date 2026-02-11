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

// ── 主流程 ──

const weekly = read(weeklyPath);
const prev = read(prevPath);

const sW = parseScore(weekly),  sP = parseScore(prev);
const fW = parseFailPct(weekly), fP = parseFailPct(prev);
const mW = parseMttr(weekly),    mP = parseMttr(prev);
const aW = parseSelfhealPct(weekly), aP = parseSelfhealPct(prev);
const tW = parseTopClass(weekly), tP = parseTopClass(prev);

const trendBlock = [
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
].join("\n");

// 插入到标题下方
const merged = weekly.replace(
  /^(# Gate0 Telemetry Report \(v1\)\n)/m,
  `$1\n${trendBlock}\n`
);

fs.writeFileSync(weeklyPath, merged, "utf8");
console.log("Trend block inserted into:", weeklyPath);
