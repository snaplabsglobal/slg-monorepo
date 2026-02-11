#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Gate0 CHECK =="
echo "pwd: $ROOT"
echo "node: $(node -v)"
echo "pnpm: $(pnpm -v)"

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
