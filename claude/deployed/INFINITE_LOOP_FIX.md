# 异步处理死循环问题 - 诊断与修复

**问题**: 收据异步处理后进入死循环，3502 个请求，浏览器卡死

**根本原因**: useEffect 轮询逻辑触发无限循环

---

## 🚨 问题诊断

### 截图分析
```
Network 面板显示:
- 3502 个请求！
- 所有请求状态 200
- 大量 TransactionCard.tsx 文件请求
- 135 MB 数据传输
- ProcessingStatusBar.tsx 也在疯狂请求

底部提示:
"正在处理 收据..." (Processing...)

问题:
轮询逻辑没有正确的停止条件
→ 每次 mutate() 都触发重新渲染
→ 重新渲染又触发 useEffect
→ useEffect 又调用 mutate()
→ 无限循环 ❌
```

---

## 🔍 根本原因分析

### 错误的轮询代码

```typescript
// ❌ 错误：导致死循环
useEffect(() => {
  const pendingIds = transactions
    ?.filter(t => t.status === 'pending')
    .map(t => t.id) || [];
  
  if (pendingIds.length === 0) return;
  
  // 问题：每 3 秒 mutate()，但 transactions 变化又触发 useEffect
  const interval = setInterval(() => {
    mutate(); // 触发重新获取数据
  }, 3000);
  
  return () => clearInterval(interval);
}, [transactions, mutate]); // ❌ transactions 在依赖数组中

// 死循环过程:
// 1. transactions 变化
// 2. useEffect 执行
// 3. setInterval 每 3 秒 mutate()
// 4. mutate() 更新 transactions
// 5. transactions 变化 → 回到步骤 1
// 6. 新的 interval 被创建，旧的还在运行
// 7. 越来越多的 interval 同时运行
// 8. 浏览器崩溃 💥
```

---

## ✅ 修复方案

### 方案 1: 正确的轮询逻辑（推荐）

```typescript
// hooks/useTransactions.ts

import useSWR from 'swr';
import { useEffect, useRef } from 'react';

export function useTransactions() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 0, // 禁用自动刷新
    revalidateOnFocus: false, // 禁用焦点时重新验证
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // 检查是否有 pending 状态
    const hasPending = data?.some(t => t.status === 'pending');
    
    if (hasPending) {
      // 只有有 pending 时才启动轮询
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          mutate(); // 重新获取数据
        }, 5000); // 5 秒轮询一次（降低频率）
      }
    } else {
      // 没有 pending 时停止轮询
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data, mutate]); // ✅ 只依赖 data，不依赖 transactions
  
  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

---

### 方案 2: 使用 SWR 内置轮询（更简单）⭐

```typescript
// hooks/useTransactions.ts

import useSWR from 'swr';
import { useMemo } from 'react';

export function useTransactions() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher);
  
  // 计算是否有 pending
  const hasPending = useMemo(() => {
    return data?.some(t => t.status === 'pending') || false;
  }, [data]);
  
  // 使用 SWR 的条件刷新
  useSWR(
    hasPending ? '/api/transactions' : null, // 只有 pending 时才轮询
    fetcher,
    {
      refreshInterval: 5000, // 5 秒刷新一次
      revalidateOnFocus: false,
    }
  );
  
  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    hasPending,
    mutate,
  };
}
```

---

### 方案 3: 使用 Supabase Realtime（最佳）✅

```typescript
// hooks/useRealtimeTransactions.ts

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

export function useRealtimeTransactions() {
  const supabase = createClient();
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 0, // 禁用轮询
  });
  
  useEffect(() => {
    // 订阅 Supabase Realtime
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `status=eq.pending`, // 只监听 pending → 其他状态的变化
        },
        (payload) => {
          console.log('[Realtime] Transaction updated:', payload.new);
          mutate(); // 只在真正有变化时更新
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate, supabase]);
  
  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

---

## 🔧 立即修复步骤

### Step 1: 停止当前死循环

```bash
# 1. 停止开发服务器
Ctrl + C

# 2. 清除浏览器缓存
# 在浏览器中: F12 → Network → 右键 → Clear browser cache

# 3. 重启浏览器（关闭所有标签页）
```

---

### Step 2: 修复代码

#### 修复 useTransactions Hook

```typescript
// hooks/useTransactions.ts

'use client';

import useSWR from 'swr';
import { useEffect, useRef } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useTransactions() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 2000, // 2 秒内的重复请求会被去重
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPendingCountRef = useRef(0);
  
  useEffect(() => {
    if (!data) return;
    
    const pendingCount = data.filter(t => t.status === 'pending').length;
    
    // 只在 pending 数量变化时输出日志
    if (pendingCount !== lastPendingCountRef.current) {
      console.log('[Transactions] Pending count:', pendingCount);
      lastPendingCountRef.current = pendingCount;
    }
    
    if (pendingCount > 0) {
      // 启动轮询
      if (!intervalRef.current) {
        console.log('[Transactions] Starting polling...');
        intervalRef.current = setInterval(() => {
          mutate();
        }, 5000); // 5 秒轮询
      }
    } else {
      // 停止轮询
      if (intervalRef.current) {
        console.log('[Transactions] Stopping polling...');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data?.length, mutate]); // ✅ 只依赖 data.length，避免每次 data 变化都重新创建 interval
  
  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

---

#### 修复 ProcessingStatusBar 组件

```typescript
// components/global/ProcessingStatusBar.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProcessingStatusBar() {
  const { transactions } = useTransactions();
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();
  const prevCountRef = useRef(0);
  
  useEffect(() => {
    const pending = transactions?.filter(t => t.status === 'pending').length || 0;
    
    // 只在数量真正变化时更新
    if (pending !== prevCountRef.current) {
      setPendingCount(pending);
      prevCountRef.current = pending;
    }
  }, [transactions?.length]); // ✅ 只依赖 length
  
  if (pendingCount === 0) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-500 text-white px-4 py-3 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">
            正在处理 {pendingCount} 张收据...
          </span>
        </div>
        
        <button
          onClick={() => router.push('/transactions')}
          className="text-sm underline hover:text-blue-100"
        >
          查看详情
        </button>
      </div>
    </div>
  );
}
```

---

#### 修复 TransactionsList 组件

```typescript
// components/transactions/TransactionsList.tsx

