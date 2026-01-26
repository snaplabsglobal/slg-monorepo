// apps/ls-web/app/diagnostic/page.tsx
// 移动端重定向问题诊断工具

'use client'

import { useEffect, useState } from 'react'

export default function DiagnosticPage() {
  const [info, setInfo] = useState<any>({})
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    console.log(message)
  }

  useEffect(() => {
    addLog('诊断页面加载开始')

    // 1. 基本设备信息
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      
      // 屏幕信息
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      
      // 检测设备类型
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
      isAndroid: /Android/i.test(navigator.userAgent),
      
      // URL 信息
      currentURL: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      protocol: window.location.protocol,
      
      // Referrer
      referrer: document.referrer,
      
      // 时间戳
      timestamp: new Date().toISOString(),
    }

    addLog('设备信息收集完成')
    addLog(`设备类型: ${deviceInfo.isMobile ? '移动端' : '桌面端'}`)
    addLog(`User Agent: ${deviceInfo.userAgent.substring(0, 50)}...`)

    // 2. Cookie 检查
    const cookies = document.cookie
    addLog(`Cookies: ${cookies || '(空)'}`)

    // 3. LocalStorage 检查
    try {
      const lsKeys = Object.keys(localStorage)
      addLog(`LocalStorage keys: ${lsKeys.length} 个`)
      if (lsKeys.length > 0) {
        addLog(`Keys: ${lsKeys.join(', ')}`)
      }
    } catch (e) {
      addLog(`LocalStorage 错误: ${e}`)
    }

    // 4. SessionStorage 检查
    try {
      const ssKeys = Object.keys(sessionStorage)
      addLog(`SessionStorage keys: ${ssKeys.length} 个`)
      if (ssKeys.length > 0) {
        addLog(`Keys: ${ssKeys.join(', ')}`)
      }
    } catch (e) {
      addLog(`SessionStorage 错误: ${e}`)
    }

    // 5. 检查 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        addLog(`Service Workers: ${registrations.length} 个`)
        registrations.forEach((reg, i) => {
          addLog(`SW ${i}: ${reg.active?.scriptURL || 'inactive'}`)
        })
      })
    } else {
      addLog('浏览器不支持 Service Worker')
    }

    // 6. 检查是否在 PWA 模式
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    addLog(`PWA 模式: ${isPWA ? '是' : '否'}`)

    // 7. 检查网络状态
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      addLog(`网络类型: ${conn?.effectiveType || 'unknown'}`)
    }

    setInfo(deviceInfo)

    // 8. 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      addLog(`页面可见性: ${document.visibilityState}`)
    })

    // 9. 监听焦点变化
    window.addEventListener('focus', () => addLog('窗口获得焦点'))
    window.addEventListener('blur', () => addLog('窗口失去焦点'))

    // 10. 监听在线/离线状态
    window.addEventListener('online', () => addLog('网络恢复在线'))
    window.addEventListener('offline', () => addLog('网络离线'))

    addLog('诊断页面加载完成 ✅')

  }, [])

  // 测试重定向
  const testRedirect = (url: string) => {
    addLog(`测试重定向到: ${url}`)
    setTimeout(() => {
      window.location.href = url
    }, 100)
  }

  // 清除所有缓存
  const clearAll = async () => {
    addLog('开始清除所有缓存...')
    
    // 清除 localStorage
    localStorage.clear()
    addLog('LocalStorage 已清除')
    
    // 清除 sessionStorage
    sessionStorage.clear()
    addLog('SessionStorage 已清除')
    
    // 清除 cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    addLog('Cookies 已清除')
    
    // 清除 Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (let registration of registrations) {
        await registration.unregister()
      }
      addLog('Service Workers 已清除')
    }
    
    // 清除 Cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (let name of cacheNames) {
        await caches.delete(name)
      }
      addLog(`Cache API 已清除 (${cacheNames.length} 个缓存)`)
    }
    
    addLog('所有缓存已清除 ✅ 请刷新页面')
  }

  // 导出日志
  const exportLogs = () => {
    const blob = new Blob([JSON.stringify({ info, logs }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagnostic-${Date.now()}.json`
    a.click()
    addLog('日志已导出')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">
            🔍 移动端诊断工具
          </h1>
          <p className="text-gray-600 mb-4">
            这个页面会帮助我们找出为什么手机会自动跳转到 Vercel 认证页面
          </p>
          
          {/* 状态指示 */}
          <div className="bg-green-100 border border-green-400 rounded p-4 mb-4">
            <p className="text-green-800 font-semibold">
              ✅ 如果你能看到这个页面，说明页面本身是可以加载的
            </p>
          </div>

          {/* 设备信息摘要 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <InfoCard 
              label="设备类型" 
              value={info.isMobile ? '📱 移动端' : '💻 桌面端'} 
            />
            <InfoCard 
              label="系统" 
              value={info.isIOS ? 'iOS' : info.isAndroid ? 'Android' : info.platform} 
            />
            <InfoCard 
              label="屏幕尺寸" 
              value={`${info.screenWidth} x ${info.screenHeight}`} 
            />
            <InfoCard 
              label="PWA 模式" 
              value={info.isPWA ? '是' : '否'} 
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => testRedirect('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              测试跳转到首页
            </button>
            <button
              onClick={() => testRedirect('/login')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              测试跳转到 /login
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              清除所有缓存
            </button>
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              导出诊断日志
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              刷新页面
            </button>
          </div>
        </div>

        {/* 详细设备信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">📊 详细信息</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 overflow-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
              {JSON.stringify(info, null, 2)}
            </pre>
          </div>
        </div>

        {/* 实时日志 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">📝 实时日志</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-yellow-900 mb-2">📱 使用说明</h3>
          <ol className="list-decimal list-inside text-yellow-800 space-y-2">
            <li>在手机上访问这个页面</li>
            <li>截图保存所有显示的信息</li>
            <li>点击"导出诊断日志"下载完整日志</li>
            <li>尝试点击"测试跳转到首页"看是否会重定向</li>
            <li>如果仍然跳转，注意观察跳转到哪个 URL</li>
            <li>把截图和日志发给我分析</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded border border-gray-200">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  )
}
