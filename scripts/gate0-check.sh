#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── 版本要求（与 CI 保持一致）──────────────────────────────
REQUIRED_NODE_MAJOR="20"
REQUIRED_PNPM="8.15.0"

echo "== Gate0 CHECK =="
echo "pwd: $ROOT"

# ── 版本检查 ─────────────────────────────────────────────
NODE_VERSION=$(node -v)
PNPM_VERSION=$(pnpm -v)
echo "node: $NODE_VERSION (required: v${REQUIRED_NODE_MAJOR}.x)"
echo "pnpm: $PNPM_VERSION (required: $REQUIRED_PNPM)"

# 检查 Node 主版本
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" != "$REQUIRED_NODE_MAJOR" ]; then
  echo ""
  echo "⚠️  Node version mismatch!"
  echo "   Local:    $NODE_VERSION"
  echo "   Required: v${REQUIRED_NODE_MAJOR}.x (CI uses 20.19.0)"
  echo ""
  if [ "${GATE0_SKIP_VERSION_CHECK:-}" = "1" ]; then
    echo "   GATE0_SKIP_VERSION_CHECK=1, continuing anyway..."
  else
    echo "Fix: nvm use $REQUIRED_NODE_MAJOR"
    echo " or: GATE0_SKIP_VERSION_CHECK=1 pnpm gate0:check (bypass)"
    exit 1
  fi
fi

# 检查 pnpm 版本（精确匹配）
if [ "$PNPM_VERSION" != "$REQUIRED_PNPM" ]; then
  echo ""
  echo "⚠️  pnpm version mismatch!"
  echo "   Local:    $PNPM_VERSION"
  echo "   Required: $REQUIRED_PNPM (CI pinned)"
  echo ""
  if [ "${GATE0_SKIP_VERSION_CHECK:-}" = "1" ]; then
    echo "   GATE0_SKIP_VERSION_CHECK=1, continuing anyway..."
  else
    echo "Fix: corepack prepare pnpm@${REQUIRED_PNPM} --activate"
    echo " or: npm i -g pnpm@${REQUIRED_PNPM}"
    echo " or: GATE0_SKIP_VERSION_CHECK=1 pnpm gate0:check (bypass)"
    exit 1
  fi
fi

echo "✅ Versions OK"
echo ""

echo "== Install (frozen) =="
pnpm -w install --frozen-lockfile

echo "== Build jss-web (with deps via turbo) =="
pnpm turbo run build --filter=jss-web

echo "== (Optional) Gate0 Playwright =="
# 打开以下注释当 Playwright 测试就绪后：
# pnpm --filter jss-web test:gate0a
# pnpm --filter jss-web test:gate0b
# pnpm --filter jss-web test:gate0c

echo "✅ Gate0 CHECK passed."
