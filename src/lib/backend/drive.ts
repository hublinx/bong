import { emptyDoc, normalizeDoc, type Doc, type PhotoMeta } from '../../types';
import { gfetch, HttpError } from '../google';
import { blobs } from '../idb';
import type { ProcessedPhoto } from '../image';
import type { Backend, FolderAlbum, FolderPhoto, LibraryPhoto, PhotoFolder, PhotoSize, SpaceMember } from './types';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';

export const DATA_FILE = 'bong-data.json';
const SPACE_NAME = 'Tôi & Bông ♡';
const FOLDER_NAMES: Record<PhotoFolder, string> = { memories: 'Ảnh kỉ niệm', moments: 'Khoảnh khắc' };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  return (await gfetch(url, init)).json();
}

function multipart(meta: object, body: Blob) {
  const b = `bong${Math.random().toString(36).slice(2)}`;
  return {
    headers: { 'Content-Type': `multipart/related; boundary=${b}` },
    body: new Blob([
      `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${body.type || 'application/octet-stream'}\r\n\r\n`,
      body,
      `\r\n--${b}--`,
    ]),
  };
}

/** "2024:09:20 10:11:12" (EXIF) → timestamp theo giờ máy */
function exifTime(s?: string) {
  const m = s && /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return undefined;
  const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return Number.isNaN(t) ? undefined : t;
}

export interface SpaceCandidate {
  fileId: string;
  folderId: string;
  ownedByMe: boolean;
  ownerName: string;
  ownerEmail: string;
  modifiedTime: string;
}

/** Tìm các không gian (file dữ liệu) mà tài khoản này sở hữu hoặc được chia sẻ. */
export async function findSpaces(): Promise<SpaceCandidate[]> {
  const r = await json<{ files: { id: string; parents?: string[]; ownedByMe: boolean; owners?: { displayName: string; emailAddress: string }[]; modifiedTime: string }[] }>(
    `${API}/files?` +
      new URLSearchParams({
        q: `name = '${DATA_FILE}' and trashed = false`,
        fields: 'files(id,parents,ownedByMe,owners(displayName,emailAddress),modifiedTime)',
        pageSize: '20',
        orderBy: 'modifiedTime desc',
      }),
  );
  return r.files
    .filter((f) => f.parents?.length)
    .map((f) => ({
      fileId: f.id,
      folderId: f.parents![0],
      ownedByMe: f.ownedByMe,
      ownerName: f.owners?.[0]?.displayName ?? '',
      ownerEmail: f.owners?.[0]?.emailAddress ?? '',
      modifiedTime: f.modifiedTime,
    }));
}

async function createFolder(name: string, parent?: string): Promise<string> {
  const r = await json<{ id: string }>(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined }),
  });
  return r.id;
}

