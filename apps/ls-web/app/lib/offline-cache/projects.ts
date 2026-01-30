/**
 * CTO#1: Projects cache for offline - last 3 projects (LRU) in IndexedDB.
 * Online: after loading projects/list or project detail, write summary to IDB.
 * Offline: read from IDB; if project not cached, show "此项目数据尚未本地化..."
 */

const DB_NAME = 'ls_offline_cache'
const STORE_PROJECTS = 'projects'
const MAX_PROJECTS = 3

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' })
      }
    }
  })
}

export type CachedProject = {
  id: string
  name: string
  updatedAt: number
}

export async function putProject(project: CachedProject): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite')
    const store = tx.objectStore(STORE_PROJECTS)
    store.put({ ...project, updatedAt: Date.now() })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function listProjects(): Promise<CachedProject[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly')
    const store = tx.objectStore(STORE_PROJECTS)
    const req = store.getAll()
    req.onsuccess = () => {
      const list = (req.result as (CachedProject & { updatedAt: number })[])
        .sort((a, b) => b.updatedAt - a.updatedAt)
      db.close()
      resolve(list.slice(0, MAX_PROJECTS))
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function getProject(id: string): Promise<CachedProject | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly')
    const store = tx.objectStore(STORE_PROJECTS)
    const req = store.get(id)
    req.onsuccess = () => {
      db.close()
      resolve(req.result ?? undefined)
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** After fetching projects from API, cache up to MAX_PROJECTS (LRU by updatedAt). */
export async function cacheProjectsFromApi(projects: { id: string; name?: string }[]): Promise<void> {
  const now = Date.now()
  for (const p of projects.slice(0, MAX_PROJECTS)) {
    await putProject({ id: p.id, name: p.name ?? 'Unnamed', updatedAt: now })
  }
}

/** Fetch projects from API, write to IDB (LRU 3), and return list for rendering. */
export async function fetchAndCacheProjects(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/projects', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Projects API ${res.status}`)
  const json = await res.json()
  const list = (json?.projects ?? []).map((p: { id: string; name?: string }) => ({
    id: p.id,
    name: p.name ?? 'Unnamed',
  }))
  await cacheProjectsFromApi(list)
  return list
}
