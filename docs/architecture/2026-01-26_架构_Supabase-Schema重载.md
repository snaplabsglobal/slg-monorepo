# 刷新 Supabase Schema 缓存（Reload Schema）

PostgREST 会缓存数据库 schema。执行迁移或修改表结构后，需要触发一次 **Schema 重载**，否则 API 可能仍使用旧 schema 导致 404/400。

## 方法一：Supabase Dashboard（推荐）

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 选择项目
2. 左侧 **SQL Editor**
3. 粘贴并执行：

```sql
NOTIFY pgrst, 'reload schema';
```

4. 结果应显示：**Success. No rows returned**

---

## 方法二：命令行（需数据库连接串）

若已配置直接数据库连接（如本地 Supabase 或 CI）：

```bash
# 从 .env 读取连接串（需先设置 DATABASE_URL 或 SUPABASE_DB_URL）
source apps/ls-web/.env.local 2>/dev/null || true
export DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"
psql "$DB_URL" -c "NOTIFY pgrst, 'reload schema';"
```

或使用仓库脚本（同上逻辑）：

```bash
./scripts/reload-supabase-schema.sh
```

**获取连接串**：Dashboard → **Project Settings** → **Database** → **Connection string** (URI)，复制到 `.env.local` 为 `DATABASE_URL` 或 `SUPABASE_DB_URL`（注意密码中的特殊字符需 URL 编码）。

---

## 其他 NOTIFY 选项

| 命令 | 作用 |
|------|------|
| `NOTIFY pgrst, 'reload schema';` | 仅重载 schema 缓存 |
| `NOTIFY pgrst, 'reload config';` | 仅重载 PostgREST 配置 |
| `NOTIFY pgrst;` | 重载 schema + config |

---

## 何时需要执行

- 跑完 `supabase db push` / 迁移后
- 新建/修改表、视图、RLS 策略后
- API 返回 400 bad_request 或 404 且确认表已存在时
