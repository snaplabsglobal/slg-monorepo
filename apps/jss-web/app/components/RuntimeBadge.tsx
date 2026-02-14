'use client'

import { useState, useEffect } from 'react'

interface RuntimeInfo {
  app: string
  git_sha: string
  git_branch: string
  env: string
  vercel_env: string
  storage: {
    supabase: { url: string; isLocal: boolean; isConfigured: boolean }
    r2: { bucket: string; isConfigured: boolean; missingEnvVars: string[] }
    upload: { provider: string; ready: boolean; error: string | null }
  }
  auth: {
    supabaseConfigured: boolean
    redirectUrl: string
    supabaseProject: string
  }
  sw: { expected_version: string }
  timestamp: string
}

/**
 * RuntimeBadge - CTO Requirement A
 *
 * Shows runtime truth in bottom-left corner:
 * - Click to expand full diagnostics
 * - 3-second glance: know what mode you're in
 * - Color-coded status (green = OK, yellow = warning, red = error)
 */
export function RuntimeBadge() {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swVersion, setSwVersion] = useState<string>('checking...')

  useEffect(() => {
    // Fetch runtime info
    fetch('/api/runtime')
      .then(res => res.json())
      .then(data => setRuntime(data))
      .catch(err => setError(err.message))

    // Check SW version
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        // Try to get version from SW
        if (reg.active) {
          const channel = new MessageChannel()
          channel.port1.onmessage = (event) => {
            if (event.data?.version) {
              setSwVersion(event.data.version)
            }
          }
          reg.active.postMessage({ type: 'GET_VERSION' }, [channel.port2])
          // Timeout fallback
          setTimeout(() => {
            setSwVersion(prev => prev === 'checking...' ? 'unknown' : prev)
          }, 1000)
        }
      }).catch(() => setSwVersion('not registered'))
    } else {
      setSwVersion('not supported')
    }
  }, [])

  if (error) {
    return (
      <div className="fixed bottom-2 left-2 z-50 bg-red-600 text-white text-xs px-2 py-1 rounded">
        Runtime Error: {error}
      </div>
    )
  }

  if (!runtime) {
    return (
      <div className="fixed bottom-2 left-2 z-50 bg-gray-600 text-white text-xs px-2 py-1 rounded animate-pulse">
        Loading...
      </div>
    )
  }

  // Determine overall status
  const uploadOk = runtime.storage.upload.ready
  const authOk = runtime.auth.supabaseConfigured
  const allOk = uploadOk && authOk

  const statusColor = allOk ? 'bg-green-600' : uploadOk || authOk ? 'bg-yellow-600' : 'bg-red-600'
  const envLabel = runtime.vercel_env === 'local' ? 'LOCAL' : runtime.vercel_env.toUpperCase()

  return (
    <div className="fixed bottom-2 left-2 z-50">
      {/* Collapsed badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`${statusColor} text-white text-xs px-2 py-1 rounded font-mono flex items-center gap-2 hover:opacity-90 transition-opacity`}
      >
        <span className={`w-2 h-2 rounded-full ${allOk ? 'bg-green-300' : 'bg-red-300'} animate-pulse`} />
        <span>{envLabel}</span>
        <span className="text-white/70">{runtime.git_sha}</span>
        <span className="text-white/70">|</span>
        <span>{runtime.storage.upload.provider}</span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-4 w-80 font-mono">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-bold">Runtime Truth</span>
            <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>

          {/* Identity */}
          <Section title="Identity">
            <Row label="App" value={runtime.app} />
            <Row label="Branch" value={runtime.git_branch} />
            <Row label="SHA" value={runtime.git_sha} />
            <Row label="Env" value={`${runtime.env} / ${runtime.vercel_env}`} />
          </Section>

          {/* Storage */}
          <Section title="Storage">
            <Row
              label="Upload Provider"
              value={runtime.storage.upload.provider}
              status={runtime.storage.upload.ready ? 'ok' : 'error'}
            />
            <Row
              label="R2 Bucket"
              value={runtime.storage.r2.bucket}
              status={runtime.storage.r2.isConfigured ? 'ok' : 'error'}
            />
            {runtime.storage.upload.error && (
              <div className="text-red-400 text-[10px] mt-1 break-all">
                {runtime.storage.upload.error}
              </div>
            )}
          </Section>

          {/* Auth */}
          <Section title="Auth">
            <Row
              label="Supabase"
              value={runtime.auth.supabaseProject}
              status={runtime.auth.supabaseConfigured ? 'ok' : 'error'}
            />
            <Row label="Redirect" value={runtime.auth.redirectUrl || 'NOT_SET'} />
          </Section>

          {/* Service Worker */}
          <Section title="Service Worker">
            <Row label="Expected" value={runtime.sw.expected_version} />
            <Row label="Actual" value={swVersion} />
          </Section>

          <div className="text-gray-500 text-[10px] mt-3">
            Updated: {new Date(runtime.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: 'ok' | 'warn' | 'error'
}) {
  const statusColors = {
    ok: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  }

  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className={status ? statusColors[status] : 'text-white'}>{value}</span>
    </div>
  )
}
