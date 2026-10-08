import { useCallback, useEffect, useState } from 'react';
import type { Backend, PhotoSize } from './backend/types';
import { useData } from './data';

// Bộ nhớ đệm URL theo backend để không phải hỏi lại mỗi lần render.
const caches = new WeakMap<Backend, Map<string, string>>();

function cacheOf(b: Backend) {
  let c = caches.get(b);
  if (!c) caches.set(b, (c = new Map()));
  return c;
}

/** Trả về URL ảnh và hàm báo lỗi (để thử nguồn dự phòng). */
export function usePhoto(id: string | undefined, size: PhotoSize = 'thumb') {
  const { backend, doc } = useData();
  const key = `${size}:${id}`;
  const cache = cacheOf(backend);
  const [url, setUrl] = useState<string | undefined>(() => (id ? cache.get(key) : undefined));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setFailed(false);
    const hit = cache.get(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(undefined);
    backend.photoUrl(id, size).then((u) => {
      if (!alive || !u) return;
      cache.set(key, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id, key, backend, size, cache]);

  const onError = useCallback(() => {
    if (!id || failed) return;
    setFailed(true);
    cache.delete(key);
    backend.photoUrl(id, size, true).then((u) => {
      if (!u) return;
      cache.set(key, u);
      setUrl(u);
    });
  }, [id, failed, key, backend, size, cache]);

  const meta = id ? doc.photos[id] : undefined;
  return { url, onError, ratio: meta ? meta.width / meta.height : undefined };
}
