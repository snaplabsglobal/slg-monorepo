#!/usr/bin/env node
/**
 * GDR Level Classification
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §五
 *
 * Single source of truth: Level判定以invariant_check输出 + git diff路径为准
 *
 * Levels:
 *   0: No structural domain touched
 *   1: Append-only (event domain)
 *   2: Structural change (state/migration/api_surface)
 *   3: Constitutional (constitutional files or Tier-0 violations)
 */
import fs from "node:fs";
import { getChangedFiles } from "./utils/git-diff.mjs";
import { CONSTITUTIONAL_FILES, DOMAIN_PATH_RULES } from "./config/domains.mjs";

function matchDomainByPath(file, domain) {
  const rules = DOMAIN_PATH_RULES[domain] || [];
  return rules.some(rule => {
    if (rule.includes("**")) {
      const base = rule.split("**")[0];
      return file.startsWith(base);
    }
    return file.startsWith(rule) || file === rule;
  });
}

function touchesConstitution(files) {
  return files.some(f => CONSTITUTIONAL_FILES.has(f));
}

function computeDomainTouches(files) {
  const touched = { event: false, state: false, migration: false, api_surface: false };
  for (const f of files) {
    for (const d of Object.keys(touched)) {
      if (matchDomainByPath(f, d)) touched[d] = true;
    }
  }
  return touched;
}

function classifyLevel({ files, invariantReport }) {
  // Level 3: Constitutional
  if (touchesConstitution(files)) {
    return { level: 3, reasons: ["touches_constitutional_files"] };
  }
  if (invariantReport?.violations?.some(v => v.tier === 0)) {
    return { level: 3, reasons: ["tier0_violation"] };
  }

  const touched = computeDomainTouches(files);

  // Level 2: Structural change
  const reasons = [];
  if (touched.api_surface) reasons.push("api_surface_touched");
  if (touched.state) reasons.push("state_domain_touched");
  if (touched.migration) reasons.push("migration_domain_touched");

  if (touched.state || touched.migration || touched.api_surface) {
    return { level: 2, reasons };
  }

  // Level 1: Append-only (event domain)
  if (touched.event) {
    return { level: 1, reasons: ["event_domain_touched"] };
  }

  // Level 0: No governance impact
  return { level: 0, reasons: ["no_structural_domain_touched"] };
}

function renderGdrMd({ level, reasons, files }) {
  const levelNames = ["Normal", "Append-only", "Structural", "Constitutional"];
  const lines = [];
  lines.push("## 📋 Governance Diff Report (Auto)\n");
  lines.push(`**Level:** ${level} (${levelNames[level]})\n`);
  lines.push("**Reasons:**");
  for (const r of reasons) lines.push(`- ${r}`);
  lines.push("\n**Changed files:**");
  for (const f of files.slice(0, 20)) lines.push(`- \`${f}\``);
  if (files.length > 20) lines.push(`- ... and ${files.length - 20} more`);
  lines.push("\n**Required Actions:**");
  if (level === 0) lines.push("- None");
  if (level === 1) lines.push("- Auto GDR generated (no action required)");
  if (level === 2) lines.push("- ⚠️ CTO must provide `[Governance L2 Approval]` rationale in PR");
  if (level === 3) lines.push("- 🚨 BLOCKED (constitutional) — CEO+CTO process required");
  return lines.join("\n");
}

async function main() {
  const baseRef = process.env.SNAPOPS_BASE_REF || "origin/main";
  const headRef = process.env.SNAPOPS_HEAD_REF || "HEAD";

  const files = getChangedFiles({ baseRef, headRef });

  // Read invariant_check output if already run
  let invariantReport = null;
  if (fs.existsSync("out/invariant-report.json")) {
    try {
      invariantReport = JSON.parse(fs.readFileSync("out/invariant-report.json", "utf8"));
    } catch { /* ignore */ }
  }

  const { level, reasons } = classifyLevel({ files, invariantReport });
  fs.mkdirSync("out", { recursive: true });

  // Machine-readable
  fs.writeFileSync("out/gdr.auto.json", JSON.stringify({ level, reasons, files }, null, 2), "utf8");
  // PR comment
  fs.writeFileSync("out/gdr.auto.md", renderGdrMd({ level, reasons, files }), "utf8");

  console.log(`Governance Level: ${level} (${reasons.join(", ")})`);

  // Exit code: 0 for levels 0-2, non-zero for level 3
  process.exit(level === 3 ? 3 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
