import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Memory, Timeline } from '../types';
import type { FolderAlbum } from '../lib/backend/types';
import { useData } from '../lib/data';
import { daysBetween, formatShort, parseDay, toDayString } from '../lib/date';
import { driveFolderUrl, parseDriveFolderId } from '../lib/drivelink';
import { IconCheck, IconDrive, IconFlip, IconPlus, IconUsers } from './Icons';
import { PhotoImg } from './PhotoImg';
import { useUI } from './UI';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const PAGE = 120;

type State = { status: 'idle' | 'loading' } | { status: 'error'; message: string } | { status: 'ready'; album: FolderAlbum };

/** Album ảnh lấy thẳng từ một thư mục Google Drive gắn với hành trình. */
export function JourneyAlbum({
  journey: t,
  onPhoto,
  onAddMemory,
}: {
  journey: Timeline;
  onPhoto: (ids: string[], i: number) => void;
  onAddMemory: (draft: Partial<Memory>) => void;
}) {
  const { backend, saveTimeline, registerPhotos, doc, me } = useData();
  const { toast } = useUI();
  const [state, setState] = useState<State>({ status: 'idle' });
  const [link, setLink] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const partner = Object.values(doc.members).find((m) => m.email !== me.email);

  const load = useCallback(async () => {
    if (!t.driveFolderId || !backend.listFolder) return;
    setState({ status: 'loading' });
    try {
      const album = await backend.listFolder(t.driveFolderId);
      registerPhotos(album.photos.map((p) => ({ id: p.id, width: p.width, height: p.height, createdAt: p.takenAt })));
      setState({ status: 'ready', album });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Không tải được thư mục' });
    }
  }, [t.driveFolderId, backend, registerPhotos]);

  useEffect(() => {
    setSel([]);
    setSelecting(false);
    setLimit(PAGE);
    load();
  }, [load]);

  const album = state.status === 'ready' ? state.album : null;
  const ids = useMemo(() => album?.photos.map((p) => p.id) ?? [], [album]);

  // nhóm theo ngày chụp; trong khoảng chuyến đi thì gọi là "Ngày 1, Ngày 2…"
  const days = useMemo(() => {
    if (!album) return [];
    const start = parseDay(t.startDate);
    const map = new Map<string, { label: string; items: { id: string; index: number }[] }>();
    album.photos.slice(0, limit).forEach((p, index) => {
      const d = new Date(p.takenAt);
      const key = toDayString(d);
      if (!map.has(key)) {
        const n = start ? daysBetween(start, new Date(d.getFullYear(), d.getMonth(), d.getDate())) + 1 : 0;
        const inTrip = start && n >= 1 && (!t.endDate || key <= t.endDate);
        map.set(key, { label: `${inTrip ? `Ngày ${n} · ` : ''}${WEEKDAYS[d.getDay()]}, ${formatShort(key)}`, items: [] });
      }
      map.get(key)!.items.push({ id: p.id, index });
    });
    return [...map.entries()];
  }, [album, limit, t.startDate, t.endDate]);

  if (backend.kind !== 'drive' || !backend.listFolder) return null;

  const attach = async () => {
    const id = parseDriveFolderId(link);
    if (!id) {
      toast('Link chưa đúng — hãy dán link của một thư mục Google Drive');
      return;
    }
    await saveTimeline({ ...t, driveFolderId: id, updatedAt: Date.now() }).catch(() => {});
    setLink('');
  };

  const share = async () => {
    if (!partner || !t.driveFolderId || !backend.shareWith) return;
    try {
      await backend.shareWith(t.driveFolderId, partner.email);
      toast(`Đã chia sẻ thư mục với ${partner.name}`);
    } catch (e) {
      toast(e instanceof Error ? `Chưa chia sẻ được: ${e.message}` : 'Chưa chia sẻ được');
    }
  };

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const makeMemory = () => {
    const first = album!.photos.find((p) => sel.includes(p.id));
    onAddMemory({
      timelineId: t.id,
      date: first ? toDayString(new Date(first.takenAt)) : t.startDate,
      location: t.location,
      photoIds: ids.filter((id) => sel.includes(id)),
    });
    setSel([]);
    setSelecting(false);
  };

  const makeCover = async () => {
    await saveTimeline({ ...t, coverPhotoId: sel[0], updatedAt: Date.now() }).catch(() => {});
    toast('Đã đặt làm ảnh bìa');
    setSel([]);
    setSelecting(false);
  };

  if (!t.driveFolderId) {
    return (
      <div className="album album--empty">
        <div className="album__icon">
          <IconDrive size={26} />
        </div>
        <div className="album__intro">
          <h3>Album từ Google Drive</h3>
          <p>Dán link một thư mục Drive chứa ảnh của chuyến đi, app sẽ tự lấy ảnh ra và xếp theo từng ngày.</p>
          <div className="album__link">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && attach()}
              placeholder="https://drive.google.com/drive/folders/…"
            />
            <button className="btn btn--gold btn--sm" onClick={attach} disabled={!link.trim()}>
              Gắn thư mục
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="album">
      <div className="album__head">
        <div>
          <span className="eyebrow">
            <IconDrive size={14} /> Album từ Google Drive
          </span>
          <h3>{album ? album.name : 'Đang mở thư mục…'}</h3>
          {album && <small>{album.photos.length} ảnh · tự cập nhật mỗi khi mở hành trình</small>}
        </div>
        <div className="album__actions">
          <button className="icon-btn" onClick={load} disabled={state.status === 'loading'} aria-label="Tải lại" title="Tải lại">
            <IconFlip size={18} />
          </button>
          <a className="icon-btn" href={driveFolderUrl(t.driveFolderId)} target="_blank" rel="noreferrer" aria-label="Mở trên Drive" title="Mở trên Drive">
            <IconDrive size={18} />
          </a>
          {partner && (
            <button className="icon-btn" onClick={share} aria-label={`Chia sẻ với ${partner.name}`} title={`Chia sẻ thư mục với ${partner.name}`}>
              <IconUsers size={18} />
            </button>
          )}
          {album && album.photos.length > 0 && (
            <button className={`chip chip--filter ${selecting ? 'is-on' : ''}`} onClick={() => (setSelecting((v) => !v), setSel([]))}>
              {selecting ? 'Xong' : 'Chọn ảnh'}
            </button>
          )}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="picker__loading">
          <span className="spinner" />
        </div>
      )}
      {state.status === 'error' && (
        <div className="album__error">
          <p>{state.message}</p>
          {partner && <p className="album__hint">Nếu thư mục là của {partner.name}, nhờ {partner.name} mở hành trình này và bấm nút chia sẻ (biểu tượng hai người).</p>}
          <div className="settings__btns">
            <button className="btn btn--ghost btn--sm" onClick={load}>
              Thử lại
            </button>
            <button className="btn btn--ghost btn--sm btn--danger-text" onClick={() => saveTimeline({ ...t, driveFolderId: undefined, updatedAt: Date.now() })}>
              Bỏ liên kết
            </button>
          </div>
        </div>
      )}
      {album && album.photos.length === 0 && <p className="notes__empty">Thư mục chưa có ảnh nào — thả ảnh vào Drive rồi bấm tải lại nhé.</p>}

      {days.map(([key, day]) => (
        <div key={key} className="album__day">
          <div className="album__daylabel">{day.label}</div>
          <div className="album__grid">
            {day.items.map(({ id, index }) => (
              <motion.button
                key={id}
                className={`album__item ${sel.includes(id) ? 'is-on' : ''}`}
                onClick={() => (selecting ? toggle(id) : onPhoto(ids, index))}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.5 }}
              >
                <PhotoImg id={id} />
                {selecting && (
                  <span className="picker__check">
                    <IconCheck size={14} />
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {album && album.photos.length > limit && (
        <button className="btn btn--ghost album__more" onClick={() => setLimit((l) => l + PAGE)}>
          Xem thêm {Math.min(PAGE, album.photos.length - limit)} ảnh
        </button>
      )}

      <AnimatePresence>
        {selecting && sel.length > 0 && (
          <motion.div className="album__bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
            <span>Đã chọn {sel.length} ảnh</span>
            {sel.length === 1 && (
              <button className="btn btn--ghost btn--sm" onClick={makeCover}>
                Đặt làm ảnh bìa
              </button>
            )}
            <button className="btn btn--gold btn--sm" onClick={makeMemory}>
              <IconPlus size={15} /> Tạo kỉ niệm
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
