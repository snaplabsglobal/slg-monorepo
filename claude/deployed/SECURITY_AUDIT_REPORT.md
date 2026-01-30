# 🔴 安全检查报告 - API Key 泄露

## ⚠️ 严重安全问题

**发现时间**: 2026-01-28  
**严重程度**: 🔴 **CRITICAL** - API Key 已泄露到 Git 仓库

---

## 📋 泄露的敏感信息

### 1. Gemini API Key 泄露

以下文件包含真实的 Gemini API Key，**已被提交到 Git 仓库**：

- ❌ `apps/ls-web/.env.production` - 包含 `GEMINI_API_KEY=AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI`
- ❌ `apps/ls-web/.env.development` - 包含 `GEMINI_API_KEY=AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI`
- ❌ `docs/DEPLOYMENT.md` - 包含 `GEMINI_API_KEY=AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI`

### 2. Supabase Keys 泄露

- ❌ `apps/ls-web/.env.production` - 包含 Supabase URL 和 Anon Key
- ❌ `apps/ls-web/.env.development` - 包含 Supabase URL 和 Anon Key
- ❌ `docs/DEPLOYMENT.md` - 包含 Supabase URL 和 Anon Key

---

## 🔍 问题分析

### 为什么 API Key 会泄露？

1. **环境变量文件被提交到 Git**
   - `.env.production` 和 `.env.development` 应该只在本地使用
   - 这些文件被错误地提交到了 Git 仓库

2. **文档中包含真实 API Key**
   - `docs/DEPLOYMENT.md` 中包含了真实的 API Key
   - 应该使用占位符，而不是真实值

3. **`.gitignore` 配置不完整**
   - `.gitignore` 只忽略了 `.env.local`，但没有忽略 `.env.production` 和 `.env.development`

---

## ✅ 立即修复步骤

### 步骤 1: 撤销泄露的 API Key

**⚠️ 立即执行**：

1. **删除泄露的 Gemini API Key**
   - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 找到 API Key: `AIzaSyD9yoKHgJY-SoNlBaSQu_Bx_TeWNUBECyI`
   - 点击 "Delete" 删除这个 API Key
   - 创建新的 API Key

2. **检查 Supabase 安全**
   - 登录 Supabase Dashboard
   - 检查是否有异常访问
   - 考虑重置 Anon Key（如果需要）

### 步骤 2: 从 Git 历史中移除敏感信息

**⚠️ 警告**: 如果仓库是公开的，即使从当前版本删除，历史记录中仍然存在。

```bash
# 1. 从 Git 中移除这些文件
git rm --cached apps/ls-web/.env.production
git rm --cached apps/ls-web/.env.development

# 2. 更新 .gitignore
# (我会帮你更新)

# 3. 提交更改
git commit -m "security: remove sensitive API keys from repository"

# 4. 如果仓库是公开的，考虑使用 git-filter-repo 清理历史
# 或者联系 Git 服务提供商（GitHub/GitLab）的帮助
```

### 步骤 3: 更新 .gitignore

确保所有环境变量文件都被忽略。

### 步骤 4: 更新文档

将文档中的真实 API Key 替换为占位符。

### 步骤 5: 创建安全的示例文件

创建 `.env.example` 文件作为模板。

---

## 🛡️ 预防措施

### 1. 更新 .gitignore

确保以下文件被忽略：
- `.env*`
- `*.env`
- `.env.local`
- `.env.production.local`
- `.env.development.local`
- `.env.test.local`

### 2. 使用环境变量管理

- **本地开发**: 使用 `.env.local`（已在 .gitignore 中）
- **生产环境**: 使用 Vercel/平台的环境变量配置
- **文档**: 使用占位符，如 `GEMINI_API_KEY=your_api_key_here`

### 3. 定期安全审计

- 定期检查 Git 历史中是否有敏感信息
- 使用工具如 `git-secrets` 或 `truffleHog` 扫描仓库
- 设置 pre-commit hooks 防止提交敏感信息

### 4. 使用密钥管理服务

考虑使用：
- **Vercel Environment Variables** (推荐用于 Next.js)
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **1Password Secrets Automation**

---

## 📊 风险评估

| 风险项 | 严重程度 | 影响范围 | 状态 |
|--------|---------|---------|------|
| Gemini API Key 泄露 | 🔴 CRITICAL | API 使用配额可能被滥用 | ⚠️ 需要立即撤销 |
| Supabase Keys 泄露 | 🟡 HIGH | 数据库访问可能被滥用 | ⚠️ 需要监控 |
| Git 历史记录 | 🟡 HIGH | 如果仓库公开，任何人都能看到 | ⚠️ 需要清理历史 |

---

## ✅ 修复检查清单

- [ ] 撤销泄露的 Gemini API Key
- [ ] 创建新的 Gemini API Key
- [ ] 从 Git 中移除 `.env.production` 和 `.env.development`
- [ ] 更新 `.gitignore` 文件
- [ ] 更新文档，移除真实 API Key
- [ ] 创建 `.env.example` 模板文件
- [ ] 检查 Supabase 访问日志
- [ ] 更新所有环境变量配置
- [ ] 通知团队成员（如果适用）

---

## 📞 需要帮助？

如果仓库是公开的，建议：
1. 立即撤销所有泄露的 API Keys
2. 考虑将仓库设为私有
3. 使用 `git-filter-repo` 清理 Git 历史（需要谨慎操作）

---

**⚠️ 重要**: 即使修复了当前问题，如果仓库是公开的，Git 历史记录中仍然包含敏感信息。建议联系 Git 服务提供商获取帮助。
