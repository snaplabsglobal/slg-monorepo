# 运行这个诊断脚本:

echo "=== 当前目录 ==="
pwd

echo -e "\n=== 根目录内容 ==="
ls -la

echo -e "\n=== apps 目录内容 ==="
ls -la apps/ 2>/dev/null || echo "apps 目录不存在"

echo -e "\n=== 查找 package.json ==="
find . -name "package.json" -maxdepth 3 -type f

echo -e "\n=== 查找 pnpm-workspace.yaml ==="
find . -name "pnpm-workspace.yaml" -maxdepth 2 -type f
