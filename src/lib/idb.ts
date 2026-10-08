import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface Schema extends DBSchema {
  kv: { key: string; value: unknown };
  blobs: { key: string; value: Blob };
}

let p: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!p) {
    p = openDB<Schema>('bong', 1, {
      upgrade(d) {
        d.createObjectStore('kv');
        d.createObjectStore('blobs');
      },
    });
  }
  return p;
}

export const kv = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await (await db()).get('kv', key)) as T | undefined;
  },
  async set(key: string, value: unknown) {
    await (await db()).put('kv', value, key);
  },
};

export const blobs = {
  async get(key: string) {
    return (await db()).get('blobs', key);
  },
  async set(key: string, b: Blob) {
    await (await db()).put('blobs', b, key);
  },
  async del(keys: string[]) {
    const tx = (await db()).transaction('blobs', 'readwrite');
    await Promise.all(keys.map((k) => tx.store.delete(k)));
    await tx.done;
  },
  async clear() {
    const d = await db();
    await Promise.all([d.clear('blobs'), d.clear('kv')]);
  },
};

/** Xin trình duyệt giữ dữ liệu lâu dài (không tự xoá khi thiếu dung lượng). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* không hỗ trợ */
  }
}
