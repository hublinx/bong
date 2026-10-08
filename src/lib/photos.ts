import { useEffect, useState } from 'react';
import { store } from './db';

export type PhotoSize = 'thumb' | 'full';

interface Entry {
  thumb?: string;
  full?: string;
  ratio?: number;
}

// Cache object URL theo id để không tạo lại mỗi lần render.
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry | undefined>>();

async function load(id: string): Promise<Entry | undefined> {
  const hit = cache.get(id);
  if (hit?.thumb && hit.full) return hit;
  let p = pending.get(id);
  if (!p) {
    p = store.getPhoto(id).then((photo) => {
      pending.delete(id);
      if (!photo) return undefined;
      const e: Entry = {
        thumb: URL.createObjectURL(photo.thumb),
        full: URL.createObjectURL(photo.blob),
        ratio: photo.width / photo.height,
      };
      cache.set(id, e);
      return e;
    });
    pending.set(id, p);
  }
  return p;
}

export function forgetPhotos(ids: string[]) {
  for (const id of ids) {
    const e = cache.get(id);
    if (e?.thumb) URL.revokeObjectURL(e.thumb);
    if (e?.full) URL.revokeObjectURL(e.full);
    cache.delete(id);
  }
}

/** Trả về object URL của ảnh (thumbnail hoặc bản đầy đủ) và tỉ lệ khung hình. */
export function usePhoto(id: string | undefined, size: PhotoSize = 'thumb') {
  const [entry, setEntry] = useState<Entry | undefined>(() => (id ? cache.get(id) : undefined));
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const hit = cache.get(id);
    if (hit) setEntry(hit);
    else {
      setEntry(undefined);
      load(id).then((e) => alive && setEntry(e));
    }
    return () => {
      alive = false;
    };
  }, [id]);
  return { url: entry?.[size], ratio: entry?.ratio };
}
