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
