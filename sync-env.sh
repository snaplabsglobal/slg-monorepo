#!/bin/bash

# --- 1. 定义源文件 (根目录的真相源) ---
SOURCE_ENV=".env.local"

# --- 2. 定义需要同步的子项目文件夹 ---
# 根据你的实际目录名修改，比如 apps/ls, apps/jss 等
PROJECTS=("apps/ls-web" "apps/jss-web" "apps/slg-corporate")

echo "🚀 开始同步环境变量..."

# 检查根目录源文件是否存在
if [ ! -f "$SOURCE_ENV" ]; then
    echo "❌ 错误: 根目录找不到 $SOURCE_ENV，请先创建它！"
    exit 1
fi

# --- 3. 循环同步 ---
for PROJECT in "${PROJECTS[@]}"
do
    if [ -d "$PROJECT" ]; then
        echo "同步至 -> $PROJECT"
        # 复制根目录的变量到子项目的 .env.local
        # 注意：这里用 cat 是为了覆盖，确保子项目和根目录保持一致
        cp "$SOURCE_ENV" "$PROJECT/.env.local"
        echo "✅ $PROJECT 同步完成"
    else
        echo "⚠️ 跳过: 找不到目录 $PROJECT"
    fi
done

echo "🎉 所有项目环境变量已对齐！现在你可以安心搬砖了。"