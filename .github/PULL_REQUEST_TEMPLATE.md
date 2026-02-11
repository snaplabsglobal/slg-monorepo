## 🚦 Push 前检查清单

### ✅ 必须满足（硬门槛）
- [ ] `pnpm gate0:check` 通过
- [ ] `git status` 干净（无意外改动）

### ✅ 建议满足（可选）
- [ ] 如改了 UI/交互：本地跑 Gate 0-B 相关测试
- [ ] 如改了视觉相关：本地跑一次视觉对比（环境一致时）

### ❌ 不要求本地跑
- Gate 0-C Visual Regression（CI 专用，除非本地环境与 CI 完全一致）
- 任何依赖 CI secrets 的测试

---

## 🧪 Gate 0 验收

### Gate 0-A: 数据 / 队列 / 证据
- [ ] 30-Shot Stress Test (synthetic): PASS / FAIL
- [ ] 30-Shot Stress Test (camera): PASS / FAIL / N/A (仅大版本)
- [ ] Offline → Online Recovery: PASS / FAIL
- [ ] Immutable Integrity Test: PASS / FAIL
- [ ] Chaos Network Test: PASS / FAIL
- [ ] Memory Leak Trend (3x30): PASS / FAIL / N/A (仅大版本)
- [ ] Idempotency Replay: PASS / FAIL

### Gate 0-B: UI / 交互 / 路由 `[v2.3]`
- [ ] Non-blocking Capture UI: PASS / FAIL
- [ ] Route Guard Test: PASS / FAIL
- [ ] Offline UI Recovery: PASS / FAIL
- [ ] Failure State UI: PASS / FAIL

### Gate 0-C: 视觉回归 `[v2.3]`
- [ ] Camera page screenshot: ✅ 无重大差异 / ⚠️ 差异已确认
- [ ] Debug panel screenshot: ✅ / ⚠️
- [ ] Dashboard screenshot: ✅ / ⚠️

### CI Status
- [ ] `gate0-a-data`: ✅ passed
- [ ] `gate0-b-ui`: ✅ passed
- [ ] `gate0-c-visual`: ✅ ran (差异已确认)
- [ ] Playwright CI: ✅ All passed

### 关键指标速查
- [ ] `maxConcurrentCaptures` = 1
- [ ] `sequence_valid` = true
- [ ] `immutable_integrity.violations` = 0
- [ ] `chaos_network.orphan_artifacts` = {0, 0}
- [ ] `chaos_network.duplicate_events` = 0
- [ ] `memory_trend.leak_ratio` < 1.5 (如已跑)
- [ ] `stuck` = 0, `failed` = 0
- [ ] `p95(t_enqueue_ms)` < 100ms
- [ ] `commit_hash` ≠ "unknown"
- [ ] `ui_interaction.nonblocking.blocking_modal_appeared` = false `[v2.3]`
- [ ] `ui_interaction.route_guard.job_selector_absent_on_camera` = true `[v2.3]`

### 交付物
- [ ] Diagnostics JSON v2.3（含 `ui_interaction`, `visual_regression` 部分）
- [ ] Debug Panel 截图
- [ ] 视觉回归对比截图（如有差异）
- [ ] Playwright report 链接

### v1.4 红线自查
- [ ] 本次改动未使用 float/double/decimal 存储金额
- [ ] 本次改动所有 *_cents 字段旁均有 currency
- [ ] 本次改动未硬编码 'CAD' / 'GST' 等国家常量
- [ ] 本次改动 occurred_at / captured_at 取自客户端捕获时刻，非 now()
- [ ] 本次改动未对 immutable=true 的事件提供 DELETE/UPDATE 端点
- [ ] 本次改动 high_candidate 未直接触发通知推送（如涉及信号模块）
- [ ] 所有关键 UI 元素使用标准 data-testid `[v2.3]`

### 依赖管理
- [ ] 如修改了任何 `package.json`，已运行 `pnpm install` 并提交 `pnpm-lock.yaml`
- [ ] 本地已验证 `pnpm ci:lockfile` 无报错

---

### Console Summary
<details>
<summary>展开</summary>

```
（粘贴 console 输出）
```

</details>

### Diagnostics JSON
<details>
<summary>展开</summary>

```json
（粘贴 JSON）
```

</details>

### Debug Panel 截图
<!-- 拖拽截图到此处 -->

### 视觉回归截图 `[v2.3]`
<!-- 如有差异，拖拽对比截图到此处 -->

---

## 变更说明

### 改动内容
<!-- 简述本 PR 的主要改动 -->

### 测试方法
<!-- 如何验证这些改动 -->

### 相关文档
<!-- 如有相关的设计文档或 Issue，在此链接 -->