'use client';

import { useTransactions } from '@/hooks/useTransactions';
import { TransactionRow } from './TransactionRow';

export function TransactionsList() {
  const { transactions, isLoading } = useTransactions();
  
  // ❌ 删除这个 useEffect！它会导致死循环
  // useEffect(() => {
  //   const pendingIds = transactions?.filter(t => t.status === 'pending').map(t => t.id) || [];
  //   if (pendingIds.length === 0) return;
  //   const interval = setInterval(() => {
  //     mutate();
  //   }, 3000);
  //   return () => clearInterval(interval);
  // }, [transactions, mutate]);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!transactions || transactions.length === 0) {
    return <EmptyState />;
  }
  
  return (
    <div className="space-y-2">
      {transactions.map(transaction => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
        />
      ))}
    </div>
  );
}
```

---

### Step 3: 添加防护机制

#### 请求去重

```typescript
// lib/fetch-with-dedup.ts

const requestCache = new Map<string, Promise<any>>();

export async function fetchWithDedup(url: string, options?: RequestInit) {
  // 如果已有相同请求在进行中，返回缓存的 Promise
  if (requestCache.has(url)) {
    console.log('[Dedup] Using cached request:', url);
    return requestCache.get(url);
  }
  
  // 创建新请求
  const promise = fetch(url, options)
    .then(res => res.json())
    .finally(() => {
      // 请求完成后从缓存中移除
      requestCache.delete(url);
    });
  
  requestCache.set(url, promise);
  return promise;
}

// 使用示例
const fetcher = (url: string) => fetchWithDedup(url);
```

---

#### 请求速率限制

```typescript
// hooks/useThrottledMutate.ts

import { useCallback, useRef } from 'react';

export function useThrottledMutate(mutate: () => void, delay: number = 2000) {
  const lastCallRef = useRef(0);
  
  const throttledMutate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    if (timeSinceLastCall >= delay) {
      console.log('[Throttle] Mutating...');
      lastCallRef.current = now;
      mutate();
    } else {
      console.log('[Throttle] Skipped (too soon)');
    }
  }, [mutate, delay]);
  
  return throttledMutate;
}

// 使用示例
const { mutate } = useSWR('/api/transactions', fetcher);
const throttledMutate = useThrottledMutate(mutate, 3000);
```

---

## 📊 修复验证

### 检查清单

```
□ 停止开发服务器
□ 清除浏览器缓存
□ 修复 useTransactions Hook
□ 修复 ProcessingStatusBar
□ 删除 TransactionsList 中的 useEffect
□ 重启服务器
□ 测试轮询功能
```

### 测试步骤

```bash
# 1. 重启开发服务器
pnpm run dev

# 2. 打开浏览器开发工具
F12 → Network 面板

# 3. 上传一张收据
# 4. 观察 Network 面板

预期结果:
- 初始请求: 1 个
- 每 5 秒: 1 个请求（只在有 pending 时）
- pending 完成后: 停止轮询
- 总请求数: < 10 个 ✓

❌ 如果看到:
- 请求数持续增长
- 3 秒内多个请求
- 浏览器卡顿
→ 说明还有问题
```

---

## 🎯 最佳实践

### 1. 轮询规则

```typescript
✅ 正确:
- 只在需要时轮询
- 使用 ref 存储 interval ID
- 正确清理 interval
- 使用去重机制

❌ 错误:
- 无条件轮询
- 多个 interval 同时运行
- 不清理 interval
- 没有去重
```

### 2. useEffect 依赖

```typescript
✅ 正确:
useEffect(() => {
  // ...
}, [data?.length, mutate]); // 只依赖长度

❌ 错误:
useEffect(() => {
  // ...
}, [transactions, mutate]); // 依赖整个数组
```

### 3. 调试日志

```typescript
// 添加调试日志
console.log('[Transactions] Pending count:', pendingCount);
console.log('[Polling] Starting...');
console.log('[Polling] Stopping...');

// 生产环境移除
if (process.env.NODE_ENV === 'development') {
  console.log('[Debug]', ...);
}
```

---

## 🚨 紧急修复（如果还在循环）

### 临时禁用轮询

```typescript
// hooks/useTransactions.ts

export function useTransactions() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 0, // ✅ 完全禁用自动刷新
  });
  
  // ❌ 临时注释掉轮询逻辑
  // useEffect(() => {
  //   // ... 轮询代码
  // }, [data, mutate]);
  
  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

### 手动刷新按钮

```typescript
// 临时方案：添加手动刷新按钮
<button
  onClick={() => mutate()}
  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
>
  刷新
</button>
```

---

**CTO 总结**: 

✅ **问题定位**: useEffect 轮询逻辑导致无限循环

✅ **根本原因**: 
- transactions 在依赖数组中
- 每次 mutate 触发重新渲染
- 重新渲染创建新 interval
- 旧 interval 没有清理

✅ **修复方案**: 
1. 使用 ref 存储 interval ID
2. 只依赖 data.length
3. 正确清理 interval
4. 添加去重机制

✅ **验证**: Network 面板请求数 < 10 个

🚀 **立即执行**: 停止服务器 → 修复代码 → 重启 → 测试！
