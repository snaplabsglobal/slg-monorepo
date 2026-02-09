# JSS Camera页面改进与实时照片显示完整方案

> **文档类型：** 产品改进 + 技术实现 + ESLint规则  
> **状态：** ✅ CEO已确认，CTO立即执行  
> **创建时间：** 2026-02-07  
> **优先级：** 🔥 P0 - 核心体验改进

---

## 📋 执行摘要

### CEO的改进需求（5项）

```
1. Camera页不应占满全屏
2. 应该可以在当前最近Jobs列表里选择Job
3. Jobs和照片应该有删除功能
4. 照片浏览时应该有上/下一张功能
5. 拍完回到Jobs应该实时显示刚上传的照片
```

### CPO总判断

```
✅ 全部都该做，而且要现在做，不要拖

你现在不是在"补UI细节"
而是在把JSS从"能用的工具"
拉到"专业工地产品"的临界点
```

---

## 🎯 改进方案总览

### 方向确认

```
你现在的方向是对的
已经非常接近"可长期演进的JSS v1形态"

但camera页、jobs选择、照片浏览这三块
必须统一到一个"工地拍照工具"的心智模型里
否则后面功能越多，体验会再次塌
```

---

## 📸 改进1：Camera页不应占满全屏

### ✔️ CPO强烈同意

**原因（产品层面）：**

```
JSS ≠ 原生系统相机
JSS = "在Job语境里的拍照工具"

如果Camera一上来就是全屏：
- Job成了"前置条件"，不是"上下文"
- 用户在心理上会觉得：我在用相机，而不是在记录某个工地
```

---

### 正确结构（建议锁死）

```
Camera Page
├─ Job Context Bar（当前Job，可切换）
│   ├─ Job名称
│   └─ 切换Job（最近Jobs）
├─ Camera View（不全屏，留出上下文）
└─ Capture Button（大、明确、唯一主动作）
```

**关键原则：**
```
Camera必须"嵌在Job语境里"
而不是反过来
```

---

### 页面结构示意

```
┌──────────────────────────────┐
│ Job Context Bar              │  ← 必须存在
│  • 当前Job名称               │
│  • 切换Job（Recent Jobs）    │
├──────────────────────────────┤
│ Camera Preview Area          │  ← 不强制全屏
│  • Live camera / placeholder │
│  • 不出现确认UI              │
├──────────────────────────────┤
│ Primary Capture Button       │  ← 唯一主动作
│  • 大圆按钮（移动端）        │
└──────────────────────────────┘
```

---

## 🔄 改进2：在Camera页直接选择「最近Jobs」

### ✔️ 必须有

**CPO判断：非常专业的需求 👍**

---

### 规则（CPO级）

```
拍照时，80%的情况
用户只会在最近3-5个Job之间切换

所以Camera页里：
❌ 不要用「完整Job列表」
✅ 用Recent Jobs（最近使用/最近更新）
✅ 最多5个
✅ 切换 = 0跳转（不要跳回Jobs页）
```

**这是典型的Non-blocking flow**

---

### Job Context Bar规则（锁死）

```
✓ 默认显示最近使用的Job
✓ 可切换最近3-5个Jobs
✓ 切换Job：
  - 不跳页面
  - 不中断相机
  - 仅切换Photo归属

❗永远禁止Camera页强制先选Job再进入拍照
```

---

## 🗑️ 改进3：Jobs和Photos需要删除功能

### ✔️ 但要"分级删除"

---

### Jobs删除（谨慎）

**默认操作：**
```
Archive Job（推荐）
```

**Archive后：**
```
- Job不出现在Recent Jobs
- 照片保留
```

**Delete Job（高级操作）：**
```
- 二次确认
- 明确提示：
  "删除Job将永久删除所有照片，无法恢复"
```

**理由：**
```
工地数据 ≈ 法律/纠纷证据
误删 = 灾难
```

---

### Photos删除（必须有）

**要符合工地直觉：**

```
✓ 单张删除
✓ 多选删除（长按/checkbox）
✓ 删除后不打断拍照流程
```

**原则：**
```
删除是"整理"，不是"编辑"
```

---

### 删除规则（与拍照解耦）

```
删除 = 整理行为

❌ 不允许在capture flow中弹删除确认
✅ 在Viewer/Organizer中完成

删除类型：
- 单张删除
- 多选删除（checkbox/long-press）
```

---

## 👁️ 改进4：照片浏览上一张/下一张

### ✔️ 这是必须项，不是加分项

**CPO：这个你提得非常关键**

---

### Desktop浏览行为

