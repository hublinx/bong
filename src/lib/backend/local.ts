import { emptyDoc, normalizeDoc, type Doc, type PhotoMeta } from '../../types';
import { uid } from '../id';
import { blobs, kv } from '../idb';
import type { ProcessedPhoto } from '../image';
import type { Backend, LibraryPhoto, PhotoFolder, PhotoSize } from './types';

const urls = new Map<string, string>();

/** Lưu mọi thứ trong IndexedDB của trình duyệt — chế độ dùng thử, không đồng bộ. */
export class LocalBackend implements Backend {
  kind = 'local' as const;
  label = 'Chỉ trên thiết bị này';
  private doc: Doc | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  async loadDoc() {
    this.doc = normalizeDoc((await kv.get('doc')) ?? emptyDoc());
    return structuredClone(this.doc);
  }

  mutate(fn: (d: Doc) => void): Promise<Doc> {
    const run = this.queue.then(async () => {
      const d = structuredClone(this.doc ?? (await this.loadDoc()));
      fn(d);
      await kv.set('doc', d);
      this.doc = d;
      return structuredClone(d);
    });
    this.queue = run.catch(() => {});
    return run;
  }

  async poll() {
    return null;
  }

  async uploadPhoto(p: ProcessedPhoto, folder: PhotoFolder): Promise<PhotoMeta> {
    const id = `${folder === 'moments' ? 'mo' : 'ph'}_${uid()}`;
    await Promise.all([blobs.set(`full:${id}`, p.full), blobs.set(`thumb:${id}`, p.thumb)]);
    return { id, width: p.width, height: p.height, createdAt: Date.now() };
  }

  async photoUrl(id: string, size: PhotoSize) {
    const key = `${size}:${id}`;
    const hit = urls.get(key);
    if (hit) return hit;
    const b = (await blobs.get(key)) ?? (await blobs.get(`full:${id}`));
    if (!b) return undefined;
    const u = URL.createObjectURL(b);
    urls.set(key, u);
    return u;
  }

  async deletePhotos(ids: string[]) {
    await blobs.del(ids.flatMap((id) => [`full:${id}`, `thumb:${id}`]));
    for (const id of ids)
      for (const s of ['full', 'thumb']) {
        const u = urls.get(`${s}:${id}`);
        if (u) URL.revokeObjectURL(u);
        urls.delete(`${s}:${id}`);
      }
  }

  async listLibrary(): Promise<LibraryPhoto[]> {
    const d = this.doc ?? (await this.loadDoc());
    return Object.values(d.photos).map((p) => ({
      id: p.id,
      name: '',
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      folder: p.id.startsWith('mo_') ? 'moments' : 'memories',
    }));
  }
}
