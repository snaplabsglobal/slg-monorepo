'use client'

/**
 * Queue Debug Panel - Dev-Only Diagnostic Tool
 *
 * CTO Self-Test Protocol Implementation:
 * - 30-shot stress test (方案 A)
 * - Stuck detector (3.1)
 * - Export diagnostics JSON (3.2)
 *
 * Purpose: Automated quality gate for PR verification
 */

import { useState, useEffect, useCallback } from 'react'
import { uploadQueue } from '@/lib/snap-evidence/upload-queue'
import { savePhoto } from '@/lib/snap-evidence/local-store'
import { getQueueStats, listAllPhotos, type QueueStats } from '@/lib/snap-evidence/local-store'
import {
  Bug,
  RefreshCw,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  HardDrive,
  Play,
  Copy,
  AlertTriangle,
} from 'lucide-react'

// App version for diagnostics
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0-dev'
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH || 'unknown'

interface DebugStats extends QueueStats {
  isOnline: boolean
  storageUsageMB: number
  storageQuotaMB: number
  lastError?: string
  lastErrorTime?: string
  stuckCount: number  // Items stuck in uploading > 60s
}

interface StressTestResult {
  status: 'idle' | 'running' | 'passed' | 'failed'
  count: number
  timings: number[]
  p95: number
  errors: string[]
  startTime?: number
  endTime?: number
}

interface DiagnosticsJSON {
  app_version: string
  commit_hash: string
  timestamp: string
  is_online: boolean
  queue_stats: {
    pending: number
    uploading: number
    uploaded: number
    failed: number
    stuck: number
  }
  stress_test?: {
    status: string
    count: number
    p95_ms: number
    errors: string[]
    duration_ms: number
  }
  recent_items: Array<{
    id: string
    status: string
    attempts: number
    last_error: string | null
    captured_at: string
    uploaded_at: string | null
  }>
  storage_estimate: {
    usage_bytes: number
    quota_bytes: number
  }
}

