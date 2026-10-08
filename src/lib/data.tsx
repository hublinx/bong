import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyDoc, type Author, type Doc, type Memory, type Moment, type Note, type PhotoMeta, type Settings, type Timeline } from '../types';
import type { Backend, LibraryPhoto, PhotoFolder } from './backend/types';
import type { Profile } from './google';
import type { ProcessedPhoto } from './image';
import { uid } from './id';
import { requestPersistence } from './idb';

export type SyncState = 'idle' | 'saving' | 'error';

interface DataCtx {
  ready: boolean;
  loadError: string;
  doc: Doc;
  backend: Backend;
  me: Author;
  profile: Profile;
  sync: SyncState;
  library: LibraryPhoto[] | null;
  refreshLibrary: () => Promise<void>;
  upload: (p: ProcessedPhoto, folder: PhotoFolder) => Promise<PhotoMeta>;
  saveMemory: (m: Memory, removedPhotoIds?: string[]) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  saveTimeline: (t: Timeline) => Promise<void>;
  deleteTimeline: (id: string) => Promise<void>;
  saveNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addMoment: (photo: PhotoMeta, caption: string) => Promise<Moment>;
  reactMoment: (id: string, emoji: string | null) => Promise<void>;
  deleteMoment: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const byDateDesc = (a: Memory, b: Memory) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

function photosOf(d: Doc, ids: string[]) {
  // chỉ xoá ảnh khi không còn chỗ nào khác dùng tới
  const used = new Set<string>();
  d.memories.forEach((m) => m.photoIds.forEach((p) => used.add(p)));
  d.moments.forEach((m) => used.add(m.photoId));
  d.timelines.forEach((t) => t.coverPhotoId && used.add(t.coverPhotoId));
  return ids.filter((id) => !used.has(id));
}

export function DataProvider({
  backend,
  profile,
  onError,
  children,
}: {
  backend: Backend;
  profile: Profile;
  onError: (msg: string) => void;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [doc, setDoc] = useState<Doc>(emptyDoc);
  const [sync, setSync] = useState<SyncState>('idle');
  const [library, setLibrary] = useState<LibraryPhoto[] | null>(null);
  const pending = useRef(0);
  const uploaded = useRef(new Map<string, PhotoMeta>());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const me = useMemo<Author>(() => ({ email: profile.email, name: profile.givenName }), [profile]);

  const reload = useCallback(async () => {
    try {
      setLoadError('');
      const d = await backend.loadDoc();
      d.memories.sort(byDateDesc);
      setDoc(d);
      setReady(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Không tải được dữ liệu');
    }
  }, [backend]);

  /** Cập nhật ngay trên giao diện, rồi lưu lên nơi lưu trữ. */
  const commit = useCallback(
    async (fn: (d: Doc) => void) => {
      const wrapped = (d: Doc) => {
        fn(d);
        d.memories.sort(byDateDesc);
      };
      setDoc((d) => {
        const n = structuredClone(d);
        wrapped(n);
        return n;
      });
      pending.current += 1;
      setSync('saving');
      try {
        const saved = await backend.mutate(wrapped);
        pending.current -= 1;
        if (pending.current === 0) {
          setDoc(saved);
          setSync('idle');
        }
      } catch (e) {
        pending.current -= 1;
        setSync('error');
        onErrorRef.current(`Chưa lưu được: ${e instanceof Error ? e.message : 'lỗi không rõ'}`);
        if (pending.current === 0) reload();
        throw e;
      }
    },
    [backend, reload],
  );

  useEffect(() => {
    reload();
    requestPersistence();
  }, [reload]);

  // ghi lại thông tin thành viên (để hiện tên, ảnh đại diện cho người kia)
  useEffect(() => {
    if (!ready || backend.kind !== 'drive') return;
    const m = doc.members[profile.email];
    if (m && m.name === profile.givenName && m.picture === profile.picture && Date.now() - m.lastSeen < 6 * 3600_000) return;
    commit((d) => {
      d.members[profile.email] = { email: profile.email, name: profile.givenName, picture: profile.picture, lastSeen: Date.now() };
    }).catch(() => {});
  }, [ready]);

  // đồng bộ định kỳ để thấy những gì người kia vừa thêm
  useEffect(() => {
    if (!ready || backend.kind !== 'drive') return;
    let alive = true;
    const tick = async () => {
      if (document.hidden || pending.current > 0) return;
      try {
        const d = await backend.poll();
        if (d && alive && pending.current === 0) {
          d.memories.sort(byDateDesc);
          setDoc(d);
        }
      } catch {
        /* thử lại lần sau */
      }
    };
    const t = setInterval(tick, 15_000);
    const onVis = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ready, backend]);

  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary(await backend.listLibrary());
    } catch (e) {
      onErrorRef.current(e instanceof Error ? e.message : 'Không tải được kho ảnh');
    }
  }, [backend]);

  const upload = useCallback(
    async (p: ProcessedPhoto, folder: PhotoFolder) => {
      const meta = await backend.uploadPhoto(p, folder);
      uploaded.current.set(meta.id, meta);
      setLibrary((l) => (l ? [{ ...meta, name: '', folder }, ...l] : l));
      return meta;
    },
    [backend],
  );

