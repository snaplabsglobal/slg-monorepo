'use client'

import { useEffect, useMemo, useState } from 'react'
import { useOffline } from '@/app/hooks/useOffline'
import {
  listProjects,
  getProject,
  fetchAndCacheProjects,
} from '@/app/lib/offline-cache/projects'

type Project = { id: string; name?: string }

export default function ProjectsClient() {
  const isOffline = useOffline()
  const [projects, setProjects] = useState<Project[]>([])
  const [source, setSource] = useState<'api' | 'cache' | 'empty'>('empty')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)

      if (isOffline) {
        const cached = await listProjects()
        if (!alive) return
        if (cached?.length) {
          setProjects(cached)
          setSource('cache')
        } else {
          setProjects([])
          setSource('empty')
        }
        setLoading(false)
        return
      }

      try {
        const apiProjects = await fetchAndCacheProjects()
        if (!alive) return
        if (apiProjects?.length) {
          setProjects(apiProjects)
          setSource('api')
        } else {
          const cached = await listProjects()
          if (!alive) return
          setProjects(cached)
          setSource(cached?.length ? 'cache' : 'empty')
        }
      } catch {
        const cached = await listProjects()
        if (!alive) return
        setProjects(cached)
        setSource(cached?.length ? 'cache' : 'empty')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [isOffline])

  const offlineEmptyHint = useMemo(() => {
    if (!isOffline) return null
    if (loading) return null
    if (source === 'empty') {
      return (
        <div className="mt-3 rounded-lg border bg-amber-50 text-amber-900 p-3 text-sm">
          此项目数据尚未本地化，请回到有网络的地方查看。
        </div>
      )
    }
    return null
  }, [isOffline, loading, source])

  const onOpenProject = async (p: Project) => {
    if (isOffline) {
      const cached = await getProject(p.id)
      if (!cached) {
        setToast('此项目数据尚未本地化，请回到有网络的地方查看。')
        return
      }
    }
    setToast(null)
    window.location.href = `/transactions?projectId=${encodeURIComponent(p.id)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-600 mt-1">Track receipts and income by project</p>
      </div>

      {isOffline && source === 'cache' && (
        <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
          当前为离线模式：仅显示最近本地化的 {projects.length} 个项目（最多 3 个）。
        </div>
      )}

      {offlineEmptyHint}

      {toast && (
        <div className="rounded-lg border bg-red-50 text-red-800 p-3 text-sm">
          {toast}
        </div>
      )}

      <div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-gray-500">No projects</div>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border p-3 flex items-center justify-between bg-white"
              >
                <div>
                  <div className="font-medium">{p.name ?? '(Unnamed project)'}</div>
                  <div className="text-xs text-gray-500">{p.id}</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800"
                  onClick={() => onOpenProject(p)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
