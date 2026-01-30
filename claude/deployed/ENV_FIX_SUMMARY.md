# 环境变量修复总结

**修复日期**: 2026-01-28  
**问题**: RLS 错误仍然存在，因为应用连接的是本地数据库

---

## 🔍 问题根源

1. **`.env.local` 指向本地 Supabase** (`http://127.0.0.1:54321`)
2. **本地 Supabase 未运行**
3. **Next.js 环境变量优先级**: `.env.local` > `.env.development`
4. **迁移只应用到了远程数据库**（JobSite-Snap-Dev）

---

## ✅ 已执行的修复

### 临时禁用本地配置
```bash
mv apps/ls-web/.env.local apps/ls-web/.env.local.bak
```

现在应用会使用 `.env.development`，连接到远程数据库（JobSite-Snap-Dev），RLS 已经在那里禁用了。

---

## 🎯 下一步

1. **重启开发服务器**:
   ```bash
   # 停止当前服务器 (Ctrl+C)
   # 重新启动
   cd apps/ls-web
   pnpm dev
   ```

2. **测试上传功能**: 现在应该可以正常工作了

3. **验证连接**: 查看服务器日志，确认连接到远程数据库

---

## 📋 恢复本地开发（如果需要）

如果你想使用本地数据库开发：

```bash
# 1. 恢复 .env.local
mv apps/ls-web/.env.local.bak apps/ls-web/.env.local

# 2. 启动本地 Supabase
cd /home/pxjiang/slg-monorepo
supabase start

# 3. 在本地数据库禁用 RLS
supabase db execute "
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
"
```

---

## ✅ 当前状态

- ✅ `.env.local` 已临时禁用
- ✅ 应用现在使用 `.env.development`（远程数据库）
- ✅ 远程数据库的 RLS 已禁用
- ⏳ **需要重启开发服务器**

---

**请重启开发服务器，然后测试上传功能！** 🚀
