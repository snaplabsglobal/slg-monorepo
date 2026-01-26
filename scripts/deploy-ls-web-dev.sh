#!/bin/bash

# 部署 ls-web 到 Vercel Dev 环境
# 使用方法: ./scripts/deploy-ls-web-dev.sh

set -e

echo "🚀 开始部署 ls-web 到 Dev Cloud..."

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm install -g vercel
fi

# 进入 ls-web 目录
cd apps/ls-web

echo "📝 检查环境变量..."
if [ ! -f ".env.development" ]; then
    echo "⚠️  警告: .env.development 文件不存在"
fi

echo "🔨 构建项目..."
cd ../..
pnpm install
pnpm --filter ls-web build

echo "🚀 部署到 Vercel Dev 环境..."
cd apps/ls-web
vercel --prod=false --yes

echo "✅ 部署完成！"
echo "📋 检查 Vercel Dashboard 获取部署 URL: https://vercel.com/dashboard"
