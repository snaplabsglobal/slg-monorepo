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
  const normalized = { ...transaction, id: String(transaction.id) }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite')
    const store = tx.objectStore(STORE_TRANSACTIONS)
    store.put(normalized)
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
      const v = req.result as (CachedTransaction & { _schema_v?: number }) | undefined
      db.close()
      if (!v) {
        resolve(undefined)
        return
      }
      if (v._schema_v != null && v._schema_v !== 1) {
        resolve(undefined)
        return
      }
      resolve(v as CachedTransaction)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    return Number.isNaN(n) ? null : n
  }
  return null
}

function normalizeDate(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string' && v.length >= 10) return v.substring(0, 10)
  if (typeof v === 'string') return v
  return null
}

/** Minimal whitelisted fields for offline detail rendering; no spread of full input. */
export function toTransactionSummary(input: unknown): CachedTransaction | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const id = o.id != null ? String(o.id) : ''
  if (!id) return null

  const attachments = o.attachments
  const firstAttachmentUrl =
    Array.isArray(attachments) &&
    attachments[0] != null &&
    typeof attachments[0] === 'object' &&
    'url' in (attachments[0] as object)
      ? (attachments[0] as { url?: string }).url ?? null
      : null

  const td =
    o.tax_details != null && typeof o.tax_details === 'object'
      ? (o.tax_details as Record<string, unknown>)
      : null
  const gstVal =
    td?.gst_amount != null
      ? toNum(td.gst_amount)
      : td?.gst_cents != null
        ? (toNum(td.gst_cents) ?? 0) / 100
        : null
  const pstVal =
    td?.pst_amount != null
      ? toNum(td.pst_amount)
      : td?.pst_cents != null
        ? (toNum(td.pst_cents) ?? 0) / 100
        : null

  return {
    id,
    vendor_name: o.vendor_name ?? o.vendor ?? o.merchant ?? null,
    transaction_date: normalizeDate(o.transaction_date ?? o.date),
    total_amount: toNum(o.total_amount ?? o.total ?? o.amount),
    gst: gstVal != null ? +Number(gstVal).toFixed(2) : null,
    pst: pstVal != null ? +Number(pstVal).toFixed(2) : null,
    attachment_url:
      o.attachment_url ?? o.receipt_url ?? o.image_url ?? o.r2_url ?? firstAttachmentUrl ?? null,
    project_id: o.project_id ?? null,
    organization_id: o.organization_id ?? null,
    updated_at: o.updated_at ?? null,
    deleted_at: o.deleted_at ?? null,
    _schema_v: 1,
    _cached_at: Date.now(),
  } as CachedTransaction
}
