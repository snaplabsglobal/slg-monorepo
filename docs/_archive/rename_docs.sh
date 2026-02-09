#!/bin/bash
# JSS/LedgerSnap 文档重组批量重命名脚本
# 生成日期: 2025-02-01
# 作者: CDO (Claude Web AI)
# 使用方法: chmod +x rename_docs.sh && ./rename_docs.sh

set -e  # 遇到错误立即退出

echo "🚀 开始文档重组..."
echo "📁 当前目录: $(pwd)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Phase 1: 移动到 architecture/ 文件夹
# ============================================
echo -e "${BLUE}📂 Phase 1: 整理架构文档${NC}"

# 数据库相关架构
[ -f "DATABASE_SCHEMA_COMPLETE.md" ] && mv "DATABASE_SCHEMA_COMPLETE.md" "architecture/2026-01-27_架构_数据库Schema完整版.md" && echo -e "${GREEN}✓${NC} 数据库Schema"
[ -f "SUPABASE_RELOAD_SCHEMA.md" ] && mv "SUPABASE_RELOAD_SCHEMA.md" "architecture/2026-01-26_架构_Supabase-Schema重载.md" && echo -e "${GREEN}✓${NC} Supabase Schema"
[ -f "TRANSACTIONS_TABLE_SCHEMA.md" ] && mv "TRANSACTIONS_TABLE_SCHEMA.md" "architecture/2026-01-27_架构_交易表Schema设计.md" && echo -e "${GREEN}✓${NC} 交易表Schema"

# 环境与系统架构
[ -f "ENVIRONMENT_ARCHITECTURE.md" ] && mv "ENVIRONMENT_ARCHITECTURE.md" "architecture/2026-01-25_架构_环境架构设计.md" && echo -e "${GREEN}✓${NC} 环境架构"
[ -f "SLG_R2_ARCHITECTURE.md" ] && mv "SLG_R2_ARCHITECTURE.md" "architecture/2026-01-28_架构_SLG-R2系统设计.md" && echo -e "${GREEN}✓${NC} SLG R2架构"

# 迁移指南
[ -f "DATABASE_MIGRATION_GUIDE.md" ] && mv "DATABASE_MIGRATION_GUIDE.md" "architecture/2026-01-27_架构_数据库迁移指南.md" && echo -e "${GREEN}✓${NC} 迁移指南"

echo ""

# ============================================
# Phase 2: 移动到 decisions/ 文件夹
# ============================================
echo -e "${BLUE}📂 Phase 2: 整理决策文档${NC}"

# AI 团队规范
[ -f "JSS_LedgerSnap - AI 协作与决策规范 v1.0.md" ] && mv "JSS_LedgerSnap - AI 协作与决策规范 v1.0.md" "decisions/2026-02-01_决策_AI协作规范_v1.1.md" && echo -e "${GREEN}✓${NC} AI协作规范"
[ -f "CDO协作快速指南.md" ] && mv "CDO协作快速指南.md" "decisions/2026-02-01_决策_CDO协作指南.md" && echo -e "${GREEN}✓${NC} CDO协作指南"

# 认证与权限
[ -f "AUTH_REFACTOR_SUMMARY.md" ] && mv "AUTH_REFACTOR_SUMMARY.md" "decisions/2026-01-26_决策_认证重构总结.md" && echo -e "${GREEN}✓${NC} 认证重构"
[ -f "ADMIN_AUTH_IMPLEMENTATION.md" ] && mv "ADMIN_AUTH_IMPLEMENTATION.md" "decisions/2026-01-27_决策_管理员认证实施方案.md" && echo -e "${GREEN}✓${NC} 管理员认证"

# 部署与基础设施
[ -f "CORRECT_MONOREPO_DEPLOYMENT.md" ] && mv "CORRECT_MONOREPO_DEPLOYMENT.md" "decisions/2026-01-25_决策_Monorepo部署修正.md" && echo -e "${GREEN}✓${NC} Monorepo部署"
[ -f "CRON_CLEANUP_RECYCLE_BIN.md" ] && mv "CRON_CLEANUP_RECYCLE_BIN.md" "decisions/2026-01-25_决策_定时清理回收站方案.md" && echo -e "${GREEN}✓${NC} 定时清理"

# 日志与错误处理
[ -f "CONSOLE_LOGS_AND_ERRORS.md" ] && mv "CONSOLE_LOGS_AND_ERRORS.md" "decisions/2026-01-27_决策_日志与错误处理规范.md" && echo -e "${GREEN}✓${NC} 日志规范"

