#!/bin/bash
# 部署哨兵 Layer 3: 自动修复 lockfile 不同步导致的部署失败

set -e
echo "🔧 Auto-fixing..."

# 1. 同步 lockfile
pnpm install --lockfile-only

if git diff --name-only | grep -q "pnpm-lock.yaml"; then
  echo "✅ Fixed lockfile"
  git add pnpm-lock.yaml
  git commit -m "fix: sync lockfile"
  git push origin dev
  echo "🚀 Re-deployed"
  exit 0
fi

echo "⚠️ Can't auto-fix (lockfile unchanged). Manual intervention needed."
exit 1