```
✓ 左右箭头切换
✓ 键盘：
  - ← 上一张
  - → 下一张
  - ESC 退出浏览
```

---

### Mobile浏览行为（必须实现）

```
✓ 左右滑动切换
✓ 单击：
  - 显示/隐藏UI
✓ 长按：
  - 进入选择模式（多选）
```

**关键：**
```
❗没有swipe浏览 = 产品不合格

如果没有这个：
JSS会被用户潜意识拿去跟系统相册比
然后你必输
```

---

### 浏览模式（Viewer）

**进入方式：**
```
- Jobs → Photo thumbnail
- Camera → Recent photos → 点击
```

**浏览时的操作按钮（最小集）：**
```
- 删除（Delete）
- 下载（Download）
- 信息（拍摄时间/Job）
```

---

## ⚡ 改进5：拍完回Jobs实时显示刚上传的照片

### ✔️ 必须做 - 这是"信任感"核心

**CPO判断：**
```
你拍完回到Jobs，看到刚刚那张立刻出现
用户才会觉得"我拍到且存到了"
```

---

### 问题诊断

**你现在的现象：要手动刷新才出来**

**原因通常是：**
```
1. Jobs/Photos列表是一次性fetch，没有订阅更新
2. 用了Next/React的缓存但没触发revalidate
3. 上传完成后没有发出事件让UI更新
```

---

### 解决方案：两层实时

**本地实时（必须有）：**
```
上传还没完成也能看到"刚拍的照片"（pending）
```

**服务器实时（加分）：**
```
上传完成后自动变成"已上传"（ready），无需刷新
```

**效果：**
```
就算地下室没网
也能"实时显示刚拍的"
```

---

## 🔧 技术实现方案

### CEO已同意：用SWR改进

**CPO给的边界（一句话）：**

```
只把Jobs List和Job Photos Timeline两个读接口迁到SWR
并实现上传完成后mutate()实时刷新

❌ 不要重写API routes
❌ 不要动相机/队列
```

---

### SWR最小迁移方案

#### 1. 目标架构

```
仍然：Client Component → /api/... → Supabase server client

改的是：useEffect fetch → useSWR

更新机制：上传成功后调用mutate(key)触发刷新
```

---

#### 2. Jobs List改造

**原来的代码：**
```typescript
const fetchJobs = useCallback(async () => {
  const res = await fetch(`/api/jobs?status=${statusFilter}`)
  const data: JobListResponse = await res.json()
  setJobs(data.jobs)
}, [statusFilter])

useEffect(() => {
  fetchJobs()
}, [fetchJobs])
```

**改成：**
```typescript
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(r => r.json());

const jobsKey = `/api/jobs?status=${statusFilter}`;

const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
  jobsKey, 
  fetcher, 
  {
    revalidateOnFocus: true,
    dedupingInterval: 1000,
  }
);

const jobs = data?.jobs ?? [];
```

**立刻得到：**
```
✓ 自动focus revalidate（不刷新也能变）
✓ 统一loading/error状态
✓ 可被外部mutate(jobsKey)精准刷新
```

---

#### 3. JobDetail Photos Timeline改造

**先别上useSWRInfinite，保证"上传后立刻出现"：**

```typescript
const photosKey = jobId
  ? `/api/jobs/${jobId}/photos?limit=20&offset=${currentOffset}`
  : null;

const { data, isLoading, mutate } = useSWR<JobPhotosResponse>(
  photosKey, 
  fetcher
);

const photos = data?.photos ?? [];
```

**上传完成后：**
```
- 如果在JobDetail页面：mutate()即刷新当前页
- 如果希望"刚拍的永远在最前面"：
  上传完成时强制currentOffset=0然后mutate()
```

---

#### 4. 核心：上传完成后实时出现

**A. 最稳的刷新（不做乐观）：**

```typescript
import { mutate } from "swr";

// 在上传成功回调里
mutate(`/api/jobs/${jobId}/photos?limit=20&offset=0`);
mutate(`/api/jobs?status=${statusFilter}`);
```

**如果statusFilter不确定，用函数匹配：**
```typescript
mutate((key) => 
  typeof key === "string" && key.startsWith("/api/jobs")
);

mutate((key) => 
  typeof key === "string" && 
  key.includes(`/api/jobs/${jobId}/photos`)
);
```

---

**B. 更爽的体验（推荐）：乐观插入pending**