  const value = useMemo<DataCtx>(() => {
    const metaFor = (id: string): PhotoMeta | undefined => {
      const up = uploaded.current.get(id);
      if (up) return up;
      const lib = library?.find((p) => p.id === id);
      return lib && { id, width: lib.width, height: lib.height, createdAt: lib.createdAt };
    };
    const removePhotos = async (d: Doc, ids: string[]) => {
      // Trên Drive, ảnh là kho chung của hai đứa — xoá kỉ niệm không xoá ảnh khỏi Drive.
      if (backend.kind === 'drive') return;
      const gone = photosOf(d, ids);
      if (!gone.length) return;
      setLibrary((l) => l && l.filter((p) => !gone.includes(p.id)));
      await backend.deletePhotos(gone).catch(() => {});
    };
    return {
      ready,
      loadError,
      doc,
      backend,
      me,
      profile,
      sync,
      library,
      refreshLibrary,
      upload,
      reload,

      async saveMemory(m, removed = []) {
        const metas = m.photoIds.filter((id) => !doc.photos[id]);
        await commit((d) => {
          const i = d.memories.findIndex((x) => x.id === m.id);
          if (i >= 0) d.memories[i] = m;
          else d.memories.push(m);
          for (const id of metas) {
            const meta = metaFor(id);
            if (meta && !d.photos[id]) d.photos[id] = meta;
          }
          for (const id of photosOf(d, removed)) delete d.photos[id];
        });
        await removePhotos({ ...doc, memories: [...doc.memories.filter((x) => x.id !== m.id), m] }, removed);
      },
      async deleteMemory(id) {
        const m = doc.memories.find((x) => x.id === id);
        await commit((d) => {
          d.memories = d.memories.filter((x) => x.id !== id);
          for (const p of photosOf(d, m?.photoIds ?? [])) delete d.photos[p];
        });
        if (m) await removePhotos({ ...doc, memories: doc.memories.filter((x) => x.id !== id) }, m.photoIds);
      },
      async toggleFavorite(id) {
        await commit((d) => {
          const m = d.memories.find((x) => x.id === id);
          if (m) m.favorite = !m.favorite;
        });
      },
      async saveTimeline(t) {
        await commit((d) => {
          const i = d.timelines.findIndex((x) => x.id === t.id);
          if (i >= 0) d.timelines[i] = t;
          else d.timelines.push(t);
          if (t.coverPhotoId && !d.photos[t.coverPhotoId]) {
            const meta = metaFor(t.coverPhotoId);
            if (meta) d.photos[meta.id] = meta;
          }
        });
      },
      async deleteTimeline(id) {
        const mems = doc.memories.filter((m) => m.timelineId === id);
        const t = doc.timelines.find((x) => x.id === id);
        const ids = [...mems.flatMap((m) => m.photoIds), ...(t?.coverPhotoId ? [t.coverPhotoId] : [])];
        await commit((d) => {
          d.timelines = d.timelines.filter((x) => x.id !== id);
          d.memories = d.memories.filter((m) => m.timelineId !== id);
          for (const p of photosOf(d, ids)) delete d.photos[p];
        });
        await removePhotos(
          { ...doc, timelines: doc.timelines.filter((x) => x.id !== id), memories: doc.memories.filter((m) => m.timelineId !== id) },
          ids,
        );
      },
      async saveNote(n) {
        await commit((d) => {
          const i = d.notes.findIndex((x) => x.id === n.id);
          if (i >= 0) d.notes[i] = n;
          else d.notes.push(n);
        });
      },
      async deleteNote(id) {
        await commit((d) => {
          d.notes = d.notes.filter((x) => x.id !== id);
        });
      },
      async addMoment(photo, caption) {
        const mo: Moment = { id: uid(), photoId: photo.id, caption: caption.trim(), by: me, reactions: {}, createdAt: Date.now() };
        await commit((d) => {
          d.photos[photo.id] = photo;
          d.moments.push(mo);
        });
        return mo;
      },
      async reactMoment(id, emoji) {
        await commit((d) => {
          const m = d.moments.find((x) => x.id === id);
          if (!m) return;
          if (emoji) m.reactions[me.email] = emoji;
          else delete m.reactions[me.email];
        });
      },
      async deleteMoment(id) {
        const mo = doc.moments.find((x) => x.id === id);
        await commit((d) => {
          d.moments = d.moments.filter((x) => x.id !== id);
          if (mo) for (const p of photosOf(d, [mo.photoId])) delete d.photos[p];
        });
        if (mo) await removePhotos({ ...doc, moments: doc.moments.filter((x) => x.id !== id) }, [mo.photoId]);
      },
      async saveSettings(s) {
        await commit((d) => {
          d.settings = s;
        });
      },
    };
  }, [ready, loadError, doc, backend, me, profile, sync, library, refreshLibrary, upload, reload, commit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData phải nằm trong DataProvider');
  return c;
}

/** Tên hiển thị cho một tác giả, ưu tiên tên đã đặt trong cài đặt. */
export function useAuthorName() {
  const { doc } = useData();
  return useCallback(
    (a: Author | undefined) => {
      if (!a) return '';
      if (a.email === 'local' || !a.email) return a.name;
      return doc.members[a.email]?.name || a.name;
    },
    [doc.members],
  );
}
