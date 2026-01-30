/**
 * IndexedDB cache for transaction details (offline: show cached, no "Failed to fetch").
 */

const DB_NAME = 'ls_offline_cache'
const STORE_TRANSACTIONS = 'transactions'
const DB_VERSION = 2

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' })
      }
    }
  })
}

export type CachedTransaction = Record<string, unknown> & { id: string }

export async function putTransaction(transaction: CachedTransaction): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite')
    const store = tx.objectStore(STORE_TRANSACTIONS)
    store.put(transaction)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getTransaction(id: string): Promise<CachedTransaction | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly')
    const store = tx.objectStore(STORE_TRANSACTIONS)
    const req = store.get(id)
    req.onsuccess = () => {
      db.close()
      resolve((req.result as CachedTransaction) ?? undefined)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}
