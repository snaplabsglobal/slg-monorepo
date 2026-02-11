#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ── 工具函数 ──────────────────────────────────────────────

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

// ── 白名单安全阀 ─────────────────────────────────────────

function isWhitelisted(file) {
  return (
    file === "pnpm-lock.yaml" ||
    file === "package.json" ||
    file.startsWith("apps/jss-web/app/components/") ||
    /apps\/jss-web\/app\/.*\/TestHarness.*\.tsx$/.test(file) ||
    file.startsWith("scripts/")
  );
}

function stageAndCommit(files, message) {
  for (const f of files) {
    if (!isWhitelisted(f)) {
      throw new Error(`BLOCKED: Non-whitelisted file: ${f}`);
    }
    shInherit(`git add ${f}`);
  }
  shInherit(`git commit -m "${message}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"`);
}

// ── Gate 0 执行 + 日志捕获 ────────────────────────────────

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

// ── 错误解析器 ────────────────────────────────────────────

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

// ── 修复执行器 ────────────────────────────────────────────

function resolveAppAliasToFile(moduleSpec) {
  if (!moduleSpec.startsWith("@/")) return null;
  const rel = moduleSpec.replace(/^@\//, "apps/jss-web/app/");
  const candidates = [
    `${rel}.ts`, `${rel}.tsx`,
    `${rel}/index.ts`, `${rel}/index.tsx`,
  ].map(c => path.join(ROOT, c));
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
    .replace(/\\/g, "/")
    .replace(/\.(ts|tsx)$/, "")
    .replace(/\/index$/, "");

  const src = readFile(importerFile);
  const escaped = oldModuleSpec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `import\\s*\\{([^}]*\\b${member}\\b[^}]*)\\}\\s*from\\s*['"]${escaped}['"];?`,
    "m"
  );
  const m = src.match(re);
  if (!m) return false;

  const replaced = src.replace(re, (_, inside) =>
    `import { ${inside.trim()} } from '${newModuleSpec}'`
  );
  if (replaced === src) return false;

  writeFile(importerFile, replaced);
  return true;
}

// ── 主流程 ────────────────────────────────────────────────

async function main() {
  if (!fileExists(path.join(ROOT, "pnpm-workspace.yaml"))) {
    throw new Error("Not at repo root (pnpm-workspace.yaml missing).");
  }

  console.log("== Gate0 SELFHEAL ==");

  // 1) 跑一次 check
  const r1 = runCheckCapture();
  console.log("Log:", r1.logPath);

  if (r1.ok) {
    console.log("✅ Gate0 already green. Nothing to do.");
    return;
  }

  const log = r1.log;

  // Case A: Lockfile mismatch
  if (parseOutdatedLockfile(log)) {
    console.log("⚡ Detected: ERR_PNPM_OUTDATED_LOCKFILE");
    shInherit("pnpm -w install");
    stageAndCommit(["pnpm-lock.yaml"], "chore: sync lockfile");
    console.log("Committed lockfile. Re-running Gate0...");
    const r2 = runCheckCapture();
    process.exit(r2.ok ? 0 : 1);
  }

  // Case B: Workspace pkg not found (advice only)
  const missing = parseCannotResolve(log);
  if (missing) {
    console.log(`⚠️  Detected: Can't resolve '${missing.pkg}'`);
    console.log("Suggested fixes (CTO manual):");
    console.log("  1) Ensure CI: pnpm -w install (root) then turbo build");
    console.log("  2) Add next.config.js transpilePackages");
    process.exit(1);
  }

  // Case C: No exported member
  const ne = parseNoExportedMember(log);
  if (ne) {
    console.log(`⚡ Detected: no exported member '${ne.member}' from ${ne.moduleSpec}`);

    const importerMatch = log.match(/\.\/(apps\/jss-web\/app\/[^\s:]+):\d+/) ||
                          log.match(/\.\/(app\/[^\s:]+):\d+/);
    let importerAbs = null;
    if (importerMatch) {
      const rel = importerMatch[1].startsWith("apps/")
        ? importerMatch[1]
        : path.join("apps/jss-web", importerMatch[1]);
      importerAbs = path.join(ROOT, rel);
    }

    if (!importerAbs || !fileExists(importerAbs)) {
      console.log("Could not locate importer file. Stopping.");
      process.exit(1);
    }

    const newLoc = findExportLocation(ne.member);
    if (!newLoc) {
      console.log(`Could not find export for '${ne.member}'. CTO manual fix needed.`);
      process.exit(1);
    }

    console.log("Importer:", path.relative(ROOT, importerAbs));
    console.log("Export found in:", path.relative(ROOT, newLoc));

    const patched = patchImportToNewModule(importerAbs, ne.member, ne.moduleSpec, newLoc);
    if (!patched) {
      console.log("Auto-patch failed (pattern mismatch). Stopping.");
      process.exit(1);
    }

    stageAndCommit(
      [path.relative(ROOT, importerAbs)],
      `fix: update import for ${ne.member}`
    );
    console.log("Patched import. Re-running Gate0...");
    const r2 = runCheckCapture();
    process.exit(r2.ok ? 0 : 1);
  }

  console.log("❌ No whitelisted fix matched. See log:", r1.logPath);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
