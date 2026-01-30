# 部署哨兵系统 - 彻底解决静默失败

**CEO 的痛点**: Vercel 部署失败，Cursor 不通知，傻傻刷新手机

**COO 的诊断**: 静默失败，工作流需要改进

---

## 🚨 当前问题

```
错误: ERR_PNPM_OUTDATED_LOCKFILE

原因:
1. package.json 添加了 husky
2. 没运行 pnpm install
3. lockfile 没同步
4. Vercel 拒绝构建

Cursor 的错:
❌ 没自动运行 pnpm install
❌ 没监控部署状态
❌ 没通知失败
❌ CEO 傻等

这是静默失败！
```

---

## ✅ 三层防护方案

### Layer 1: 预防（自动同步）
### Layer 2: 监控（实时追踪）
### Layer 3: 修复（自动处理）

---

## 🛡️ Layer 1: 本地自动同步

### Husky Pre-commit Hook

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Pre-commit checks..."

# 检查 package.json 是否修改
if git diff --cached --name-only | grep -q "package.json"; then
  echo "📦 Syncing lockfile..."
  pnpm install --lockfile-only
  git add pnpm-lock.yaml 2>/dev/null || true
fi

# TypeScript 检查
pnpm tsc --noEmit || exit 1

echo "✅ Checks passed!"
```

### 安装步骤

```bash
# 1. 安装 Husky
pnpm add -D husky

# 2. 初始化
npx husky install

# 3. 创建 hook
npx husky add .husky/pre-commit "
if git diff --cached --name-only | grep -q 'package.json'; then
  pnpm install --lockfile-only
  git add pnpm-lock.yaml 2>/dev/null || true
fi
pnpm tsc --noEmit || exit 1
"

# 4. 添加权限
chmod +x .husky/pre-commit
```

---

## 📡 Layer 2: 部署监控

### 监控脚本

```bash
# scripts/deploy-monitor.sh

#!/bin/bash

echo "🚀 Monitoring deployment..."

# 等待 Vercel 开始构建
sleep 10

# 获取最新部署
DEPLOYMENT=$(vercel ls | grep "dev" | head -1)

if [ -z "$DEPLOYMENT" ]; then
  echo "❌ No deployment found"
  exit 1
fi

echo "📊 Checking status..."

# 循环检查（最多 5 分钟）
for i in {1..60}; do
  STATUS=$(vercel inspect $DEPLOYMENT | grep "State:")
  
  if echo "$STATUS" | grep -q "READY"; then
    echo "✅ Deployment successful!"
    exit 0
  elif echo "$STATUS" | grep -q "ERROR"; then
    echo "❌ Deployment failed!"
    vercel logs $DEPLOYMENT
    exit 1
  fi
  
  echo "⏳ Building... (${i}0s)"
  sleep 10
done

echo "⏰ Timeout (5 min)"
exit 1
```

### 集成到 package.json

```json
{
  "scripts": {
    "deploy:watch": "git push origin dev && ./scripts/deploy-monitor.sh"
  }
}
```

---

## 🔧 Layer 3: 自动修复

### 修复脚本

```bash
# scripts/auto-fix.sh

#!/bin/bash

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

echo "⚠️ Can't auto-fix, manual intervention needed"
exit 1
```

---

## 🚀 完整工作流

```
开发:
1. 修改代码
2. Cursor 保存
3. package.json 变化 → 自动 pnpm install

提交:
1. git commit
2. Husky pre-commit → 检查 lockfile
3. ✅ 通过才能提交

推送:
1. git push origin dev
2. Vercel 开始构建

监控:
1. 脚本每 10 秒检查一次
2. ✅ 成功 → 通知
3. ❌ 失败 → 通知 + 尝试修复

结果:
CEO 不用等！
```

---

## 📋 立即执行（修复当前问题）

```bash
# 1. 同步 lockfile
cd /path/to/slg-monorepo
pnpm install

# 2. 提交
git add pnpm-lock.yaml
git commit -m "fix: sync lockfile"
git push origin dev

# 3. 等待部署
# 应该成功了
```

---

## 🛠️ 给 Cursor 的指令

```markdown
URGENT: Implement Deployment Sentinel

Step 1: Fix Current Issue
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: sync lockfile"
git push origin dev
```

Step 2: Install Husky
```bash
pnpm add -D husky
npx husky install
```

Step 3: Create Pre-commit
.husky/pre-commit:
- Check package.json changes
- Auto run pnpm install
- Type check

Step 4: Create Monitor
scripts/deploy-monitor.sh:
- Check Vercel status
- Notify on success/failure

Step 5: Communication
When deployment fails:
1. Immediately notify in chat
2. Show error logs
3. Attempt auto-fix
4. If can't fix: notify CEO

NO MORE SILENT FAILURES!
```

---

## 📊 效果对比

### 之前 ❌

```
Cursor 改代码 → 忘记 pnpm install
→ 推送 → Vercel 失败
→ CEO 傻等 30 分钟
→ 手机刷新无数次
→ 发现失败
→ 手动修复
```

### 之后 ✅

```
Cursor 改代码 → 自动 pnpm install
→ 提交前自动检查
→ 推送后自动监控
→ 失败立即通知
→ 自动修复
→ CEO 不用等
```

---

**实施清单**:

□ 立即修复当前部署
□ 安装 Husky
□ 创建 pre-commit hook
□ 创建监控脚本
□ 添加自动修复
□ 测试完整流程

**时间**: 1-2 小时

**效果**: CEO 再也不用傻等！

🚀 立即实施！