```typescript
// 拍完enqueue立刻让UI出现（离线也成立）
mutate(
  `/api/jobs/${jobId}/photos?limit=20&offset=0`,
  (current?: JobPhotosResponse) => ({
    photos: [
      {
        id: `local-${localId}`,
        thumbUrl,
        status: "PENDING",
        createdAt: Date.now(),
      },
      ...(current?.photos ?? []),
    ],
  }),
  { revalidate: false }
);

// 上传成功后
mutate(key) // 重新拉一次，或把pending替换成真实photoId
```

---

### CTO执行清单（SWR迁移）

```
☐ 安装并在app顶层包SWRConfig（全局fetcher + no-store）
☐ JobList.tsx：useEffect fetch改成useSWR('/api/jobs?...')
☐ JobDetail PhotoTimeline：改成useSWR('/api/jobs/:id/photos?...')
☐ 上传成功时：mutate(jobPhotosKey) + mutate(jobsListKey)
☐ 可选：enqueue时做optimistic pending插入
```

---

### 别踩坑（5个关键点）

```
1. 不要全站一次性迁移
   只迁Jobs list / Photo timeline两块

2. fetch必须cache: "no-store"
   避免Next/浏览器缓存造成"你mutate了但还是旧"

3. mutate要用精准key（或matchFn）
   不要乱refresh整站

4. 分页先别复杂化
   先保证offset=0的第一页能实时更新

5. 不要把相机链路跟SWR绑在一起
   Non-blocking capture仍是capture→enqueue→return
```

---

## 🛡️ ESLint规则与Runtime Invariant

### 目标：把"Non-blocking Capture"变成工程硬约束

**两层护城河：**

```
ESLint（编译期）：
不让"表单相机模式"的代码进仓库

Runtime Invariant（运行期）：
就算有人绕过ESLint，也会在开发/测试环境立刻爆红
```

---

### ESLint插件目录结构

```
tools/eslint-plugin-jss/
  package.json
  tsconfig.json
  src/
    index.ts
    rules/
      no-camera-modal.ts
      no-await-in-capture.ts
      no-navigate-after-capture.ts
      require-job-context-bar.ts
```

---

### 4条关键规则

**1. no-camera-modal：**
```
Camera UI里禁止blocking modal/confirm
```

**2. no-await-in-capture：**
```
onShutter()/capture()里禁止await重活（upload/compress/ai）
```

**3. no-navigate-after-capture：**
```
capture()之后禁止导航（push/replace）
```

**4. require-job-context-bar：**
```
Camera Page必须渲染JobContextBar
```

---

### 完整规则实现（no-camera-modal）

```typescript
// tools/eslint-plugin-jss/src/rules/no-camera-modal.ts

import type { Rule } from "eslint";
import type { CallExpression, JSXOpeningElement } from "estree";

function isCameraFile(filename: string): boolean {
  const f = filename.replace(/\\/g, "/").toLowerCase();
  return f.includes("/camera/") || 
         f.includes("/cameras/") || 
         f.includes("/snap-evidence/");
}

function getCalleeName(node: any): string | null {
  if (node?.type === "Identifier") return node.name ?? null;
  
  if (node?.type === "MemberExpression" && !node.computed) {
    const prop = node.property;
    if (prop?.type === "Identifier") return prop.name ?? null;
  }
  return null;
}

function getJSXTagName(node: any): string | null {
  if (node?.type === "JSXIdentifier") return node.name ?? null;
  
  if (node?.type === "JSXMemberExpression") {
    const prop = node.property;
    if (prop?.type === "JSXIdentifier") return prop.name ?? null;
  }
  return null;
}

const BANNED_CALL_FRAGMENTS = [
  "openmodal", "opendialog", "confirm", 
  "showconfirm", "setshowconfirm", "alert",
];

const BANNED_JSX_FRAGMENTS = ["dialog", "modal", "confirm"];

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow blocking confirm/modal flows inside Camera UI",
      recommended: true,
    },
    schema: [],
    messages: {
      noModal: "Camera UI must be non-blocking: modal/confirm is forbidden.",
    },
  },

  create(context) {
    const filename = context.getFilename?.() ?? "";
    if (!isCameraFile(filename)) return {};

    function report(node: any) {
      context.report({ node, messageId: "noModal" });
    }

    return {
      CallExpression(node: CallExpression & any) {
        const calleeName = getCalleeName(node.callee);
        if (!calleeName) return;

        const name = calleeName.toLowerCase();

        // Block window.confirm / window.alert
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.type === "Identifier" &&
          node.callee.object.name === "window" &&
          (calleeName === "confirm" || calleeName === "alert")
        ) {
          report(node);
          return;
        }

        // Block typical modal/confirm triggers
        if (BANNED_CALL_FRAGMENTS.some((frag) => name.includes(frag))) {
          report(node);
        }
      },

      JSXOpeningElement(node: JSXOpeningElement & any) {
        const tagName = getJSXTagName(node.name);
        if (!tagName) return;

        const n = tagName.toLowerCase();
        if (BANNED_JSX_FRAGMENTS.some((frag) => n.includes(frag))) {
          report(node);
        }
      },
    };
  },
};

export default rule;
```

