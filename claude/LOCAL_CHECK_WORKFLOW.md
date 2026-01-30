# 本地检查流程 + 代码清理方案

**CEO 的建议**: 避免每次靠 Vercel 报错才知道问题

---

## 🎯 三大改进方向

### 1. 本地检查流程
### 2. VS Code / Cursor 配置
### 3. 代码逻辑简化

---

## ✅ 方案 1: 本地 Build 检查

### Git Pre-commit Hook（推荐）⭐

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# 1. TypeScript 类型检查
echo "📝 Checking TypeScript..."
pnpm tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Please fix before committing."
  exit 1
fi

# 2. 构建检查
echo "🏗️ Testing build..."
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix before committing."
  exit 1
fi

# 3. Lint 检查
echo "🧹 Running linter..."
pnpm lint
if [ $? -ne 0 ]; then
  echo "⚠️ Linting issues found. Please review."
  # 不阻止提交，只警告
fi

echo "✅ All checks passed!"
```

### 安装 Husky

```bash
# 1. 安装 Husky
pnpm add -D husky

# 2. 初始化
npx husky install

# 3. 创建 pre-commit hook
npx husky add .husky/pre-commit "pnpm tsc --noEmit && pnpm build"

# 4. 添加到 package.json
{
  "scripts": {
    "prepare": "husky install",
    "check": "tsc --noEmit && pnpm build"
  }
}
```

---

### 手动检查流程（如果不用 Husky）

```bash
# 在 push 之前手动运行
pnpm check-before-push

# package.json 添加脚本:
{
  "scripts": {
    "check-before-push": "pnpm tsc --noEmit && pnpm build && pnpm lint",
    "quick-check": "pnpm tsc --noEmit"
  }
}

# 使用
cd apps/ls-web
pnpm check-before-push
```

---

## 🔧 方案 2: VS Code / Cursor 配置

### TypeScript 配置

```json
// .vscode/settings.json

{
  // TypeScript 错误高亮
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  
  // 保存时自动检查
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  
  // 显示所有错误
  "typescript.showDeprecations": true,
  "typescript.showReferences": true,
  "typescript.showSuggestions": true,
  
  // 问题面板
  "problems.showCurrentInStatus": true,
  
  // 红色波浪线
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": true
  }
}
```

### VS Code 扩展推荐

```json
// .vscode/extensions.json

