#!/bin/bash
# 修复 "too many open files" 错误的脚本

echo "正在增加 inotify 限制..."

# 临时增加（当前会话有效）
echo "设置临时限制..."
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=512
sudo sysctl -w fs.inotify.max_queued_events=32768

# 检查是否成功
WATCHES=$(sysctl -n fs.inotify.max_user_watches)
INSTANCES=$(sysctl -n fs.inotify.max_user_instances)
EVENTS=$(sysctl -n fs.inotify.max_queued_events)

echo ""
echo "当前 inotify 限制："
echo "  max_user_watches: $WATCHES"
echo "  max_user_instances: $INSTANCES"
echo "  max_queued_events: $EVENTS"
echo ""

if [ "$WATCHES" -ge 524288 ] && [ "$INSTANCES" -ge 512 ] && [ "$EVENTS" -ge 32768 ]; then
    echo "✅ inotify 限制已成功增加"
    echo ""
    echo "⚠️  注意：这是临时设置，重启后会恢复。"
    echo ""
    echo "要永久设置，请运行："
    echo "  echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf"
    echo "  echo 'fs.inotify.max_user_instances=512' | sudo tee -a /etc/sysctl.conf"
    echo "  echo 'fs.inotify.max_queued_events=32768' | sudo tee -a /etc/sysctl.conf"
    echo "  sudo sysctl -p"
    echo ""
    echo "或者运行永久设置脚本："
    echo "  ./scripts/fix-inotify-permanent.sh"
else
    echo "❌ 设置失败，请检查 sudo 权限"
    exit 1
fi