export function QueueDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<DebugStats | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [stressTest, setStressTest] = useState<StressTestResult>({
    status: 'idle',
    count: 0,
    timings: [],
    p95: 0,
    errors: [],
  })
  const [copySuccess, setCopySuccess] = useState(false)

  // Only show in development
  const isDev = process.env.NODE_ENV === 'development'

  // Calculate stuck items (uploading > 60 seconds)
  const calculateStuckCount = useCallback((photos: Awaited<ReturnType<typeof listAllPhotos>>) => {
    const now = Date.now()
    const STUCK_THRESHOLD_MS = 60_000 // 60 seconds

    return photos.filter((p) => {
      if (p.status !== 'uploading') return false
      const uploadingTime = now - new Date(p.taken_at).getTime()
      return uploadingTime > STUCK_THRESHOLD_MS
    }).length
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const queueStats = await getQueueStats()
      const photos = await listAllPhotos()

      // Find last error
      const failedPhotos = photos.filter((p) => p.status === 'failed')
      const lastFailed = failedPhotos.sort(
        (a, b) => new Date(b.uploaded_at || b.taken_at).getTime() -
                  new Date(a.uploaded_at || a.taken_at).getTime()
      )[0]

      // Estimate storage usage
      let storageUsageMB = 0
      let storageQuotaMB = 0
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        storageUsageMB = Math.round((estimate.usage || 0) / 1024 / 1024)
        storageQuotaMB = Math.round((estimate.quota || 0) / 1024 / 1024)
      }

      // Calculate stuck count
      const stuckCount = calculateStuckCount(photos)

      setStats({
        ...queueStats,
        isOnline: navigator.onLine,
        storageUsageMB,
        storageQuotaMB,
        lastError: lastFailed?.last_error,
        lastErrorTime: lastFailed?.uploaded_at || lastFailed?.taken_at,
        stuckCount,
      })
    } catch (e) {
      console.error('Failed to refresh debug stats:', e)
    }
  }, [calculateStuckCount])

  // Refresh on mount and periodically
  useEffect(() => {
    if (!isDev) return

    refreshStats()
    const interval = setInterval(refreshStats, 3000)

    // Listen to online/offline
    const handleOnline = () => refreshStats()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOnline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOnline)
    }
  }, [isDev, refreshStats])

  // ═══════════════════════════════════════════════════════════════════════════
  // 30-SHOT STRESS TEST (CTO Self-Test Protocol 方案 A)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a fake photo blob with timestamp
   */
  const generateTestBlob = async (index: number): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!

    // Random color background
    const hue = (index * 12) % 360
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Timestamp text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`TEST #${index + 1}`, canvas.width / 2, canvas.height / 2 - 20)
    ctx.fillText(new Date().toISOString(), canvas.width / 2, canvas.height / 2 + 20)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
    })
  }

  /**
   * Run 30-shot stress test
   */
  const runStressTest = async () => {
    const TEST_COUNT = 30
    const TEST_JOB_ID = 'stress-test-' + Date.now()

    setStressTest({
      status: 'running',
      count: 0,
      timings: [],
      p95: 0,
      errors: [],
      startTime: Date.now(),
    })

    const timings: number[] = []
    const errors: string[] = []

    console.group('🧪 30-Shot Stress Test')
    console.log(`Starting stress test with ${TEST_COUNT} photos...`)

    for (let i = 0; i < TEST_COUNT; i++) {
      try {
        const blob = await generateTestBlob(i)

        const startTime = performance.now()
        await savePhoto(TEST_JOB_ID, blob, {
          stage: 'during',
          jobName: 'Stress Test',
          location: 'Test Environment',
        })
        const elapsed = performance.now() - startTime

        timings.push(elapsed)

        setStressTest((prev) => ({
          ...prev,
          count: i + 1,
          timings: [...prev.timings, elapsed],
        }))

        console.log(`Photo ${i + 1}/${TEST_COUNT}: ${elapsed.toFixed(1)}ms`)
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        errors.push(`Photo ${i + 1}: ${error}`)
        console.error(`Photo ${i + 1} FAILED:`, e)
      }
    }

    // Calculate p95
    const sortedTimings = [...timings].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedTimings.length * 0.95)
    const p95 = sortedTimings[p95Index] || 0

    // Determine pass/fail
    const passed =
      timings.length === TEST_COUNT && // All 30 saved
      p95 < 100 &&                      // p95 < 100ms
      errors.length === 0               // No fatal errors

    const endTime = Date.now()
    const result: StressTestResult = {
      status: passed ? 'passed' : 'failed',
      count: timings.length,
      timings,
      p95,
      errors,
      startTime: stressTest.startTime,
      endTime,
    }

    setStressTest(result)

    // Log summary
    console.log('─'.repeat(50))
    console.log('STRESS TEST SUMMARY:')
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`  Photos saved: ${timings.length}/${TEST_COUNT}`)
    console.log(`  p95 enqueue time: ${p95.toFixed(1)}ms (threshold: <100ms)`)
    console.log(`  Fatal errors: ${errors.length}`)
    if (errors.length > 0) {
      console.log(`  Errors:`, errors)
    }
    console.groupEnd()

    // Refresh stats to show new items
    await refreshStats()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT DIAGNOSTICS JSON (CTO Self-Test Protocol 3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  const exportDiagnostics = async () => {
    const photos = await listAllPhotos()
    const queueStats = await getQueueStats()

    let storageUsage = 0
    let storageQuota = 0
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      storageUsage = estimate.usage || 0
      storageQuota = estimate.quota || 0
    }

    const stuckCount = calculateStuckCount(photos)

    const diagnostics: DiagnosticsJSON = {
      app_version: APP_VERSION,
      commit_hash: COMMIT_HASH,
      timestamp: new Date().toISOString(),
      is_online: navigator.onLine,
      queue_stats: {
        pending: queueStats.pending,
        uploading: queueStats.uploading,
        uploaded: queueStats.uploaded,
        failed: queueStats.failed,
        stuck: stuckCount,
      },
      recent_items: photos.slice(0, 50).map((p) => ({
        id: p.id,
        status: p.status,
        attempts: p.attempts,
        last_error: p.last_error || null,
        captured_at: p.taken_at,
        uploaded_at: p.uploaded_at || null,
      })),
      storage_estimate: {
        usage_bytes: storageUsage,
        quota_bytes: storageQuota,
      },
    }

    // Add stress test results if available
    if (stressTest.status !== 'idle') {
      diagnostics.stress_test = {
        status: stressTest.status,
        count: stressTest.count,
        p95_ms: Math.round(stressTest.p95),
        errors: stressTest.errors,
        duration_ms: (stressTest.endTime || Date.now()) - (stressTest.startTime || Date.now()),
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      console.log('📋 Diagnostics JSON copied to clipboard')
      console.log(diagnostics)
    } catch (e) {
      console.error('Failed to copy diagnostics:', e)
      // Fallback: log to console
      console.log('Diagnostics JSON (copy manually):')
      console.log(JSON.stringify(diagnostics, null, 2))
      alert('Failed to copy. Check console for diagnostics JSON.')
    }
  }

  // Retry all failed
  const handleRetryAll = async () => {
    setIsRetrying(true)
    try {
      await uploadQueue.retryAllFailed()
      await refreshStats()
    } finally {
      setIsRetrying(false)
    }
  }

  // Dump queue to console
  const handleDumpQueue = async () => {
    const photos = await listAllPhotos()
    console.group('📸 Queue Dump')
    console.log('Total photos:', photos.length)
    console.log('By status:', {
      pending: photos.filter((p) => p.status === 'pending').length,
      uploading: photos.filter((p) => p.status === 'uploading').length,
      uploaded: photos.filter((p) => p.status === 'uploaded').length,
      failed: photos.filter((p) => p.status === 'failed').length,
    })
    console.table(
      photos.map((p) => ({
        id: p.id.slice(0, 8),
        status: p.status,
        upload_state: p.upload_state,
        capture_state: p.capture_state,
        taken_at: p.taken_at,
        job_id: p.job_id?.slice(0, 8),
        error: p.last_error?.slice(0, 50),
      }))
    )
    console.groupEnd()
    alert('Queue dumped to console (F12)')
  }

  // Don't render in production
  if (!isDev) return null

  return (
    <div className="fixed bottom-20 left-2 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded-lg text-xs font-mono shadow-lg"
      >
        <Bug className="w-3 h-3" />
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        {stats && (
          <span className="ml-1">
            {stats.pending}/{stats.uploading}/{stats.failed}
            {stats.stuckCount > 0 && <span className="text-red-600 ml-1">⚠{stats.stuckCount}</span>}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && stats && (
        <div className="mt-1 bg-gray-900 border border-yellow-500/50 rounded-lg p-3 text-xs font-mono text-white w-72 shadow-xl max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-500 font-bold">Queue Debug</span>
            <div className="flex items-center gap-1">
              {stats.isOnline ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <button onClick={refreshStats} className="p-1 hover:bg-gray-800 rounded">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total:</span>
              <span>{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pending:</span>
              <span className="text-yellow-400">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uploading:</span>
              <span className="text-blue-400">{stats.uploading}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uploaded:</span>
              <span className="text-green-400">{stats.uploaded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Failed:</span>
              <span className="text-red-400">{stats.failed}</span>
            </div>
            {/* Stuck detector (3.1) */}
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Stuck:
              </span>
              <span className={stats.stuckCount > 0 ? 'text-red-500 font-bold' : 'text-gray-500'}>
                {stats.stuckCount}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
              <span className="text-gray-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                Storage:
              </span>
              <span>{stats.storageUsageMB} / {stats.storageQuotaMB} MB</span>
            </div>
          </div>

          {/* Last error */}
          {stats.lastError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded p-2 mb-3 text-red-300">
              <div className="text-[10px] text-red-400 mb-1">
                Last Error ({stats.lastErrorTime?.slice(11, 19)}):
              </div>
              <div className="truncate">{stats.lastError}</div>
            </div>
          )}

          {/* 30-Shot Stress Test (方案 A) */}
          <div className="border border-gray-700 rounded p-2 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-[10px]">30-Shot Stress Test</span>
              {stressTest.status === 'passed' && (
                <span className="text-green-500 text-[10px]">✅ PASSED</span>
              )}
              {stressTest.status === 'failed' && (
                <span className="text-red-500 text-[10px]">❌ FAILED</span>
              )}
            </div>

            {stressTest.status === 'running' ? (
              <div className="text-center py-2">
                <div className="text-blue-400 mb-1">
                  Running... {stressTest.count}/30
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(stressTest.count / 30) * 100}%` }}
                  />
                </div>
              </div>
            ) : stressTest.status !== 'idle' ? (
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Saved:</span>
                  <span>{stressTest.count}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">p95:</span>
                  <span className={stressTest.p95 < 100 ? 'text-green-400' : 'text-red-400'}>
                    {stressTest.p95.toFixed(1)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Errors:</span>
                  <span className={stressTest.errors.length === 0 ? 'text-green-400' : 'text-red-400'}>
                    {stressTest.errors.length}
                  </span>
                </div>
              </div>
            ) : null}

            <button
              onClick={runStressTest}
              disabled={stressTest.status === 'running'}
              className="w-full mt-2 flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 py-1.5 rounded text-[10px]"
            >
              <Play className="w-3 h-3" />
              Run 30-shot Test
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={handleRetryAll}
              disabled={isRetrying || stats.failed === 0}
              className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 py-1.5 rounded text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry
            </button>
            <button
              onClick={handleDumpQueue}
              className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 px-2 py-1.5 rounded text-[10px]"
            >
              <Download className="w-3 h-3" />
            </button>
            {/* Export Diagnostics (3.2) */}
            <button
              onClick={exportDiagnostics}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] ${
                copySuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              <Copy className="w-3 h-3" />
              {copySuccess ? 'Copied!' : 'Export JSON'}
            </button>
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-gray-700 text-[9px] text-gray-500">
            P/U/F = Pending/Uploading/Failed | Stuck = uploading &gt;60s
          </div>
        </div>
      )}
    </div>
  )
}
