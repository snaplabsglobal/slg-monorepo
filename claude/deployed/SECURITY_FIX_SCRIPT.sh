#!/bin/bash
# Security Fix Script - Remove sensitive files from Git
# Run this script to remove API keys from Git repository

set -e

echo "🔒 Security Fix Script"
echo "======================"
echo ""
echo "⚠️  WARNING: This script will remove sensitive files from Git"
echo "   Make sure you have backups of your API keys!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📋 Step 1: Removing sensitive files from Git index..."
git rm --cached apps/ls-web/.env.production 2>/dev/null || echo "  ⚠️  .env.production not in index"
git rm --cached apps/ls-web/.env.development 2>/dev/null || echo "  ⚠️  .env.development not in index"

echo ""
echo "📋 Step 2: Checking Git status..."
git status --short

echo ""
echo "✅ Files removed from Git index"
echo ""
echo "📝 Next steps:"
echo "   1. Review the changes: git status"
echo "   2. Commit the removal: git commit -m 'security: remove sensitive API keys from repository'"
echo "   3. Push to remote: git push"
echo ""
echo "⚠️  IMPORTANT: If your repository is PUBLIC, the API keys are still in Git history!"
echo "   You need to:"
echo "   1. Revoke the leaked API keys immediately"
echo "   2. Create new API keys"
echo "   3. Consider using git-filter-repo to clean history (advanced)"
echo ""
