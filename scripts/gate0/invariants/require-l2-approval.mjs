#!/usr/bin/env node
/**
 * Level 2 Approval Requirement Check
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §六
 *
 * Enforces that Level 2 PRs include the [Governance L2 Approval] block.
 * Week 1: Only requires marker presence
 * Week 2+: Will require all four fields
 */
import fs from "node:fs";
import { getPullRequestBody, checkL2ApprovalBlock } from "./utils/check-pr-body.mjs";

const REQUIRED_MARKER = "[Governance L2 Approval]";

// Week 1 放宽策略: 只检查marker存在，不检查字段完整
const STRICT_MODE = process.env.SNAPOPS_L2_STRICT === "true";

function main() {
  // Read GDR level
  if (!fs.existsSync("out/gdr.auto.json")) {
    console.log("No GDR output found, skipping L2 check.");
    process.exit(0);
  }

  const gdr = JSON.parse(fs.readFileSync("out/gdr.auto.json", "utf8"));
  const { level } = gdr;

  if (level !== 2) {
    console.log(`Governance: level=${level}, L2 approval not required.`);
    process.exit(0);
  }

  // Level 2: Check PR body for marker
  const pr = getPullRequestBody();
  if (!pr) {
    console.log("Not a PR event, skipping L2 body check.");
    process.exit(0);
  }

  const fullText = `${pr.title}\n\n${pr.body}`;

  // Simple marker check (Week 1 strategy)
  if (fullText.includes(REQUIRED_MARKER)) {
    if (STRICT_MODE) {
      // Week 2+: Validate all fields
      const result = checkL2ApprovalBlock(pr.body);
      if (!result.valid) {
        console.error(`❌ Governance L2 incomplete. Missing fields: ${result.missingFields.join(", ")}`);
        process.exit(1);
      }
    }
    console.log("✅ Governance: L2 approval rationale found.");
    process.exit(0);
  }

  console.error(`❌ Governance L2 requirement failed: PR must contain "${REQUIRED_MARKER}" block.`);
  console.error(`
To fix, add this block to your PR description:

[Governance L2 Approval]
Change Type: <schema/state/migration/api>
Risk Assessment: <low/medium/high>
Justification: <why this structural change is necessary>
Rollback Strategy: <how to revert if issues arise>
`);
  process.exit(1);
}

main();
