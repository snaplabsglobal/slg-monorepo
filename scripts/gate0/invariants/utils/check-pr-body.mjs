/**
 * PR Body Utilities
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §6.1
 */
import fs from "node:fs";

export function getPullRequestBody() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p || !fs.existsSync(p)) return null;

  try {
    const evt = JSON.parse(fs.readFileSync(p, "utf8"));
    const pr = evt.pull_request;
    if (!pr) return null;
    return {
      title: pr.title || "",
      body: pr.body || "",
      number: pr.number,
      author: pr.user?.login || "unknown",
    };
  } catch {
    return null;
  }
}

export function checkL2ApprovalBlock(body) {
  const REQUIRED_MARKER = "[Governance L2 Approval]";
  const REQUIRED_FIELDS = [
    "Change Type:",
    "Risk Assessment:",
    "Justification:",
    "Rollback Strategy:",
  ];

  const hasMarker = body.includes(REQUIRED_MARKER);
  if (!hasMarker) {
    return { valid: false, hasMarker: false, missingFields: REQUIRED_FIELDS };
  }

  // Extract the L2 block content
  const blockStart = body.indexOf(REQUIRED_MARKER);
  const blockContent = body.substring(blockStart);

  // Check for required fields
  const missingFields = REQUIRED_FIELDS.filter(field => !blockContent.includes(field));

  return {
    valid: missingFields.length === 0,
    hasMarker: true,
    missingFields,
  };
}
