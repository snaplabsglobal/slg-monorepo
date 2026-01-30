const DB_NAME = 'ls_upload_queue'
const DB_VERSION = 1
const STORE_ITEMS = 'items'
const STORE_BLOBS = 'blobs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function idbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value as unknown as IDBValidKey)
  await txDone(tx)
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  const tx = db.transaction(store, 'readonly')
  const req = tx.objectStore(store).get(key)
  const result = await new Promise<T | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  return result
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(key)
  await txDone(tx)
}

export async function idbListAll<T>(store: string): Promise<T[]> {
  const db = await openDB()
  const tx = db.transaction(store, 'readonly')
  const req = tx.objectStore(store).getAll()
  const result = await new Promise<T[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  return result
}

export const STORES = { STORE_ITEMS, STORE_BLOBS } as const
