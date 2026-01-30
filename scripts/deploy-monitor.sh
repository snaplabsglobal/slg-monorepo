#!/bin/bash
# 部署哨兵 Layer 2: 推送后监控 Vercel 部署状态（需已安装 vercel CLI: pnpm add -g vercel）

set -e
echo "🚀 Monitoring deployment..."

# 等待 Vercel 开始构建
sleep 10

# 获取最新部署（dev 分支或第一条）
if ! command -v vercel &>/dev/null; then
  echo "⚠️ vercel CLI not found. Install: pnpm add -g vercel"
  echo "   Skipping monitor; check Vercel Dashboard manually."
  exit 0
fi

DEPLOYMENT=$(vercel ls 2>/dev/null | grep -E "dev|Preview" | head -1 | awk '{print $1}' || true)
if [ -z "$DEPLOYMENT" ]; then
  DEPLOYMENT=$(vercel ls 2>/dev/null | head -2 | tail -1 | awk '{print $1}' || true)
fi

if [ -z "$DEPLOYMENT" ]; then
  echo "⚠️ No deployment found (run 'vercel ls' to check). Check Vercel Dashboard."
  exit 0
fi

echo "📊 Checking status for: $DEPLOYMENT"

for i in $(seq 1 30); do
  STATUS=$(vercel inspect "$DEPLOYMENT" 2>/dev/null | grep -i "state\|status" || echo "")
  if echo "$STATUS" | grep -qi "ready\|completed"; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  if echo "$STATUS" | grep -qi "error\|failed"; then
    echo "❌ Deployment failed!"
    vercel logs "$DEPLOYMENT" 2>/dev/null || true
    exit 1
  fi
  echo "⏳ Building... (${i}0s)"
  sleep 10
done

echo "⏰ Timeout (5 min). Check Vercel Dashboard."
exit 1
