# SLG Monorepo 文档中心

> **重要**: docs 使用独立分支 `docs-main`，与代码分支 (main/dev) 解耦。
> 代码回滚不影响文档。

## 分支架构

```
代码分支                    文档分支
─────────                  ─────────
main ──────┐
           │ (独立)
dev ───────┤               docs-main
           │                  │
feature/*──┘                  └── docs/*  (文档修改分支)
```

## 目录结构

```
docs/
├── 00-current/        ⭐ 当前生效规范 (宪法级，需 PR + Review)
│   ├── JSS_CONSTITUTION.md
│   └── JSS_CAMERA_STATE_MACHINE.md
├── architecture/      系统架构设计
├── decisions/         技术决策记录
├── knowledge-base/    知识库与参考手册
├── troubleshooting/   问题排查与修复
├── ideas/             产品构思与提案
├── products/          产品专属文档
│   ├── jss-web/       JobSite Snap
│   ├── ls-web/        LedgerSnap
│   └── plan-snap/     PlanSnap
├── _archive/          已归档文档
└── CODEOWNERS         分支保护规则
```

## 宪法级文件

以下文件修改**必须 PR + Review**:

| 文件 | 说明 |
|------|------|
| `00-current/JSS_CONSTITUTION.md` | 产品宪法 - 定位、架构原则 |
| `00-current/JSS_CAMERA_STATE_MACHINE.md` | 相机状态机规范 |

## 工作流程

### 修改普通文档

```bash
git checkout docs-main
# 修改文档
git commit -m "docs: 更新 xxx"
git push origin docs-main
```

### 修改宪法级文件

```bash
git checkout docs-main
git checkout -b docs/update-constitution
# 修改文件
git commit -m "docs: 修改 JSS_CONSTITUTION - 原因"
git push origin docs/update-constitution
# 创建 PR 到 docs-main，等待 Review
```

## 命名规范

- **日期前缀**: `2026-02-08_类型_标题.md`
- **类型标签**: 架构、决策、问题、知识库
- **语言**: 优先中文，保留技术术语

## 文档分类

| 分类 | 说明 | 示例 |
|------|------|------|
| 00-current | 当前生效规范 | 产品宪法、状态机规范 |
| architecture | 系统设计、数据库Schema | 环境架构设计、R2系统设计 |
| decisions | 功能决策、规范制定 | 认证重构总结、部署修正 |
| knowledge-base | 操作手册、快速参考 | 数据库快速参考、SSO配置 |
| troubleshooting | Bug修复、故障排查 | Vercel 404排查 |
| ideas | 产品构思、改进建议 | 定价策略、功能设计 |
| products | 产品专属技术文档 | Sprint任务、设计规范 |

---

更新时间: 2026-02-08
