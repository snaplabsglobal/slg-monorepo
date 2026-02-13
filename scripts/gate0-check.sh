#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── 日志 & Telemetry 目录 ──
LOG_DIR=".gate0-logs"
TEL_DIR=".gate0-telemetry"
mkdir -p "$LOG_DIR" "$TEL_DIR"

LOG="$LOG_DIR/gate0-check-$(date +%s).log"
TEL="$TEL_DIR/events.jsonl"

# ── 环境信息 ──
RUN_ID="${GITHUB_RUN_ID:-local}-$(date +%s)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
WHERE="${GITHUB_ACTIONS:+ci}"
WHERE="${WHERE:-local}"
ACTOR="${GITHUB_ACTOR:-local}"

# v0.4: CI duration tracking
START_MS=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))

# ── 版本要求（从 .nvmrc 和 package.json#packageManager 读取）────────
# Single source of truth per Environment Lock Protocol v1.1

if [ ! -f ".nvmrc" ]; then
  echo "❌ .nvmrc not found! Create it with Node version (e.g., 20.19.0)"
  exit 1
fi

REQUIRED_NODE=$(cat .nvmrc | tr -d '[:space:]')
REQUIRED_NODE_MAJOR=$(echo "$REQUIRED_NODE" | sed 's/\([0-9]*\).*/\1/')

# Extract pnpm version from packageManager field: "pnpm@8.15.0" → "8.15.0"
REQUIRED_PNPM=$(grep -o '"packageManager"[[:space:]]*:[[:space:]]*"pnpm@[^"]*"' package.json | sed 's/.*pnpm@//' | tr -d '"')

if [ -z "$REQUIRED_PNPM" ]; then
  echo "❌ package.json#packageManager not found or invalid!"
  echo "   Expected format: \"packageManager\": \"pnpm@x.y.z\""
  exit 1
fi

# ── 错误分类器 ──
classify() {
  local log="$1"
  if grep -q "ERR_PNPM_OUTDATED_LOCKFILE" "$log" || grep -qi "Lockfile out of sync" "$log"; then
    echo "LOCKFILE_OUT_OF_SYNC"; return
  fi
  if grep -qi "has no exported member" "$log"; then
    echo "TS_NO_EXPORTED_MEMBER"; return
  fi
  if grep -q "Can't resolve '@slo/" "$log"; then
    echo "MODULE_NOT_FOUND_WORKSPACE"; return
  fi
  if grep -qi "toMatchSnapshot\|Snapshot mismatch" "$log"; then
    echo "VISUAL_REGRESSION"; return
  fi
  if grep -qi "Test timeout\|Timeout.*exceeded" "$log"; then
    echo "PLAYWRIGHT_TIMEOUT"; return
  fi
  if grep -qi "expect\\(" "$log"; then
    echo "PLAYWRIGHT_ASSERTION"; return
  fi
  if grep -qi "Failed to compile" "$log"; then
    echo "NEXT_BUILD_ERROR_OTHER"; return
  fi
  echo "UNKNOWN"
}

# ── Telemetry 写入 (v0.4: 含 ci_duration_ms) ──
emit_tel() {
  local stage="$1" class="$2" ok="$3"
  local END_MS=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
  local DURATION_MS=$((END_MS - START_MS))
  echo "{\"ts\":\"$(date -u +%FT%TZ)\",\"run_id\":\"$RUN_ID\",\"where\":\"$WHERE\",\"actor\":\"$ACTOR\",\"branch\":\"$BRANCH\",\"sha\":\"$SHA\",\"stage\":\"$stage\",\"class\":\"$class\",\"ok\":$ok,\"ci_duration_ms\":$DURATION_MS,\"node\":\"$(node -v)\",\"pnpm\":\"$(pnpm -v)\",\"log\":\"$LOG\"}" >> "$TEL"
}

