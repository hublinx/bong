import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Backend } from './backend/types';
import { LocalBackend } from './backend/local';
import { createSpace, DriveBackend, findSpaces, type SpaceCandidate } from './backend/drive';
import { emptyDoc } from '../types';
import { fetchProfile, googleConfigured, hasValidToken, requestToken, savedProfile, signOutGoogle, type Profile } from './google';

const MODE_KEY = 'bong.mode';
const SPACE_KEY = 'bong.space';

export type Session =
  | { status: 'boot' }
  | { status: 'signedOut'; remembered: Profile | null }
  | { status: 'choosingSpace'; profile: Profile; candidates: SpaceCandidate[] }
  | { status: 'ready'; profile: Profile; backend: Backend };

interface AuthCtx {
  session: Session;
  busy: boolean;
  error: string;
  signIn: () => Promise<void>;
  enterLocal: () => void;
  chooseSpace: (c: SpaceCandidate) => void;
  newSpace: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const LOCAL_PROFILE: Profile = { email: 'local', name: 'Bạn', givenName: 'Bạn' };

function read<T>(k: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null');
  } catch {
    return null;
  }
}
function write(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'boot' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = useCallback((profile: Profile, space: SpaceCandidate) => {
    write(MODE_KEY, 'drive');
    write(SPACE_KEY, { ...space, email: profile.email });
    setSession({ status: 'ready', profile, backend: new DriveBackend(space) });
  }, []);

  useEffect(() => {
    const mode = read<string>(MODE_KEY);
    if (mode === 'local') {
      setSession({ status: 'ready', profile: LOCAL_PROFILE, backend: new LocalBackend() });
      return;
    }
    const profile = savedProfile();
    const space = read<SpaceCandidate & { email: string }>(SPACE_KEY);
    if (mode === 'drive' && profile && space?.email === profile.email && hasValidToken()) {
      setSession({ status: 'ready', profile, backend: new DriveBackend(space) });
    } else {
      setSession({ status: 'signedOut', remembered: googleConfigured ? profile : null });
    }
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await requestToken({ hint: savedProfile()?.email });
      const profile = await fetchProfile();
      const saved = read<SpaceCandidate & { email: string }>(SPACE_KEY);
      const candidates = await findSpaces();
      const keep = saved?.email === profile.email && candidates.find((c) => c.fileId === saved.fileId);
      if (keep) ready(profile, keep);
      else if (candidates.length === 1) ready(profile, candidates[0]);
      else setSession({ status: 'choosingSpace', profile, candidates });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }, [ready]);

  const enterLocal = useCallback(() => {
    write(MODE_KEY, 'local');
    setSession({ status: 'ready', profile: LOCAL_PROFILE, backend: new LocalBackend() });
  }, []);

  const chooseSpace = useCallback(
    (c: SpaceCandidate) => {
      if (session.status === 'choosingSpace') ready(session.profile, c);
    },
    [session, ready],
  );

  const newSpace = useCallback(async () => {
    if (session.status !== 'choosingSpace') return;
    setBusy(true);
    setError('');
    try {
      ready(session.profile, await createSpace(emptyDoc()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được không gian trên Drive');
    } finally {
      setBusy(false);
    }
  }, [session, ready]);

  const signOut = useCallback(() => {
    const wasLocal = read<string>(MODE_KEY) === 'local';
    write(MODE_KEY, null);
    if (!wasLocal) {
      write(SPACE_KEY, null);
      signOutGoogle();
    }
    setSession({ status: 'signedOut', remembered: null });
  }, []);

  return (
    <Ctx.Provider value={{ session, busy, error, signIn, enterLocal, chooseSpace, newSpace, signOut }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth phải nằm trong AuthProvider');
  return c;
}

/** Chỉ dùng bên trong phần app đã đăng nhập. */
export function useSession() {
  const { session } = useAuth();
  if (session.status !== 'ready') throw new Error('Chưa đăng nhập');
  return session;
}
