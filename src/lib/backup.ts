import type { Memory, Note, Photo, Settings } from '../types';
import { store } from './db';
import { today } from './date';

interface SerializedPhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string;
  thumb: string;
}

interface BackupFile {
  app: 'bong-memories';
  version: 1;
  exportedAt: number;
  settings?: Settings;
  memories: Memory[];
  notes: Note[];
  photos: SerializedPhoto[];
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function dataUrlToBlob(s: string): Promise<Blob> {
  return (await fetch(s)).blob();
}

export async function exportBackup(): Promise<void> {
  const [memories, notes, photos, settings] = await Promise.all([
    store.allMemories(),
    store.allNotes(),
    store.allPhotos(),
    store.getSettings(),
  ]);
  const data: BackupFile = {
    app: 'bong-memories',
    version: 1,
    exportedAt: Date.now(),
    settings,
    memories,
    notes,
    photos: await Promise.all(
      photos.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })),
    ),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bong-ki-niem-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nhập bản sao lưu — gộp với dữ liệu hiện có (trùng id thì ghi đè). */
export async function importBackup(file: File): Promise<{ memories: number; notes: number; photos: number }> {
  const data = JSON.parse(await file.text()) as BackupFile;
  if (data?.app !== 'bong-memories' || !Array.isArray(data.memories)) {
    throw new Error('File không phải bản sao lưu của Bông');
  }
  for (const p of data.photos ?? []) {
    await store.putPhoto({ ...p, blob: await dataUrlToBlob(p.blob), thumb: await dataUrlToBlob(p.thumb) });
  }
  for (const m of data.memories) await store.putMemory(m);
  for (const n of data.notes ?? []) await store.putNote(n);
  if (data.settings) await store.putSettings(data.settings);
  return { memories: data.memories.length, notes: data.notes?.length ?? 0, photos: data.photos?.length ?? 0 };
}
