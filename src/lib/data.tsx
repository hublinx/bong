import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Memory, type Note, type Settings } from '../types';
import { requestPersistence, store } from './db';
import { forgetPhotos } from './photos';

interface DataCtx {
  ready: boolean;
  memories: Memory[];
  notes: Note[];
  settings: Settings;
  saveMemory: (m: Memory, removedPhotoIds?: string[]) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  saveNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const byDateDesc = (a: Memory, b: Memory) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    const [m, n, s] = await Promise.all([store.allMemories(), store.allNotes(), store.getSettings()]);
    setMemories(m.sort(byDateDesc));
    setNotes(n);
    setSettings({ ...DEFAULT_SETTINGS, ...s });
    setReady(true);
  }, []);

  useEffect(() => {
    reload();
    requestPersistence();
  }, [reload]);

  const saveMemory = useCallback(async (m: Memory, removedPhotoIds: string[] = []) => {
    await store.putMemory(m);
    await store.deletePhotos(removedPhotoIds);
    forgetPhotos(removedPhotoIds);
    setMemories((prev) => [...prev.filter((x) => x.id !== m.id), m].sort(byDateDesc));
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    let photoIds: string[] = [];
    setMemories((prev) => {
      photoIds = prev.find((x) => x.id === id)?.photoIds ?? [];
      return prev.filter((x) => x.id !== id);
    });
    await store.deleteMemory(id);
    forgetPhotos(photoIds);
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const m = memories.find((x) => x.id === id);
      if (!m) return;
      const next = { ...m, favorite: !m.favorite };
      setMemories((prev) => prev.map((x) => (x.id === id ? next : x)));
      await store.putMemory(next);
    },
    [memories],
  );

  const saveNote = useCallback(async (n: Note) => {
    setNotes((prev) => [...prev.filter((x) => x.id !== n.id), n]);
    await store.putNote(n);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((x) => x.id !== id));
    await store.deleteNote(id);
  }, []);

  const saveSettings = useCallback(async (s: Settings) => {
    setSettings(s);
    await store.putSettings(s);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      memories,
      notes,
      settings,
      saveMemory,
      deleteMemory,
      toggleFavorite,
      saveNote,
      deleteNote,
      saveSettings,
      reload,
    }),
    [ready, memories, notes, settings, saveMemory, deleteMemory, toggleFavorite, saveNote, deleteNote, saveSettings, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData phải nằm trong DataProvider');
  return c;
}