---

### Runtime Invariants实现

**jssInvariant + CaptureGuard：**

```typescript
// lib/invariants.ts

export function jssInvariant(cond: any, msg: string): asserts cond {
  if (process.env.NODE_ENV === "production") return;
  if (!cond) {
    console.error("[JSS INVARIANT FAILED]", msg);
    throw new Error(msg);
  }
}

export function createCaptureGuard() {
  let inCapture = false;
  let startedAt = 0;

  return {
    begin() {
      jssInvariant(
        !inCapture, 
        "Capture re-entered (UI is blocking or double-fired)"
      );
      inCapture = true;
      startedAt = performance.now();
    },
    
    end() {
      const dur = performance.now() - startedAt;
      inCapture = false;
      jssInvariant(
        dur < 120, 
        `Capture handler took ${dur.toFixed(1)}ms (must be non-blocking)`
      );
    },
    
    assertNotNavigating(routerAction: string) {
      jssInvariant(
        !inCapture, 
        `Navigation '${routerAction}' during capture is forbidden`
      );
    },
  };
}
```

**在camera controller中使用：**

```typescript
const guard = createCaptureGuard();

async function onShutter() {
  guard.begin();

  // ✅ 允许：只做本地capture
  const frame = await camera.capture();

  // ✅ 必须：enqueue，不await上传
  uploadQueue.enqueue({ frame, jobId: currentJobId ?? null });

  guard.end();
}
```

---

## 📋 CPO补充的关键点

### 照片≠孤立资源

```
每张照片必须永远带着Job上下文：
- Job
- 时间
- 拍摄顺序（极重要）

顺序不是时间排序那么简单，后面会用到：
- Before / During / After
- Inspection flow
```

---

### 拍照完成后：绝不强制用户"看照片"

```
这条和Non-blocking Capture宪法是同一条血脉

拍完 → 继续拍
看照片 = 用户主动行为
```

---

### 移动端底部大圆形Camera按钮 - 一定要保留

```
这是JSS的"肌肉记忆"

但要注意：
- Camera永远是primary action
- Jobs/More是secondary
```

---

### Photo Organizer ≠ 相册

```
Photo Organizer是"事后整理工具"
- 拍照时不打断
- 整理时才进入
```

---

## 📜 JSS v1交互宪法（摘要）

```
1. Camera永远Non-blocking

2. Job是拍照的上下文，不是前置表单

3. 拍照不弹确认、不跳页

4. 浏览、删除、整理全部是secondary flow

5. 移动端优先设计，再适配desktop

6. 所有UI改动不得破坏以上行为
```

---

## ✅ CTO执行Checklist（10条必须全部通过）

### 1️⃣ Camera不得是全屏"独立模式"

```
☐ Camera页面始终显示Job Context
☐ Camera UI嵌在应用layout中（不是modal/overlay）
```

---

### 2️⃣ Job Context必须可见&可切换

```
☐ Camera页显示当前Job名称
☐ 可在Camera页切换Recent Jobs（≤5）
☐ 切换Job不reload页面、不reset camera
```

---

### 3️⃣ 拍照行为必须Non-blocking

```
☐ 拍照后不进入确认页
☐ 拍照后不弹modal
☐ 拍照后立即回到live preview
☐ 可连续快速拍摄（stress test ≥10张）
```

---

### 4️⃣ 拍照与上传完全解耦

```
☐ 上传失败不影响继续拍照
☐ UI不等待upload完成
☐ 所有照片先进入本地队列
```

---

### 5️⃣ Camera是唯一Primary Action（移动端）

```
☐ Bottom Nav中Camera居中
☐ Camera使用大圆按钮
☐ 颜色固定：rgb(245, 158, 11)
```

---

### 6️⃣ Jobs删除必须是"归档优先"

```
☐ Job默认只能Archive
☐ Delete Job需二次确认
☐ 明确提示照片将被删除
```

---

### 7️⃣ Photos删除不影响拍照流程

```
☐ 删除入口仅在Viewer/Organizer
☐ 删除操作不阻塞Camera
☐ 支持单张&多选删除
```

---

### 8️⃣ Photo Viewer必须支持顺序浏览