# ── 主流程 ──
echo "== Gate0 CHECK (v0.4 with Classification + Telemetry + Duration) ==" | tee "$LOG"
echo "pwd: $ROOT" | tee -a "$LOG"
echo "" | tee -a "$LOG"
echo "📍 Version sources (single source of truth):" | tee -a "$LOG"
echo "   .nvmrc:          $REQUIRED_NODE" | tee -a "$LOG"
echo "   packageManager:  pnpm@$REQUIRED_PNPM" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ── 版本检查 ─────────────────────────────────────────────
NODE_VERSION=$(node -v)
PNPM_VERSION=$(pnpm -v)
echo "🔍 Local versions:" | tee -a "$LOG"
echo "   node: $NODE_VERSION (required: v$REQUIRED_NODE)" | tee -a "$LOG"
echo "   pnpm: $PNPM_VERSION (required: $REQUIRED_PNPM)" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 检查 Node 版本（精确匹配或主版本匹配）
NODE_LOCAL_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_LOCAL_MAJOR" != "$REQUIRED_NODE_MAJOR" ]; then
  echo "⚠️  Node version mismatch!" | tee -a "$LOG"
  echo "   Local:    $NODE_VERSION" | tee -a "$LOG"
  echo "   Required: v$REQUIRED_NODE (from .nvmrc)" | tee -a "$LOG"
  echo "" | tee -a "$LOG"
  if [ "${GATE0_SKIP_VERSION_CHECK:-}" = "1" ]; then
    echo "   GATE0_SKIP_VERSION_CHECK=1, continuing anyway..." | tee -a "$LOG"
  else
    echo "Fix: nvm use (reads .nvmrc automatically)" | tee -a "$LOG"
    echo " or: nvm install $REQUIRED_NODE && nvm use $REQUIRED_NODE" | tee -a "$LOG"
    echo " or: GATE0_SKIP_VERSION_CHECK=1 pnpm gate0:check (bypass)" | tee -a "$LOG"
    exit 1
  fi
fi

# 检查 pnpm 版本（精确匹配）
if [ "$PNPM_VERSION" != "$REQUIRED_PNPM" ]; then
  echo "⚠️  pnpm version mismatch!" | tee -a "$LOG"
  echo "   Local:    $PNPM_VERSION" | tee -a "$LOG"
  echo "   Required: $REQUIRED_PNPM (from package.json#packageManager)" | tee -a "$LOG"
  echo "" | tee -a "$LOG"
  if [ "${GATE0_SKIP_VERSION_CHECK:-}" = "1" ]; then
    echo "   GATE0_SKIP_VERSION_CHECK=1, continuing anyway..." | tee -a "$LOG"
  else
    echo "Fix: corepack enable && corepack prepare pnpm@${REQUIRED_PNPM} --activate" | tee -a "$LOG"
    echo " or: npm i -g pnpm@${REQUIRED_PNPM}" | tee -a "$LOG"
    echo " or: GATE0_SKIP_VERSION_CHECK=1 pnpm gate0:check (bypass)" | tee -a "$LOG"
    exit 1
  fi
fi

echo "✅ Versions OK" | tee -a "$LOG"
echo "" | tee -a "$LOG"

(
  echo "== Install (frozen) =="
  pnpm -w install --frozen-lockfile
  echo "== Build jss-web (with deps via turbo) =="
  pnpm turbo run build --filter=jss-web
) 2>&1 | tee -a "$LOG" || {
  CLASS=$(classify "$LOG")
  echo "❌ Gate0 CHECK failed. Log: $LOG" | tee -a "$LOG"
  echo "[GATE0_CLASS] $CLASS" | tee -a "$LOG"
  emit_tel "check" "$CLASS" "false"
  exit 1
}

echo "✅ Gate0 CHECK passed. Log: $LOG" | tee -a "$LOG"
echo "[GATE0_CLASS] OK" | tee -a "$LOG"
emit_tel "check" "OK" "true"
