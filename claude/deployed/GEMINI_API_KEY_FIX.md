# Gemini API Key 修复指南

## 🔴 问题

从日志看到：
```
Gemini API error: Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [403 Forbidden] Your API key was reported as leaked. Please use another API key.
```

**影响**: 
- ❌ Gemini AI 分析功能无法使用
- ✅ Transaction 仍然可以创建（使用默认值）
- ✅ 文件上传功能正常

---

## 🔧 解决方案

### 步骤 1: 获取新的 Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录你的 Google 账号
3. 点击 "Create API Key"
4. 复制新的 API Key

### 步骤 2: 更新环境变量

在 `apps/ls-web/.env.local` 中更新：

```bash
GEMINI_API_KEY=your_new_api_key_here
```

### 步骤 3: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
pnpm dev
```

---

## 📝 注意事项

1. **不要将 API Key 提交到 Git**
   - 确保 `.env.local` 在 `.gitignore` 中
   - 不要在代码中硬编码 API Key

2. **API Key 安全**
   - 不要在公共仓库中分享 API Key
   - 如果 API Key 泄露，立即在 Google AI Studio 中删除并创建新的

3. **功能影响**
   - 即使 Gemini API 失败，receipt 上传功能仍然可用
   - Transaction 会使用默认值创建（需要手动编辑）

---

## ✅ 验证

上传一个新的 receipt，检查日志中是否还有 Gemini API 错误。

如果看到：
```
[Upload API] Transaction created successfully: { ... }
```

且没有 Gemini 错误，说明修复成功！