# 技术总结
[ -f "CTO_DOCUMENTS_SUMMARY.md" ] && mv "CTO_DOCUMENTS_SUMMARY.md" "decisions/2026-01-27_决策_CTO文档汇总.md" && echo -e "${GREEN}✓${NC} CTO文档汇总"

# 前端组件
[ -f "FRONTEND_COMPONENTS_UPDATE_SUMMARY.md" ] && mv "FRONTEND_COMPONENTS_UPDATE_SUMMARY.md" "decisions/2026-01-26_决策_前端组件更新总结.md" && echo -e "${GREEN}✓${NC} 前端组件更新"

# 项目规划
[ -f "JOBSITE_SNAP_V2_PROJECT_CONTEXT.md" ] && mv "JOBSITE_SNAP_V2_PROJECT_CONTEXT.md" "decisions/2026-01-26_决策_JobsiteSnap-V2项目背景.md" && echo -e "${GREEN}✓${NC} JobsiteSnap V2"
[ -f "PROJECT_MILESTONE_2026-01-26.md" ] && mv "PROJECT_MILESTONE_2026-01-26.md" "decisions/2026-01-27_决策_项目里程碑.md" && echo -e "${GREEN}✓${NC} 项目里程碑"

# ML 训练
[ -f "ML_TRAINING_GUIDE.md" ] && mv "ML_TRAINING_GUIDE.md" "decisions/2026-01-25_决策_机器学习训练指南.md" && echo -e "${GREEN}✓${NC} ML训练指南"

echo ""

# ============================================
# Phase 3: 移动到 troubleshooting/ 文件夹
# ============================================
echo -e "${BLUE}📂 Phase 3: 整理问题排查文档${NC}"

# Bug 修复
[ -f "FIX_TOO_MANY_FILES.md" ] && mv "FIX_TOO_MANY_FILES.md" "troubleshooting/2026-01-25_问题_文件数量过多修复.md" && echo -e "${GREEN}✓${NC} 文件数量修复"

# Vercel 问题
[ -f "VERCEL_404_TROUBLESHOOTING.md" ] && mv "VERCEL_404_TROUBLESHOOTING.md" "troubleshooting/2026-01-25_问题_Vercel-404排查.md" && echo -e "${GREEN}✓${NC} Vercel 404"
[ -f "VERCEL_DEV_NOT_UPDATING.md" ] && mv "VERCEL_DEV_NOT_UPDATING.md" "troubleshooting/2026-01-25_问题_Vercel开发环境未更新.md" && echo -e "${GREEN}✓${NC} Vercel开发环境"

# 升级问题
[ -f "ELEGANT_USER_DRIVEN_ML_UPGRADE.md" ] && mv "ELEGANT_USER_DRIVEN_ML_UPGRADE.md" "troubleshooting/2026-01-29_问题_用户驱动ML升级方案.md" && echo -e "${GREEN}✓${NC} ML升级"

# 迁移异常
[ -f "数据库迁移过程实施规范.md" ] && mv "数据库迁移过程实施规范.md" "troubleshooting/2026-01-27_问题_数据库迁移异常处理.md" && echo -e "${GREEN}✓${NC} 迁移异常"

echo ""

# ============================================
# Phase 4: 移动到 knowledge-base/ 文件夹
# ============================================
echo -e "${BLUE}📂 Phase 4: 整理知识库文档${NC}"

# 数据库参考
[ -f "DATABASE_QUICK_REFERENCE.md" ] && mv "DATABASE_QUICK_REFERENCE.md" "knowledge-base/知识库_数据库快速参考.md" && echo -e "${GREEN}✓${NC} 数据库参考"
[ -f "DATABASE_SETUP_SUMMARY.md" ] && mv "DATABASE_SETUP_SUMMARY.md" "knowledge-base/知识库_数据库设置汇总.md" && echo -e "${GREEN}✓${NC} 数据库设置"

# 部署与环境
[ -f "DEPLOYMENT.md" ] && mv "DEPLOYMENT.md" "knowledge-base/知识库_部署流程手册.md" && echo -e "${GREEN}✓${NC} 部署流程"
[ -f "ENV_SETUP.md" ] && mv "ENV_SETUP.md" "knowledge-base/知识库_环境配置手册.md" && echo -e "${GREEN}✓${NC} 环境配置"

# 功能原理
[ -f "RECEIPT_ANALYZER_ANALYSIS.md" ] && mv "RECEIPT_ANALYZER_ANALYSIS.md" "knowledge-base/知识库_收据分析器原理.md" && echo -e "${GREEN}✓${NC} 收据分析器"

