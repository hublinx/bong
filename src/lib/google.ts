/* Đăng nhập Google (Google Identity Services) và gọi Drive API bằng access token. */

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
export const googleConfigured = GOOGLE_CLIENT_ID.length > 0;

// drive: đọc/ghi được thư mục mà người kia chia sẻ (drive.file không cho phép điều này)
const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive';

const TOKEN_KEY = 'bong.token';
const PROFILE_KEY = 'bong.profile';

export interface Profile {
  email: string;
  name: string;
  givenName: string;
  picture?: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(o?: { prompt?: string; login_hint?: string }): void;
  callback: (r: TokenResponse) => void;
  error_callback?: (e: { type: string; message?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(o: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisPromise = null;
        reject(new Error('Không tải được Google Sign-In — kiểm tra kết nối mạng'));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

let token: { value: string; expiresAt: number } | null = (() => {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null');
    return t && t.expiresAt > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
})();

export function hasValidToken() {
  return !!token && token.expiresAt > Date.now() + 30_000;
}

export function savedProfile(): Profile | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** Mở popup đăng nhập Google. Phải gọi từ một thao tác bấm của người dùng. */
export async function requestToken(opts: { hint?: string; consent?: boolean } = {}): Promise<string> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error_description || r.error || 'Đăng nhập thất bại'));
          return;
        }
        token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
        try {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        } catch {
          /* bỏ qua */
        }
        resolve(r.access_token);
        notifyReauth();
      },
      error_callback: (e) =>
        reject(new Error(e.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập' : e.message || 'Không mở được cửa sổ đăng nhập')),
    });
    client.requestAccessToken({ prompt: opts.consent ? 'consent' : '', login_hint: opts.hint });
  });
}

export async function fetchProfile(): Promise<Profile> {
  const r = await gfetch('https://www.googleapis.com/oauth2/v3/userinfo');
  const j = await r.json();
  const p: Profile = { email: j.email, name: j.name || j.email, givenName: j.given_name || j.name || j.email, picture: j.picture };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua */
  }
  return p;
}

export function signOutGoogle() {
  const t = token?.value;
  token = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* bỏ qua */
  }
  if (t) window.google?.accounts.oauth2.revoke(t);
}

/* ---------- Khi token hết hạn giữa chừng ---------- */

type Listener = (needed: boolean) => void;
const listeners = new Set<Listener>();
let waiting: { resolve: () => void }[] = [];

export function onReauthNeeded(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function notifyReauth() {
  const w = waiting;
  waiting = [];
  w.forEach((x) => x.resolve());
  listeners.forEach((l) => l(false));
}

/** Chờ tới khi người dùng bấm "tiếp tục" để lấy token mới (popup cần thao tác người dùng). */
function waitForReauth(): Promise<void> {
  listeners.forEach((l) => l(true));
  return new Promise((resolve) => waiting.push({ resolve }));
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** fetch có gắn token; tự chờ đăng nhập lại khi token hết hạn. */
export async function gfetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!hasValidToken()) await waitForReauth();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token!.value}`);
  const r = await fetch(url, { ...init, headers });
  if (r.status === 401 && retry) {
    token = null;
    await waitForReauth();
    return gfetch(url, init, false);
  }
  if (!r.ok) {
    let msg = `${r.status}`;
    try {
      const j = await r.clone().json();
      msg = j?.error?.message || msg;
    } catch {
      /* bỏ qua */
    }
    throw new HttpError(r.status, msg);
  }
  return r;
}
