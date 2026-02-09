# JSS 相机状态机规范

> **状态**: 生效中
> **版本**: v1.0
> **生效日期**: 2026-02-08
> **修改流程**: 必须通过 PR + Review

---

## 1. 状态定义

```
┌─────────────────────────────────────────────────────┐
│                  CaptureState                        │
│                                                      │
│    ┌───────┐  press shutter  ┌───────────┐          │
│    │ READY │ ───────────────▶│ CAPTURING │          │
│    └───────┘                 └───────────┘          │
│        ▲                           │                │
│        │     photo saved           │                │
│        └───────────────────────────┘                │
│                                                      │
│    时间约束: CAPTURING → READY < 100ms              │
└─────────────────────────────────────────────────────┘
```

## 2. 状态转换规则

| 当前状态 | 事件 | 下一状态 | 副作用 |
|----------|------|----------|--------|
| READY | 按下快门 | CAPTURING | 触发 capture() |
| CAPTURING | 照片保存完成 | READY | 入队上传 |
| CAPTURING | 超时 (500ms) | READY | 记录错误，恢复相机 |

## 3. 禁止的状态

以下状态**永远不允许**添加到相机状态机:

```typescript
// ❌ 禁止
type ForbiddenStates =
  | 'CONFIRMING'    // 确认页面阻塞
  | 'UPLOADING'     // 等待上传
  | 'REVIEWING'     // 预览图片
  | 'PROCESSING'    // 后处理阻塞
  | 'WAITING'       // 任何等待状态
```

## 4. 实现参考

### 4.1 正确实现 (SnapCamera)

```typescript
// ✅ 正确: 非阻塞快门
const handleCapture = async () => {
  setState('CAPTURING')

  const photo = await captureFrame()
  await savePhoto(photo)      // 存入 IndexedDB
  enqueueUpload(photo.id)     // 入队后台上传

  setState('READY')           // 立即恢复，继续拍照
}
```

### 4.2 错误实现 (已废弃)

```typescript
// ❌ 错误: 阻塞快门
const handleCapture = async () => {
  const photo = await captureFrame()
  stopCamera()                // 停止相机
  router.push('/confirm')     // 跳转确认页 - 阻塞!
}
```

## 5. 上传状态机 (独立)

上传状态与相机状态完全独立:

```
┌─────────────────────────────────────────────────────┐
│                  UploadState (独立)                  │
│                                                      │
│  ┌─────────┐    ┌───────────┐    ┌──────────┐       │
│  │ PENDING │───▶│ UPLOADING │───▶│ COMPLETE │       │
│  └─────────┘    └───────────┘    └──────────┘       │
│       ▲               │                              │
│       │    retry      │ error                        │
│       └───────────────┘                              │
└─────────────────────────────────────────────────────┘
```

- 上传在后台队列进行
- 不影响相机操作
- 网络恢复自动重试

## 6. 验证规则

CI/CD 必须验证:

```typescript
// NonBlockingViolation 断言
test('camera never blocks on upload', () => {
  const start = Date.now()
  await camera.capture()
  const elapsed = Date.now() - start

  expect(elapsed).toBeLessThan(100)  // 必须 < 100ms 返回
  expect(camera.state).toBe('READY')
})
```

---

## 附录：版本历史

| 版本 | 日期 | 修改内容 | 审核人 |
|------|------|----------|--------|
| v1.0 | 2026-02-08 | 初始版本 | - |