# 配置指南
[ -f "SSO_CONFIGURATION.md" ] && mv "SSO_CONFIGURATION.md" "knowledge-base/知识库_SSO配置指南.md" && echo -e "${GREEN}✓${NC} SSO配置"

# 设计与业务规范
[ -f "JSS: \"Home Hero\" 极简获取设计要求 (Design Prompt).md" ] && mv "JSS: \"Home Hero\" 极简获取设计要求 (Design Prompt).md" "knowledge-base/知识库_HomeHero设计要求.md" && echo -e "${GREEN}✓${NC} HomeHero设计"
[ -f "JSS 一合计数据校验的自动屏蔽 (QB+Xero).md" ] && mv "JSS 一合计数据校验的自动屏蔽 (QB+Xero).md" "knowledge-base/知识库_数据校验自动屏蔽机制.md" && echo -e "${GREEN}✓${NC} 数据校验机制"

# AI 团队规范（知识库副本）
[ -f "jss_ledger_snap_ceo_coo_cto_决策流程图（文字版） .md" ] && mv "jss_ledger_snap_ceo_coo_cto_决策流程图（文字版） .md" "knowledge-base/知识库_决策流程图_v1.1.md" && echo -e "${GREEN}✓${NC} 决策流程图"
[ -f "JSS_LedgerSnap_AI协作与决策规范_v1.1.md" ] && mv "JSS_LedgerSnap_AI协作与决策规范_v1.1.md" "knowledge-base/知识库_AI协作规范_v1.1.md" && echo -e "${GREEN}✓${NC} AI协作规范"
[ -f "JSS_LedgerSnap_决策规范阐释_v1.1.md" ] && mv "JSS_LedgerSnap_决策规范阐释_v1.1.md" "knowledge-base/知识库_决策规范阐释_v1.1.md" && echo -e "${GREEN}✓${NC} 决策规范阐释"

echo ""

# ============================================
# Phase 5: 处理特殊文件
# ============================================
echo -e "${YELLOW}⚠️  Phase 5: 处理特殊文件${NC}"

# test_data.sql 应该移到测试数据目录或删除
if [ -f "test_data.sql" ]; then
    echo -e "${YELLOW}ℹ️  test_data.sql 保留在原位置（需手动决定是否归档或删除）${NC}"
fi

# 提案类文档
[ -f "Proposal: Professional Digital Service Integration.md" ] && mv "Proposal: Professional Digital Service Integration.md" "decisions/2026-01-25_决策_专业数字服务集成提案.md" && echo -e "${GREEN}✓${NC} 集成提案"

# SnapLabs 产品文档
[ -f "SnapLabs 交易记账功能描述 (v1) .md" ] && mv "SnapLabs 交易记账功能描述 (v1) .md" "knowledge-base/知识库_SnapLabs交易记账功能_v1.md" && echo -e "${GREEN}✓${NC} SnapLabs功能描述"

# 会计相关文档
[ -f "jss_ledger_snap_ceo_coo_cto_决策流程图（文字版）.md" ] && mv "jss_ledger_snap_ceo_coo_cto_决策流程图（文字版）.md" "decisions/2026-02-01_决策_团队决策流程图.md" && echo -e "${GREEN}✓${NC} 团队流程图"
[ -f "JSS 会计与虚拟助理项目 (CPA+Due Diligence) .md" ] && mv "JSS 会计与虚拟助理项目 (CPA+Due Diligence) .md" "decisions/2026-01-30_决策_会计虚拟助理项目方案.md" && echo -e "${GREEN}✓${NC} 会计助理项目"
[ -f "JSS 武装增强接待员项目 (v1) .md" ] && mv "JSS 武装增强接待员项目 (v1) .md" "decisions/2026-01-30_决策_增强接待员项目_v1.md" && echo -e "${GREEN}✓${NC} 接待员项目"

echo ""
echo -e "${GREEN}✅ 文档重组完成！${NC}"
echo ""
echo "📊 统计信息:"
echo "   - architecture/: $(ls -1 architecture/*.md 2>/dev/null | wc -l) 个文档"
echo "   - decisions/: $(ls -1 decisions/*.md 2>/dev/null | wc -l) 个文档"
echo "   - troubleshooting/: $(ls -1 troubleshooting/*.md 2>/dev/null | wc -l) 个文档"
echo "   - knowledge-base/: $(ls -1 knowledge-base/*.md 2>/dev/null | wc -l) 个文档"
echo ""
echo "💡 下一步:"
echo "   1. 检查文档分类是否正确"
echo "   2. 更新内部文档引用链接"
echo "   3. 运行 'git status' 查看变更"
echo "   4. 提交到版本控制"
echo ""
