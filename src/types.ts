export type MoodKey =
  | 'happy'
  | 'love'
  | 'fun'
  | 'touched'
  | 'adventure'
  | 'celebrate'
  | 'food'
  | 'calm'
  | 'sad';

/** Ai đã tạo/viết — lưu kèm để hiển thị khi dùng chung giữa hai tài khoản. */
export interface Author {
  email: string;
  name: string;
}

export interface Memory {
  id: string;
  /** Thuộc hành trình nào; 'main' là câu chuyện chung */
  timelineId: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  location: string;
  mood: MoodKey;
  story: string;
  tags: string[];
  photoIds: string[];
  favorite: boolean;
  by?: Author;
  createdAt: number;
  updatedAt: number;
}

export type TimelineKind = 'trip' | 'plan' | 'dream' | 'story';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Timeline {
  id: string;
  kind: TimelineKind;
  title: string;
  emoji: string;
  description: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  location: string;
  coverPhotoId?: string;
  /** Thư mục Google Drive gắn với hành trình — app tự lấy ảnh trong đó */
  driveFolderId?: string;
  checklist: ChecklistItem[];
  by?: Author;
  createdAt: number;
  updatedAt: number;
}

export type NoteColor = 'cream' | 'rose' | 'sage' | 'lilac' | 'sky';

export interface Note {
  id: string;
  text: string;
  by: Author;
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
}

/** Khoảnh khắc chụp nhanh kiểu Locket */
export interface Moment {
  id: string;
  photoId: string;
  caption: string;
  by: Author;
  /** email -> emoji */
  reactions: Record<string, string>;
  createdAt: number;
}

export interface PhotoMeta {
  id: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface Member {
  email: string;
  name: string;
  picture?: string;
  lastSeen: number;
}

export interface Settings {
  myName: string;
  partnerName: string;
  /** YYYY-MM-DD — ngày bắt đầu */
  startDate: string;
  tagline: string;
  /** Đã chuyển tên mặc định cũ (Tôi & Bông) sang Hùng & Linh */
  namesV2?: boolean;
}

export interface Doc {
  version: 2;
  settings: Settings;
  timelines: Timeline[];
  memories: Memory[];
  notes: Note[];
  moments: Moment[];
  photos: Record<string, PhotoMeta>;
  members: Record<string, Member>;
}

export const MAIN_TIMELINE = 'main';

export const DEFAULT_SETTINGS: Settings = {
  myName: 'Hùng',
  partnerName: 'Linh',
  namesV2: true,
  startDate: '',
  tagline: 'Mỗi ngày bên nhau là một trang kỉ niệm',
};

export function emptyDoc(): Doc {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    timelines: [],
    memories: [],
    notes: [],
    moments: [],
    photos: {},
    members: {},
  };
}

/** Tên mặc định của bản cũ là "Tôi" & "Bông" — đổi một lần sang Hùng & Linh. */
function migrateNames(s: Settings): Settings {
  if (s.namesV2) return s;
  return {
    ...s,
    myName: !s.myName || s.myName === 'Tôi' ? 'Hùng' : s.myName,
    partnerName: !s.partnerName || s.partnerName === 'Bông' ? 'Linh' : s.partnerName,
    namesV2: true,
  };
}

/** Chuẩn hoá dữ liệu đọc về (thiếu trường, bản cũ…) */
export function normalizeDoc(raw: unknown): Doc {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<Doc>;
  const base = emptyDoc();
  return {
    version: 2,
    // dữ liệu cũ không có cờ namesV2 thì cần đổi tên
    settings: migrateNames({ ...base.settings, namesV2: false, ...(d.settings ?? {}) }),
    timelines: (d.timelines ?? []).map((t) => ({ ...t, checklist: t.checklist ?? [] })),
    memories: (d.memories ?? []).map((m) => ({ ...m, timelineId: m.timelineId || MAIN_TIMELINE, tags: m.tags ?? [], photoIds: m.photoIds ?? [] })),
    notes: (d.notes ?? []).map((n) => ({
      ...n,
      by: n.by ?? { email: '', name: (n as unknown as { author?: string }).author === 'partner' ? base.settings.partnerName : base.settings.myName },
    })),
    moments: (d.moments ?? []).map((m) => ({ ...m, reactions: m.reactions ?? {} })),
    photos: d.photos ?? {},
    members: d.members ?? {},
  };
}
