# 控制台日志与错误说明

开发时浏览器控制台里常见消息的含义，以及哪些需要关注。

---

## 非错误（正常信息）

| 消息 | 含义 |
|------|------|
| **Download the React DevTools...** | React 建议安装开发者工具，可忽略。 |
| **Server [Transactions Page] Fetched transactions** | 服务端已拉取交易列表，正常。 |
| **[HMR] connected** | 热更新已连接，开发时正常。 |
| **[Fast Refresh] rebuilding / done** | Next.js 热更新重编译完成，正常。 |
| **[RealtimeTransactions] Subscribing to channel...** | 正在订阅 Realtime 频道，正常。 |
| **[RealtimeTransactions] Subscription status: SUBSCRIBED** | Realtime 订阅成功，正常。 |
| **[RealtimeTransactions] ✅ Successfully subscribed** | 同上，订阅成功。 |
| **[RealtimeTransactions] Periodic refresh (fallback) running…** | 周期刷新（兜底）在跑，开发环境约 30 秒打一次，正常。 |

---

## 可忽略的“跳过”日志

| 消息 | 含义 |
|------|------|
| **[RealtimeTransactions] Skipping subscription: organizationId is undefined** | 页面里有两处用 `useRealtimeTransactions`（例如布局 + 交易页），有一处先拿到 `organizationId`，另一处暂时是 `undefined`，所以会先跳过订阅、等 orgId 到了再订阅。属于正常时序，不是 bug。 |

---

## 需要理解的错误：ERR_NETWORK_CHANGED / Failed to fetch

| 控制台显示 | 含义 |
|------------|------|
| **GET .../api/tags/xxx net::ERR_NETWORK_CHANGED** | 请求发出后，**在收到响应前**浏览器检测到“网络变了”，请求被中止。 |
| **TypeError: Failed to fetch** | 同上，是 JS 里抛出的错误（fetch 被中止）。 |
| **Error fetching transaction tags: TypeError: Failed to fetch** | 我们代码里 catch 后打的日志，根本原因还是上面的网络变化。 |

**常见触发场景：**

- 切换 WiFi（例如 2.4G ↔ 5G）
- VPN 连接/断开
- 笔记本休眠后唤醒
- 手机热点或网络切换
- **开发时：保存代码触发 HMR，Next 重启，localhost 短暂不可用** → 正在进行的 fetch 被中止，就会报 ERR_NETWORK_CHANGED / Failed to fetch

**结论：** 这是**瞬时网络/环境变化**导致的，不是业务逻辑错误。代码已对“标签/分类”请求做：  
遇到这类网络错误时自动重试一次（2 秒后），若仍失败则静默失败，下次进入页面或展开卡片会再次请求。

---

## 排查时重点看的日志（COO 监控用）

这些保留在代码里，用于排查「单据没更新」等问题：

- **[RealtimeTransactions] Change detected** — 是否收到 Realtime 事件
- **[RealtimeTransactions] State updated** — 前端状态是否按事件更新
- **[RealtimeTransactions] Received transaction-analyzed event** — 自定义“分析完成”事件是否触发

若 AI 分析完了但列表没变，可看：有没有 **Change detected** 或 **transaction-analyzed**；若没有，多半是 Realtime/事件没发到前端；若有但 **State updated** 不对，再看 payload 里 status/vendor 等是否正确。
