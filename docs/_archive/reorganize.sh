#!/bin/bash
# 文档重组脚本
# 执行前请确认当前在 docs 目录
set -e

cd /home/pxjiang/slg-monorepo/docs

echo "=== Step 1: 创建新目录结构 ==="
mkdir -p products/jss-web
mkdir -p products/ls-web
mkdir -p products/plan-snap
mkdir -p _archive

echo "=== Step 2: 修复目录命名问题 ==="
# 修复 troubleshooting 前面的空格
if [ -d " troubleshooting" ]; then
  echo "  - 修复 ' troubleshooting' -> 'troubleshooting'"
  mkdir -p troubleshooting
  mv " troubleshooting"/* troubleshooting/ 2>/dev/null || true
  rmdir " troubleshooting" 2>/dev/null || true
fi

# 修复 jobsiteSnap/delpoyed 拼写错误
if [ -d "jobsiteSnap/delpoyed" ]; then
  echo "  - 修复 'delpoyed' -> 'deployed'"
  mv jobsiteSnap/delpoyed/* jobsiteSnap/deployed/ 2>/dev/null || true
  rmdir jobsiteSnap/delpoyed 2>/dev/null || true
fi

echo "=== Step 3: 合并产品文档到 products/ ==="

# PlanSnap 文档
echo "  - 合并 PlanSnap/ -> products/plan-snap/"
if [ -d "PlanSnap" ]; then
  cp -r PlanSnap/* products/plan-snap/ 2>/dev/null || true
fi

# PlanSnap & IsoSnap 文档 (有空格的目录名)
if [ -d "PlanSnap  & IsoSnap" ]; then
  echo "  - 合并 'PlanSnap  & IsoSnap/' -> products/plan-snap/"
  cp -r "PlanSnap  & IsoSnap"/* products/plan-snap/ 2>/dev/null || true
fi

# jobsiteSnap 文档
echo "  - 合并 jobsiteSnap/ -> products/jss-web/"
if [ -d "jobsiteSnap" ]; then
  cp -r jobsiteSnap/* products/jss-web/ 2>/dev/null || true
fi

# projects/jss-web 文档
echo "  - 合并 projects/jss-web/ -> products/jss-web/"
if [ -d "projects/jss-web" ]; then
  cp -r projects/jss-web/* products/jss-web/ 2>/dev/null || true
fi

echo "=== Step 4: 移动根目录文件到合适分类 ==="

# 架构文档 -> architecture/
echo "  - 架构文档 -> architecture/"
for f in \
  "DATABASE_SCHEMA_COMPLETE.md" \
  "DATABASE_MIGRATION_GUIDE.md" \
  "ENVIRONMENT_ARCHITECTURE.md" \
  "SLG_R2_ARCHITECTURE.md" \
  "TRANSACTIONS_TABLE_SCHEMA.md"; do
  [ -f "$f" ] && mv "$f" architecture/ && echo "    moved $f"
done

# 决策文档 -> decisions/
echo "  - 决策文档 -> decisions/"
for f in \
  "AUTH_REFACTOR_SUMMARY.md" \
  "ADMIN_AUTH_IMPLEMENTATION.md" \
  "CORRECT_MONOREPO_DEPLOYMENT.md" \
  "CRON_CLEANUP_RECYCLE_BIN.md" \
  "CTO_DOCUMENTS_SUMMARY.md" \
  "CONSOLE_LOGS_AND_ERRORS.md" \
  "FRONTEND_COMPONENTS_UPDATE_SUMMARY.md" \
  "JOBSITE_SNAP_V2_PROJECT_CONTEXT.md" \
  "PROJECT_MILESTONE_2026-01-26.md" \
  "ML_TRAINING_GUIDE.md" \
  "Proposal: Professional Digital Service Integration.md" \
  "CLAUDE_DOCUMENTS_UPDATE_SUMMARY.md"; do
  [ -f "$f" ] && mv "$f" decisions/ && echo "    moved $f"
done

# 知识库文档 -> knowledge-base/
echo "  - 知识库文档 -> knowledge-base/"
for f in \
  "DATABASE_QUICK_REFERENCE.md" \
  "DATABASE_SETUP_SUMMARY.md" \
  "DEPLOYMENT.md" \
  "ENV_SETUP.md" \
  "RECEIPT_ANALYZER_ANALYSIS.md" \
  "SSO_CONFIGURATION.md" \
  "SnapLabs 全系产品功能图谱.md"; do
  [ -f "$f" ] && mv "$f" knowledge-base/ && echo "    moved $f"
done

# 问题排查 -> troubleshooting/
echo "  - 问题排查 -> troubleshooting/"
for f in \
  "FIX_TOO_MANY_FILES.md" \
  "VERCEL_404_TROUBLESHOOTING.md" \
  "VERCEL_DEV_NOT_UPDATING.md" \
  "ELEGANT_USER_DRIVEN_ML_UPGRADE.md"; do
  [ -f "$f" ] && mv "$f" troubleshooting/ && echo "    moved $f"
done

# LedgerSnap/JSS 业务文档 -> products/ls-web/
echo "  - JSS/LedgerSnap 业务文档 -> products/ls-web/"
for f in \
  "JSS 成本归集规则白皮书（V1）.md" \
  "JSS 合规与审计说明页（CPA ⁄ Due Diligence）.md" \
  "JSS → 会计系统字段级 & 科目级对照说明(QB ⁄ Xero).md" \
  "JSS Home Hero 贴纸视觉设计需求 (Design Prompt).md" \
  "JSS_LedgerSnap_决策流程图_v1.1.md" \
  "JSS_LedgerSnap_AI协作与决策规范_v1.1.md" \
  "数据归巢\"升级弹窗逻辑.md"; do
  [ -f "$f" ] && mv "$f" products/ls-web/ && echo "    moved $f"
done

# PlanSnap 文档 -> products/plan-snap/
echo "  - PlanSnap 文档 -> products/plan-snap/"
for f in "00_PlanSnap_文档索引.md"; do
  [ -f "$f" ] && mv "$f" products/plan-snap/ && echo "    moved $f"
done

# 流程文档 -> _archive/
echo "  - 流程文档 -> _archive/"
for f in \
  "文档重组方案.md" \
  "文档命名自查清单.md" \
  "260204071_CDO交接文档.md" \
  "test_data.sql" \
  "rename_docs.sh"; do
  [ -f "$f" ] && mv "$f" _archive/ && echo "    moved $f"
done

# 产品 文件夹内容
if [ -d "产品" ]; then
  echo "  - 产品/ 内容 -> products/ls-web/"
  mv 产品/* products/ls-web/ 2>/dev/null || true
  rmdir 产品 2>/dev/null || true
fi

echo "=== Step 5: 清理空目录和重复目录 ==="
# 删除已合并的旧目录
for d in "PlanSnap" "PlanSnap  & IsoSnap" "jobsiteSnap" "projects"; do
  if [ -d "$d" ]; then
    echo "  - 删除 $d/"
    rm -rf "$d"
  fi
done

echo "=== Step 6: 创建索引文件 ==="
cat > README.md << 'EOF'
# SLG Monorepo 文档中心

## 目录结构

```
docs/
├── architecture/      # 系统架构设计
├── decisions/         # 技术决策记录
├── knowledge-base/    # 知识库与参考手册
├── troubleshooting/   # 问题排查与修复
├── ideas/             # 产品构思与提案
├── products/          # 产品专属文档
│   ├── jss-web/       # JobSite Snap
│   ├── ls-web/        # LedgerSnap
│   └── plan-snap/     # PlanSnap
└── _archive/          # 已归档文档
```

## 命名规范

- **日期前缀**: `2026-02-08_类型_标题.md`
- **类型标签**: 架构、决策、问题、知识库
- **语言**: 优先中文，保留技术术语

## 文档分类

| 分类 | 说明 | 示例 |
|------|------|------|
| architecture | 系统设计、数据库Schema | 环境架构设计、R2系统设计 |
| decisions | 功能决策、规范制定 | 认证重构总结、部署修正 |
| knowledge-base | 操作手册、快速参考 | 数据库快速参考、SSO配置 |
| troubleshooting | Bug修复、故障排查 | Vercel 404排查、文件数量修复 |
| ideas | 产品构思、改进建议 | 定价策略、功能设计 |
| products | 产品专属技术文档 | Sprint任务、设计规范 |

---
更新时间: $(date +%Y-%m-%d)
EOF

echo "=== 完成! ==="
echo ""
echo "新目录结构:"
find . -type d -maxdepth 2 | sort | head -20
