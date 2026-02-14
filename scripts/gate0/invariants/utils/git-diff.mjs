/**
 * Git Diff Utilities
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §3.1
 */
import { execSync } from "node:child_process";

export function getChangedFiles({ baseRef = "origin/main", headRef = "HEAD" } = {}) {
  try {
    const cmd = `git diff --name-only ${baseRef}...${headRef}`;
    const out = execSync(cmd, { encoding: "utf8" }).trim();
    if (!out) return [];
    return out.split("\n").map(s => s.trim()).filter(Boolean);
  } catch (err) {
    // Fallback: diff against HEAD~1 if base ref not found
    try {
      const cmd = `git diff --name-only HEAD~1`;
      const out = execSync(cmd, { encoding: "utf8" }).trim();
      if (!out) return [];
      return out.split("\n").map(s => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

export function getDiffText({ baseRef = "origin/main", headRef = "HEAD", filePath } = {}) {
  try {
    const cmd = filePath
      ? `git diff ${baseRef}...${headRef} -- ${filePath}`
      : `git diff ${baseRef}...${headRef}`;
    return execSync(cmd, { encoding: "utf8" });
  } catch {
    return "";
  }
}

export function getCurrentCommitHash() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
