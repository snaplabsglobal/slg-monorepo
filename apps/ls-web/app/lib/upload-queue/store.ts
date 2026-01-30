import { idbPut, idbGet, idbDelete, idbListAll, STORES } from './idb'
import type { ReceiptQueueItem } from './types'

export async function putItem(item: ReceiptQueueItem): Promise<void> {
  await idbPut(STORES.STORE_ITEMS, item)
}

export async function getItem(id: string): Promise<ReceiptQueueItem | undefined> {
  return idbGet<ReceiptQueueItem>(STORES.STORE_ITEMS, id)
}

export async function listItems(): Promise<ReceiptQueueItem[]> {
  return idbListAll<ReceiptQueueItem>(STORES.STORE_ITEMS)
}

export async function deleteItem(id: string): Promise<void> {
  await idbDelete(STORES.STORE_ITEMS, id)
  await idbDelete(STORES.STORE_BLOBS, id)
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  await idbPut(STORES.STORE_BLOBS, { id, blob })
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const res = await idbGet<{ id: string; blob: Blob }>(STORES.STORE_BLOBS, id)
  return res?.blob
}

export async function deleteBlob(id: string): Promise<void> {
  await idbDelete(STORES.STORE_BLOBS, id)
}
