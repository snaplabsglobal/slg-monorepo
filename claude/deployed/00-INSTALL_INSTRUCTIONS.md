# 📥 权限系统 - 文件安装说明

由于文件夹下载有问题，这里是单个文件的安装方法。

## 🎯 文件列表（6 个）

1. **01-middleware.ts**
   - 目标位置：`apps/jobsite-snap/middleware.ts`
   - 作用：路由保护

2. **02-permissions_schema.sql**
   - 目标位置：Supabase SQL Editor（执行一次）
   - 作用：创建数据库表

3. **03-permissions.ts**
   - 目标位置：`apps/jobsite-snap/lib/permissions/permissions.ts`
   - 作用：权限检查函数

4. **04-upgrade-page.tsx**
   - 目标位置：`apps/jobsite-snap/app/upgrade/page.tsx`
   - 作用：升级页面

5. **05-upgrade-modal.tsx**
   - 目标位置：`apps/jobsite-snap/components/upgrade/upgrade-modal.tsx`
   - 作用：升级弹窗组件

## 📋 安装步骤

### Step 1: 下载所有文件
点击每个文件旁边的下载图标 📥

### Step 2: 创建目录结构
```bash
cd apps/jobsite-snap

# 创建必要的目录
mkdir -p lib/permissions
mkdir -p app/upgrade
mkdir -p components/upgrade
```

### Step 3: 复制文件到正确位置
```bash
# 假设你下载的文件在 ~/Downloads/

# 1. Middleware
cp ~/Downloads/01-middleware.ts ./middleware.ts

# 2. 权限工具库
cp ~/Downloads/03-permissions.ts ./lib/permissions/permissions.ts

# 3. 升级页面
cp ~/Downloads/04-upgrade-page.tsx ./app/upgrade/page.tsx

# 4. 升级组件
cp ~/Downloads/05-upgrade-modal.tsx ./components/upgrade/upgrade-modal.tsx
```

### Step 4: 执行数据库脚本
```bash
# 1. 打开 Supabase Dashboard
# 2. 进入 SQL Editor
# 3. 打开 02-permissions_schema.sql
# 4. 复制全部内容
# 5. 粘贴到 SQL Editor 并运行
```

### Step 5: 配置环境变量
```bash
# 编辑 .env.local
echo "NEXT_PUBLIC_APP_CODE=jobsite-snap" >> .env.local
```

### Step 6: 测试
```bash
pnpm dev
```

## ✅ 完成！

所有文件安装完成后，你的项目结构应该是：

```
apps/jobsite-snap/
├── middleware.ts                      ← 新增
├── lib/
│   └── permissions/
│       └── permissions.ts             ← 新增
├── app/
│   └── upgrade/
│       └── page.tsx                   ← 新增
└── components/
    └── upgrade/
        └── upgrade-modal.tsx          ← 新增
```

数据库表：
- profiles
- app_permissions
- app_access_logs
- upgrade_requests

## 🐛 遇到问题？

告诉我你在哪一步卡住了！
