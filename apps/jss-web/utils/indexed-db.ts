import { openDB, DBSchema } from 'idb';

interface JSSDB extends DBSchema {
  uploadQueue: {
    key: string;
    value: {
      id: string;
      fileBlob: Blob;
      projectId: string;
      caption?: string;
      createdAt: number;
    };
  };
}

const DB_NAME = 'jss-offline-db';
const STORE_NAME = 'uploadQueue';

export async function initDB() {
  return openDB<JSSDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function savePendingUpload(file: Blob, projectId: string, caption?: string) {
  const db = await initDB();
  const id = crypto.randomUUID();
  await db.put(STORE_NAME, {
    id,
    fileBlob: file,
    projectId,
    caption,
    createdAt: Date.now(),
  });
  console.log('Saved to Offline DB:', id);
  return id;
}

export async function getPendingUploads() {
  const db = await initDB();
  return await db.getAll(STORE_NAME);
}

export async function removePendingUpload(id: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}