```
☐ Desktop：左右箭头 + 键盘←→
☐ Mobile：左右swipe
☐ 不允许只能"点缩略图返回"
```

---

### 9️⃣ Photo Viewer UI可隐藏

```
☐ 单击切换UI显示/隐藏
☐ 默认不遮挡照片主体
```

---

### 🔟 明确禁止的行为（任何出现=Fail）

```
❌ 拍照确认页
❌ 拍照后必填表单
❌ Camera无Job Context
❌ 上传失败阻断拍照
```

---

## 🧪 E2E测试断言（防体验回退）

### 1. Camera Non-blocking测试

```typescript
test('camera allows rapid consecutive capture', async ({ page }) => {
  await page.goto('/camera');
  await page.waitForSelector('[data-testid=camera-ready]');

  for (let i = 0; i < 5; i++) {
    await page.click('[data-testid=shutter-button]');
  }

  // Camera仍然处于live状态
  await expect(
    page.locator('[data-testid=camera-live]')
  ).toBeVisible();
});
```

---

### 2. Job Context始终存在

```typescript
test('camera always shows job context', async ({ page }) => {
  await page.goto('/camera');

  await expect(
    page.locator('[data-testid=job-context-bar]')
  ).toBeVisible();
});
```

---

### 3. 切换Job不重置Camera

```typescript
test('switching job does not reset camera', async ({ page }) => {
  await page.goto('/camera');

  await page.click('[data-testid=job-switcher]');
  await page.click('[data-testid=job-option-1]');

  await expect(
    page.locator('[data-testid=camera-live]')
  ).toBeVisible();
});
```

---

### 4. 上传失败不阻塞拍照

```typescript
test('upload failure does not block capture', async ({ page }) => {
  await page.route('**/upload', route => route.abort());

  await page.goto('/camera');
  await page.click('[data-testid=shutter-button]');

  await expect(
    page.locator('[data-testid=camera-live]')
  ).toBeVisible();
});
```

---

### 5. Photo Viewer Swipe（移动端）

```typescript
test('mobile photo viewer supports swipe', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/jobs/1/photos/1');

  await page.touchscreen.tap(300, 400);
  await page.mouse.move(300, 400);
  await page.mouse.down();
  await page.mouse.move(50, 400);
  await page.mouse.up();

  await expect(
    page.locator('[data-testid=photo-index]')
  ).toContainText('2');
});
```

---

### 6. 删除照片不影响Camera

```typescript
test('delete photo does not affect camera flow', async ({ page }) => {
  await page.goto('/jobs/1/photos/1');
  await page.click('[data-testid=delete-photo]');
  await page.click('[data-testid=confirm-delete]');

  await page.goto('/camera');

  await expect(
    page.locator('[data-testid=camera-live]')
  ).toBeVisible();
});
```

---

## 🔒 两个"保险"（强烈建议）

### 1. Docs中加"法律级声明"

```
⚠️ Any change that violates Non-blocking Capture behavior
is considered a breaking product change 
and requires CPO approval.
```

---

### 2. CI中把Camera E2E设为Required

```
Camera tests fail = PR不可merge

这一步能救你未来至少5次返工
```

---

## 💬 CPO最后的话

### 你现在已经做到了99%创业团队做不到的事

```
把"体验直觉"变成：
- 文档
- Checklist
- 自动化断言

从这一刻起，JSS的Camera体验
不再依赖"谁在写UI"
而是被系统性保护住了
```

---

### 给CEO的判断

```
你现在不是在"补UI细节"
而是在把JSS从"能用的工具"
拉到"专业工地产品"的临界点

你提的点：
✔ 全部正确
✔ 顺序也对
✔ 现在做是最佳时机
```

---

## 📊 实施时间表

### Week 1（本周）

```
✓ Camera页面改造（Job Context Bar）
✓ Recent Jobs选择器（5个）
✓ Jobs Archive功能
✓ Photos删除功能（单张+多选）
```

---

### Week 2（下周）

```
✓ Photo Viewer左右切换（Desktop+Mobile）
✓ SWR迁移（Jobs List + Photo Timeline）
✓ 实时照片显示（mutate机制）
✓ Optimistic UI（pending状态）
```

---

### Week 3（验收）

```
✓ ESLint规则实施
✓ Runtime Invariants部署
✓ E2E测试通过
✓ 完整验收清单检查
```

---

**文档版本：** v1.0  
**创建人：** CPO（基于CEO需求）  
**审核人：** CEO  
**执行人：** CTO + 前端团队  
**生效日期：** 立即生效  
**预计完成：** 3周

---

**从"能用"到"专业"，就在这3周！** 🎯