{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Cursor 设置

```
1. 打开 Cursor Settings
2. 搜索 "TypeScript"
3. 启用:
   ✅ TypeScript > Check JS
   ✅ TypeScript > Validate
   ✅ TypeScript > Suggest

4. 搜索 "Problems"
5. 启用:
   ✅ Problems: Show Current In Status
   ✅ Problems: Auto Reveal
```

---

## 🧹 方案 3: 代码逻辑简化

### 当前问题（从截图看）

```typescript
// 当前收据详情页有两个按钮:
1. "✓ Confirm & move on"
2. "✓ 确认并存入 Review Queue"

问题:
❌ 两个按钮功能不清晰
❌ 存在 Save/Draft 等旧逻辑
❌ 代码冗余
```

### 简化后的逻辑

```typescript
// app/receipts/[id]/components/DetailPanel.tsx

'use client';

import { useState } from 'react';

export function DetailPanel({ transaction }: Props) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  // ✅ 唯一的确认逻辑
  async function handleConfirm() {
    setIsConfirming(true);
    
    try {
      // 1. 更新状态为 approved
      await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved'
        })
      });
      
      // 2. 关闭面板
      window.history.back();
      
      // 3. Toast 提示
      toast.success('已确认并批准');
    } catch (error) {
      toast.error('确认失败');
    } finally {
      setIsConfirming(false);
    }
  }
  
  return (
    <div className="detail-panel">
      {/* 收据信息（只读）*/}
      <div className="info-section">
        <h2>收据详情</h2>
        <div>Vendor: {transaction.vendor_name}</div>
        <div>Date: {transaction.transaction_date.substring(0, 10)}</div>
        <div>Total: ${transaction.total_amount}</div>
      </div>
      
      {/* AI 提取数据（只读）*/}
      <div className="ai-section">
        <h3>AI extracted data ✓ 数据已提取</h3>
        <div>GST: ${transaction.tax_details.gst_amount}</div>
        <div>PST: ${transaction.tax_details.pst_amount}</div>
      </div>
      
      {/* ✅ 唯一的确认按钮 */}
      <button
        onClick={handleConfirm}
        disabled={isConfirming}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold"
      >
        {isConfirming ? '确认中...' : '✓ Confirm & move on'}
      </button>
      
      {/* ❌ 删除所有其他按钮 */}
      {/* 不要 "Save Draft" */}
      {/* 不要 "Save & Continue" */}
      {/* 不要 "确认并存入 Review Queue" */}
    </div>
  );
}
```

---

### 删除冗余代码

```typescript
// ❌ 删除这些旧逻辑

// 1. 删除 Draft 相关
// - 不需要 saveDraft()
// - 不需要 draft_status 字段
// - 不需要 "Save Draft" 按钮

// 2. 删除多余的 Save 逻辑
// - 不需要 saveAndContinue()
// - 不需要 saveAndClose()
// - 只保留一个 confirm() 即可

// 3. 删除多余的状态
// - 不需要 'draft' status
// - 只需要: 'pending', 'approved', 'flagged'

// 4. 删除 Review Queue 按钮
// - Review Queue 应该是一个筛选视图
// - 不应该有 "存入 Review Queue" 的动作
// - 只需要改状态即可
```

---

## 📝 清理检查清单

```typescript
// apps/ls-web/app/receipts/[id]/page.tsx

□ 删除 "Save Draft" 按钮
□ 删除 "Save & Continue" 按钮
□ 删除 saveDraft() 函数
□ 删除 saveAndContinue() 函数
□ 只保留 confirm() 函数
□ 删除 draft_status 相关代码
□ 简化状态管理（只用 status）
□ 移除 Review Queue 按钮（改为筛选）
□ 确保只有一个主要操作按钮
□ 删除所有未使用的导入
```

---

## 🚀 完整的开发流程

### 推荐工作流

```bash
# 1. 开发前：拉取最新代码
git pull origin dev

# 2. 开发中：实时检查
# Cursor 会自动显示 TypeScript 错误（红色波浪线）

# 3. 开发后：本地验证
pnpm tsc --noEmit  # TypeScript 检查
pnpm build         # 构建检查
pnpm lint          # 代码规范检查

# 4. 提交前：自动检查（如果配置了 Husky）
git add .
git commit -m "feat: xxx"
# → Husky 自动运行检查

# 5. 推送
git push origin dev
# → Vercel 自动部署

# 6. 部署后：检查 Vercel 日志
# 确保部署成功
```

---

## 🛠️ 给 Cursor 的完整指令

```markdown
## Task: Setup Local Build Checks and Code Cleanup

### Part 1: Install Husky (Pre-commit Checks)

```bash
# Install
pnpm add -D husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "pnpm tsc --noEmit && pnpm build"
```

Update package.json:
```json
{
  "scripts": {
    "prepare": "husky install",
    "check": "pnpm tsc --noEmit && pnpm build",
    "quick-check": "pnpm tsc --noEmit"
  }
}
```

### Part 2: VS Code Configuration

Create .vscode/settings.json:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.showDeprecations": true,
  "problems.showCurrentInStatus": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Part 3: Code Cleanup

File: app/receipts/[id]/page.tsx

Remove:
□ "Save Draft" button
□ "Save & Continue" button
□ saveDraft() function
□ saveAndContinue() function
□ draft_status logic
□ "确认并存入 Review Queue" button

Keep only:
□ confirm() function
□ One primary "✓ Confirm & move on" button
□ Simple status: pending → approved

Simplify logic:
- Click confirm → status = 'approved'
- No drafts, no multiple save options
- One button, one action

### Part 4: Test

```bash
# Run checks
pnpm tsc --noEmit
pnpm build

# Should pass without errors
```

### Success Criteria
□ Husky pre-commit installed
□ TypeScript errors visible in editor
□ Only one confirm button remains
□ No draft/save logic
□ Local build passes
□ Commit triggers automatic checks
```

---

## 📊 效果对比

### 之前（问题多）

```
开发流程:
1. 写代码
2. 推送
3. Vercel 报错 ❌
4. 回来修
5. 再推送
6. 又报错 ❌
7. ...

结果:
- 浪费时间
- 频繁推送
- 污染 Git 历史
```

### 之后（流程优化）

```
开发流程:
1. 写代码
2. Cursor 自动显示错误（红色波浪线）✅
3. 修复错误
4. 提交前自动检查（Husky）✅
5. 通过后才能推送
6. Vercel 一次部署成功 ✅

结果:
- 节省时间
- 高质量提交
- 干净的 Git 历史
```

---

## 🎯 CEO 的建议总结

### 三个核心点

```
1. 本地运行 pnpm build
   ✅ 在 push 前发现问题
   ✅ 不依赖 Vercel 报错

2. VS Code / Cursor 插件
   ✅ 红色波浪线实时提示
   ✅ 边写边发现问题

3. 简化逻辑
   ✅ 移除 Save/Draft
   ✅ 只保留 Confirm
   ✅ 一键确认逻辑
```

---

**快速实施步骤**:

1️⃣ 安装 Husky (`pnpm add -D husky`)

2️⃣ 配置 pre-commit (`npx husky add .husky/pre-commit "pnpm build"`)

3️⃣ 配置 VS Code settings.json

4️⃣ 清理收据详情页代码（删除多余按钮和逻辑）

5️⃣ 测试 (`pnpm build` 应该通过)

6️⃣ 提交测试（Husky 会自动检查）

🎯 **预计时间**: 20-30 分钟

✅ **效果**: 再也不会靠 Vercel 报错才知道问题！

🚀 **CEO 的建议非常专业，立即实施！**
