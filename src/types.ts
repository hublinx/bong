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

export interface Memory {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  location: string;
  mood: MoodKey;
  story: string;
  tags: string[];
  photoIds: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NoteColor = 'cream' | 'rose' | 'sage' | 'lilac' | 'sky';

export interface Note {
  id: string;
  text: string;
  author: 'me' | 'partner';
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
}

export interface Photo {
  id: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
  createdAt: number;
}

export interface Settings {
  myName: string;
  partnerName: string;
  /** YYYY-MM-DD — ngày bắt đầu */
  startDate: string;
  tagline: string;
}

export const DEFAULT_SETTINGS: Settings = {
  myName: 'Tôi',
  partnerName: 'Bông',
  startDate: '',
  tagline: 'Mỗi ngày bên nhau là một trang kỉ niệm',
};
