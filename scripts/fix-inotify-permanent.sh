#!/bin/bash
# 永久修复 "too many open files" 错误的脚本

echo "正在永久设置 inotify 限制..."

# 检查是否已存在配置
if grep -q "fs.inotify.max_user_watches" /etc/sysctl.conf; then
    echo "⚠️  检测到已存在 inotify 配置，将更新现有设置..."
    # 删除旧配置
    sudo sed -i '/fs.inotify.max_user_watches/d' /etc/sysctl.conf
    sudo sed -i '/fs.inotify.max_user_instances/d' /etc/sysctl.conf
    sudo sed -i '/fs.inotify.max_queued_events/d' /etc/sysctl.conf
fi

# 添加新配置
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_queued_events=32768" | sudo tee -a /etc/sysctl.conf

# 应用设置
echo ""
echo "应用设置..."
sudo sysctl -p

# 验证
echo ""
echo "✅ 永久设置完成！当前 inotify 限制："
sysctl fs.inotify.max_user_watches
sysctl fs.inotify.max_user_instances
sysctl fs.inotify.max_queued_events
echo ""
echo "这些设置将在系统重启后自动生效。"
