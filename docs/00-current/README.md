# 当前生效规范 (00-current)

此目录包含**当前生效**的产品和技术规范。

## 宪法级文件

以下文件的修改**必须通过 PR + Review**:

| 文件 | 说明 | 修改影响 |
|------|------|----------|
| `JSS_CONSTITUTION.md` | JSS 产品宪法 | 产品定位、架构原则 |
| `JSS_CAMERA_STATE_MACHINE.md` | 相机状态机规范 | 相机核心逻辑 |

## 修改流程

```
1. 从 docs-main 创建新分支
   git checkout docs-main
   git checkout -b docs/update-xxx

2. 修改文件

3. 提交 PR 到 docs-main
   - 必须说明修改原因
   - 需要至少 1 人 Review

4. Review 通过后合并
```

## 为什么需要独立分支?

1. **代码回滚不影响文档** - 代码在 main/dev 回滚时，docs 保持不变
2. **规范有独立版本历史** - 可追溯规范的演变
3. **强制 Review 流程** - 宪法级文件不能随意修改

## 目录说明

```
00-current/
├── JSS_CONSTITUTION.md        # 产品宪法
├── JSS_CAMERA_STATE_MACHINE.md # 相机状态机
└── README.md                   # 本文件
```

---

最后更新: 2026-02-08
