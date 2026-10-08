import type { Doc, PhotoMeta } from '../../types';
import type { ProcessedPhoto } from '../image';

export type PhotoSize = 'thumb' | 'full';
export type PhotoFolder = 'memories' | 'moments';

/** Ảnh lấy từ một thư mục Drive bất kỳ (vd. album của một hành trình). */
export interface FolderPhoto {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Lúc chụp (EXIF) nếu có, không thì lúc tải lên Drive */
  takenAt: number;
}

export interface FolderAlbum {
  name: string;
  url: string;
  photos: FolderPhoto[];
}

/** Ảnh trong kho (Drive: mọi ảnh trong thư mục chung, kể cả ảnh tự thả vào bằng app Drive). */
export interface LibraryPhoto {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  folder: PhotoFolder;
}

export interface SpaceMember {
  email: string;
  name: string;
  role: string;
  picture?: string;
}

export interface Backend {
  kind: 'local' | 'drive';
  /** Tên hiển thị của nơi lưu, vd "Google Drive · Hùng & Linh ♡" */
  label: string;
  folderUrl?: string;
  loadDoc(): Promise<Doc>;
  /** Áp thay đổi lên bản mới nhất rồi lưu lại. */
  mutate(fn: (d: Doc) => void): Promise<Doc>;
  /** Trả về doc mới nếu có người khác vừa sửa, ngược lại null. */
  poll(): Promise<Doc | null>;
  uploadPhoto(p: ProcessedPhoto, folder: PhotoFolder): Promise<PhotoMeta>;
  /** URL để hiển thị ảnh. `fallback` = lần thử lại sau khi URL trước lỗi. */
  photoUrl(id: string, size: PhotoSize, fallback?: boolean): Promise<string | undefined>;
  deletePhotos(ids: string[]): Promise<void>;
  listLibrary(): Promise<LibraryPhoto[]>;
  members?(): Promise<SpaceMember[]>;
  /** Liệt kê ảnh trong một thư mục Drive (kể cả thư mục con). */
  listFolder?(folderId: string): Promise<FolderAlbum>;
  /** Chia sẻ một file/thư mục cho email (quyền xem). */
  shareWith?(fileId: string, email: string): Promise<void>;
  invite?(email: string, message: string): Promise<void>;
}
