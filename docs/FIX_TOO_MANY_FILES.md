# 修复 "Too Many Open Files" 错误

## ⚠️ 紧急修复步骤

**如果遇到大量 "EMFILE: too many open files" 错误，请立即执行：**

```bash
# 1. 停止所有运行中的进程
pkill -9 -f "next dev"
pkill -9 -f "turbo"

# 2. 增加 inotify 限制（需要 sudo）
./scripts/fix-inotify.sh
# 或者手动运行：
sudo sysctl -w fs.inotify.max_user_watches=524288
```

## 问题描述

在 monorepo 中同时运行多个 Next.js 应用时，可能会遇到 "EMFILE: too many open files" 错误。这是因为文件监听器（watchpack/inotify）达到了系统限制。

## 解决方案

### 方案 1: 增加系统 inotify 限制（**强烈推荐，必须执行**）

#### 快速修复（临时，当前会话有效）

```bash
./scripts/fix-inotify.sh
```

或者手动运行：

```bash
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=512
sudo sysctl -w fs.inotify.max_queued_events=32768
```

#### 永久修复（推荐，重启后仍有效）

```bash
./scripts/fix-inotify-permanent.sh
```

或者手动运行：

```bash
# 一次性修复所有 inotify 限制
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=512
sudo sysctl -w fs.inotify.max_queued_events=32768

# 永久保存（重启后仍有效）
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_queued_events=32768" | sudo tee -a /etc/sysctl.conf

# 应用设置
sudo sysctl -p
```

### 方案 2: 一次只运行一个应用

如果不想修改系统设置，可以一次只运行一个应用：

```bash
# 只运行 ls-web
pnpm --filter ls-web dev

# 只运行 jss-web
pnpm --filter jss-web dev

# 只运行 slg-corporate
pnpm --filter slg-corporate dev
```

### 方案 3: 已优化的配置

所有应用已配置为：
- 使用 webpack 而不是 Turbopack
- 使用轮询模式（poll: 5000ms）而不是文件系统事件
- 忽略其他应用和不需要的目录

## 当前配置

- `ls-web`: 使用 webpack + 轮询模式
- `jss-web`: 使用 Turbopack（如果遇到问题，可以切换到 webpack）
- `slg-corporate`: 使用 webpack + 轮询模式

## 验证

检查当前 inotify 限制：

```bash
sysctl fs.inotify.max_user_watches
sysctl fs.inotify.max_user_instances
sysctl fs.inotify.max_queued_events
```

应该显示：
- `fs.inotify.max_user_watches = 524288` 或更高
- `fs.inotify.max_user_instances = 512` 或更高
- `fs.inotify.max_queued_events = 32768` 或更高

检查打开的文件数量：

```bash
lsof 2>/dev/null | wc -l
```
