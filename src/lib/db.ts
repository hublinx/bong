import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Memory, Note, Photo, Settings } from '../types';

interface BongDB extends DBSchema {
  memories: { key: string; value: Memory };
  notes: { key: string; value: Note };
  photos: { key: string; value: Photo };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<BongDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<BongDB>('bong-memories', 1, {
      upgrade(d) {
        d.createObjectStore('memories', { keyPath: 'id' });
        d.createObjectStore('notes', { keyPath: 'id' });
        d.createObjectStore('photos', { keyPath: 'id' });
        d.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export const store = {
  async allMemories() {
    return (await db()).getAll('memories');
  },
  async putMemory(m: Memory) {
    await (await db()).put('memories', m);
  },
  async deleteMemory(id: string) {
    const d = await db();
    const m = await d.get('memories', id);
    const tx = d.transaction(['memories', 'photos'], 'readwrite');
    await tx.objectStore('memories').delete(id);
    for (const pid of m?.photoIds ?? []) await tx.objectStore('photos').delete(pid);
    await tx.done;
  },

  async allNotes() {
    return (await db()).getAll('notes');
  },
  async putNote(n: Note) {
    await (await db()).put('notes', n);
  },
  async deleteNote(id: string) {
    await (await db()).delete('notes', id);
  },

  async getPhoto(id: string) {
    return (await db()).get('photos', id);
  },
  async allPhotos() {
    return (await db()).getAll('photos');
  },
  async putPhoto(p: Photo) {
    await (await db()).put('photos', p);
  },
  async deletePhotos(ids: string[]) {
    if (!ids.length) return;
    const tx = (await db()).transaction('photos', 'readwrite');
    for (const id of ids) await tx.store.delete(id);
    await tx.done;
  },

  async getSettings(): Promise<Settings | undefined> {
    return (await (await db()).get('meta', 'settings')) as Settings | undefined;
  },
  async putSettings(s: Settings) {
    await (await db()).put('meta', s, 'settings');
  },

  async clearAll() {
    const d = await db();
    const tx = d.transaction(['memories', 'notes', 'photos', 'meta'], 'readwrite');
    await Promise.all([
      tx.objectStore('memories').clear(),
      tx.objectStore('notes').clear(),
      tx.objectStore('photos').clear(),
      tx.objectStore('meta').clear(),
    ]);
    await tx.done;
  },
};

/** Xin trình duyệt giữ dữ liệu lâu dài (không tự xoá khi thiếu dung lượng). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* không hỗ trợ — bỏ qua */
  }
}