/** Tạo không gian mới trong Drive của người đang đăng nhập. */
export async function createSpace(initial: Doc = emptyDoc()): Promise<SpaceCandidate> {
  const folderId = await createFolder(SPACE_NAME);
  await Promise.all([createFolder(FOLDER_NAMES.memories, folderId), createFolder(FOLDER_NAMES.moments, folderId)]);
  const m = multipart(
    { name: DATA_FILE, parents: [folderId], mimeType: 'application/json', description: 'Dữ liệu của app Tôi & Bông — đừng xoá nhé' },
    new Blob([JSON.stringify(initial)], { type: 'application/json' }),
  );
  const f = await json<{ id: string }>(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', ...m });
  return { fileId: f.id, folderId, ownedByMe: true, ownerName: '', ownerEmail: '', modifiedTime: new Date().toISOString() };
}

interface ThumbEntry {
  link: string;
  at: number;
}

export class DriveBackend implements Backend {
  kind = 'drive' as const;
  label = `Google Drive · ${SPACE_NAME}`;
  folderUrl: string;
  private version = '';
  private doc: Doc | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private folders: Partial<Record<PhotoFolder, string>> = {};
  private thumbs = new Map<string, ThumbEntry>();
  private objectUrls = new Map<string, string>();
  private primed: Promise<unknown> | null = null;

  constructor(private space: SpaceCandidate) {
    this.folderUrl = `https://drive.google.com/drive/folders/${space.folderId}`;
  }

  private async fetchDoc() {
    const [meta, body] = await Promise.all([
      json<{ version: string }>(`${API}/files/${this.space.fileId}?fields=version`),
      gfetch(`${API}/files/${this.space.fileId}?alt=media`).then((r) => r.text()),
    ]);
    let parsed: unknown = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      throw new Error('File dữ liệu trên Drive bị hỏng');
    }
    this.version = meta.version;
    this.doc = normalizeDoc(parsed ?? emptyDoc());
    return this.doc;
  }

  async loadDoc() {
    return structuredClone(await this.fetchDoc());
  }

  mutate(fn: (d: Doc) => void): Promise<Doc> {
    const run = this.queue.then(async () => {
      // luôn sửa trên bản mới nhất để không ghi đè thay đổi của người kia
      const { version } = await json<{ version: string }>(`${API}/files/${this.space.fileId}?fields=version`);
      if (version !== this.version || !this.doc) await this.fetchDoc();
      const d = structuredClone(this.doc!);
      fn(d);
      const r = await json<{ version: string }>(`${UPLOAD}/files/${this.space.fileId}?uploadType=media&fields=version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      this.version = r.version;
      this.doc = d;
      return structuredClone(d);
    });
    this.queue = run.catch(() => {});
    return run;
  }

  async poll() {
    const { version } = await json<{ version: string }>(`${API}/files/${this.space.fileId}?fields=version`);
    if (version === this.version) return null;
    return structuredClone(await this.fetchDoc());
  }

  private async folder(kind: PhotoFolder): Promise<string> {
    if (this.folders[kind]) return this.folders[kind]!;
    const r = await json<{ files: { id: string; name: string }[] }>(
      `${API}/files?` +
        new URLSearchParams({
          q: `'${this.space.folderId}' in parents and mimeType = '${FOLDER}' and trashed = false`,
          fields: 'files(id,name)',
        }),
    );
    for (const f of r.files) {
      const k = (Object.keys(FOLDER_NAMES) as PhotoFolder[]).find((x) => FOLDER_NAMES[x] === f.name);
      if (k && !this.folders[k]) this.folders[k] = f.id;
    }
    if (!this.folders[kind]) this.folders[kind] = await createFolder(FOLDER_NAMES[kind], this.space.folderId);
    return this.folders[kind]!;
  }

  async uploadPhoto(p: ProcessedPhoto, kind: PhotoFolder): Promise<PhotoMeta> {
    const parent = await this.folder(kind);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const m = multipart({ name: `${kind === 'moments' ? 'khoanh-khac' : 'ki-niem'}-${stamp}.jpg`, parents: [parent] }, p.full);
    const f = await json<{ id: string }>(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', ...m });
    // giữ bản sao cục bộ để hiện ngay, trong lúc Drive còn đang tạo thumbnail
    await Promise.all([blobs.set(`full:${f.id}`, p.full), blobs.set(`thumb:${f.id}`, p.thumb)]).catch(() => {});
    return { id: f.id, width: p.width, height: p.height, createdAt: Date.now() };
  }

  private remember(id: string, link?: string) {
    if (link) this.thumbs.set(id, { link, at: Date.now() });
  }

  private async localUrl(key: string) {
    const hit = this.objectUrls.get(key);
    if (hit) return hit;
    const b = await blobs.get(key).catch(() => undefined);
    if (!b) return undefined;
    const u = URL.createObjectURL(b);
    this.objectUrls.set(key, u);
    return u;
  }

  async photoUrl(id: string, size: PhotoSize, fallback = false) {
    const local = await this.localUrl(`${size}:${id}`);
    if (local) return local;
    if (!fallback) {
      // một lần liệt kê cả thư mục rẻ hơn nhiều so với hỏi từng ảnh
      if (!this.primed) this.primed = this.listLibrary().catch(() => {});
      await this.primed;
      let t = this.thumbs.get(id);
      if (!t || Date.now() - t.at > 45 * 60_000) {
        try {
          const f = await json<{ thumbnailLink?: string }>(`${API}/files/${id}?fields=thumbnailLink`);
          this.remember(id, f.thumbnailLink);
          t = this.thumbs.get(id);
        } catch {
          t = undefined;
        }
      }
      if (t) return t.link.replace(/=s\d+(-[a-z0-9-]+)?$/, '') + (size === 'thumb' ? '=s720' : '=s2400');
    }
    // dự phòng: tải thẳng file gốc
    try {
      const b = await (await gfetch(`${API}/files/${id}?alt=media`)).blob();
      if (b.size < 4_000_000) blobs.set(`full:${id}`, b).catch(() => {});
      const u = URL.createObjectURL(b);
      this.objectUrls.set(`full:${id}`, u);
      return u;
    } catch {
      return undefined;
    }
  }

  async deletePhotos(ids: string[]) {
    await blobs.del(ids.flatMap((id) => [`full:${id}`, `thumb:${id}`])).catch(() => {});
    await Promise.all(
      ids.map((id) =>
        gfetch(`${API}/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trashed: true }),
        }).catch((e) => {
          // người không sở hữu file thì không xoá được — bỏ qua
          if (!(e instanceof HttpError)) throw e;
        }),
      ),
    );
  }

  async listLibrary(): Promise<LibraryPhoto[]> {
    const [mem, mom] = await Promise.all([this.folder('memories'), this.folder('moments')]);
    const out: LibraryPhoto[] = [];
    let pageToken = '';
    do {
      const r = await json<{
        nextPageToken?: string;
        files: {
          id: string;
          name: string;
          parents?: string[];
          thumbnailLink?: string;
          createdTime: string;
          imageMediaMetadata?: { width?: number; height?: number; rotation?: number; time?: string };
        }[];
      }>(
        `${API}/files?` +
          new URLSearchParams({
            q: `('${mem}' in parents or '${mom}' in parents) and mimeType contains 'image/' and trashed = false`,
            fields: 'nextPageToken,files(id,name,parents,thumbnailLink,createdTime,imageMediaMetadata(width,height,rotation,time))',
            pageSize: '1000',
            orderBy: 'createdTime desc',
            ...(pageToken ? { pageToken } : {}),
          }),
      );
      for (const f of r.files) {
        this.remember(f.id, f.thumbnailLink);
        const md = f.imageMediaMetadata ?? {};
        const rotated = md.rotation === 1 || md.rotation === 3;
        out.push({
          id: f.id,
          name: f.name,
          width: (rotated ? md.height : md.width) ?? 4,
          height: (rotated ? md.width : md.height) ?? 5,
          createdAt: Date.parse(f.createdTime),
          folder: f.parents?.includes(mom) ? 'moments' : 'memories',
        });
      }
      pageToken = r.nextPageToken ?? '';
    } while (pageToken);
    return out;
  }

  async listFolder(folderId: string): Promise<FolderAlbum> {
    let root: { name: string; mimeType: string };
    try {
      root = await json(`${API}/files/${folderId}?fields=name,mimeType&supportsAllDrives=true`);
    } catch (e) {
      if (e instanceof HttpError && (e.status === 404 || e.status === 403))
        throw new Error('Không mở được thư mục này — có thể tài khoản của bạn chưa được chia sẻ quyền xem.');
      throw e;
    }
    if (root.mimeType !== FOLDER) throw new Error('Link này không phải một thư mục Google Drive.');

    const photos: FolderPhoto[] = [];
    // duyệt cả thư mục con (vd. "Ngày 1", "Ngày 2"), giới hạn để không chạy mãi
    const queue = [folderId];
    let visited = 0;
    while (queue.length && visited < 60) {
      const batch = queue.splice(0, 10);
      visited += batch.length;
      let pageToken = '';
      do {
        const r = await json<{
          nextPageToken?: string;
          files: {
            id: string;
            name: string;
            mimeType: string;
            thumbnailLink?: string;
            createdTime: string;
            imageMediaMetadata?: { width?: number; height?: number; rotation?: number; time?: string };
          }[];
        }>(
          `${API}/files?` +
            new URLSearchParams({
              q: `(${batch.map((id) => `'${id}' in parents`).join(' or ')}) and (mimeType contains 'image/' or mimeType = '${FOLDER}') and trashed = false`,
              fields: 'nextPageToken,files(id,name,mimeType,thumbnailLink,createdTime,imageMediaMetadata(width,height,rotation,time))',
              pageSize: '1000',
              includeItemsFromAllDrives: 'true',
              supportsAllDrives: 'true',
              ...(pageToken ? { pageToken } : {}),
            }),
        );
        for (const f of r.files) {
          if (f.mimeType === FOLDER) {
            queue.push(f.id);
            continue;
          }
          this.remember(f.id, f.thumbnailLink);
          const md = f.imageMediaMetadata ?? {};
          const rotated = md.rotation === 1 || md.rotation === 3;
          photos.push({
            id: f.id,
            name: f.name,
            width: (rotated ? md.height : md.width) ?? 4,
            height: (rotated ? md.width : md.height) ?? 3,
            takenAt: exifTime(md.time) ?? Date.parse(f.createdTime),
          });
        }
        pageToken = r.nextPageToken ?? '';
      } while (pageToken);
    }
    photos.sort((a, b) => a.takenAt - b.takenAt);
    return { name: root.name, url: `https://drive.google.com/drive/folders/${folderId}`, photos };
  }

  async shareWith(fileId: string, email: string) {
    await gfetch(`${API}/files/${fileId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', role: 'reader', emailAddress: email }),
    });
  }

  async members(): Promise<SpaceMember[]> {
    const r = await json<{ permissions: { emailAddress?: string; displayName?: string; role: string; photoLink?: string; type: string }[] }>(
      `${API}/files/${this.space.folderId}/permissions?fields=permissions(emailAddress,displayName,role,photoLink,type)`,
    );
    return r.permissions
      .filter((p) => p.type === 'user' && p.emailAddress)
      .map((p) => ({ email: p.emailAddress!, name: p.displayName ?? p.emailAddress!, role: p.role, picture: p.photoLink }));
  }

  async invite(email: string, message: string) {
    await gfetch(
      `${API}/files/${this.space.folderId}/permissions?` +
        new URLSearchParams({ sendNotificationEmail: 'true', emailMessage: message }),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
      },
    );
  }
}
