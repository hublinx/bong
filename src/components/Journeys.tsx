import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { Memory, Timeline, TimelineKind } from '../types';
import { useData } from '../lib/data';
import { formatShort, today } from '../lib/date';
import { uid } from '../lib/id';
import { processImage } from '../lib/image';
import { CHECKLIST_TEMPLATES, durationDays, journeyStatus, KIND_KEYS, KINDS, sortJourneys, type SortDir } from '../lib/journeys';
import { JourneyOverview } from './JourneyOverview';
import { IconCheck, IconChevron, IconClose, IconDrive, IconEdit, IconImage, IconPin, IconPlus, IconSparkle, IconTrash } from './Icons';
import { LibraryPicker } from './LibraryPicker';
import { PhotoImg } from './PhotoImg';
import { MemoryTimeline } from './Timeline';
import { Modal, Ornament, useUI } from './UI';

const EMOJIS = ['✈️', '🏖️', '⛰️', '🏕️', '🚗', '🏙️', '🌸', '🎄', '💍', '🏡', '🐶', '💰', '🎂', '🎓', '🍜', '🌙'];

function Cover({ t, className = '' }: { t: Timeline; className?: string }) {
  return (
    <div className={`jcover ${className}`} style={{ background: KINDS[t.kind].gradient }}>
      {t.coverPhotoId ? <PhotoImg id={t.coverPhotoId} size="full" /> : <span className="jcover__emoji">{t.emoji}</span>}
    </div>
  );
}

function dateRange(t: Timeline) {
  if (!t.startDate) return '';
  if (!t.endDate || t.endDate === t.startDate) return formatShort(t.startDate);
  return `${formatShort(t.startDate)} → ${formatShort(t.endDate)}`;
}

/* ---------- Danh sách hành trình ---------- */

type JView = 'cards' | 'overview';

function pref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}
function savePref(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* bỏ qua */
  }
}

export function Journeys({
  onOpen,
  onCreate,
  onOpenMemory,
}: {
  onOpen: (t: Timeline) => void;
  onCreate: () => void;
  onOpenMemory: (m: Memory) => void;
}) {
  const { doc } = useData();
  const [view, setView] = useState<JView>(() => pref('bong.jview', 'cards'));
  const [dir, setDir] = useState<SortDir>(() => pref('bong.jsort', 'asc'));
  const [kind, setKind] = useState<TimelineKind | null>(null);

  const changeView = (v: JView) => (setView(v), savePref('bong.jview', v));
  const changeDir = (d: SortDir) => (setDir(d), savePref('bong.jsort', d));

  const list = useMemo(
    () =>
      sortJourneys(
        doc.timelines.filter((t) => !kind || t.kind === kind),
        dir,
      ),
    [doc.timelines, kind, dir],
  );
  const usedKinds = KIND_KEYS.filter((k) => doc.timelines.some((t) => t.kind === k));

  // chia nhóm theo năm của ngày đi
  const groups = useMemo(() => {
    const map = new Map<string, Timeline[]>();
    for (const t of list) {
      const y = t.startDate ? t.startDate.slice(0, 4) : 'Một ngày nào đó';
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(t);
    }
    return [...map.entries()];
  }, [list]);

  return (
    <section>
      <div className="section-head">
        <Ornament />
        <h2 className="section-title">Hành trình</h2>
        <p className="section-sub">Mỗi chuyến đi, mỗi kế hoạch là một dòng thời gian riêng</p>
        <div className="segmented">
          {(
            [
              ['cards', 'Các hành trình'],
              ['overview', 'Tổng quan'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={view === k ? 'is-on' : ''} onClick={() => changeView(k)}>
              {view === k && <motion.span layoutId="jseg" className="segmented__pill" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {doc.timelines.length > 0 && (
        <div className="jtools">
          <div className="filters__chips">
            {view === 'cards' && usedKinds.length > 1 && (
              <>
                <button className={`chip chip--filter ${!kind ? 'is-on' : ''}`} onClick={() => setKind(null)}>
                  Tất cả
                </button>
                {usedKinds.map((k) => (
                  <button
                    key={k}
                    className={`chip chip--filter ${kind === k ? 'is-on' : ''}`}
                    onClick={() => setKind(kind === k ? null : k)}
                  >
                    {KINDS[k].emoji} {KINDS[k].label}
                  </button>
                ))}
              </>
            )}
          </div>
          <button className="chip chip--filter jtools__sort" onClick={() => changeDir(dir === 'asc' ? 'desc' : 'asc')} title="Đổi thứ tự">
            {dir === 'asc' ? '↓ Ngày đi: sớm → muộn' : '↑ Ngày đi: muộn → sớm'}
          </button>
        </div>
      )}

      {view === 'overview' ? (
        doc.timelines.length ? (
          <JourneyOverview dir={dir} onOpen={onOpen} onOpenMemory={onOpenMemory} />
        ) : (
          <p className="notes__empty">Chưa có hành trình nào để xem tổng quan.</p>
        )
      ) : (
        <>
          <div className="journeys journeys--new">
            <motion.button className="journey journey--new" onClick={onCreate} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}>
              <span className="journey__plus">
                <IconPlus size={30} />
              </span>
              <b>Bắt đầu hành trình mới</b>
              <small>Chuyến đi, kế hoạch, dự định…</small>
            </motion.button>
          </div>
          {groups.map(([year, items]) => (
            <Fragment key={year}>
              <div className="jyear">
                <span>{year}</span>
                <small>{items.length} hành trình</small>
              </div>
              <div className="journeys">
                {items.map((t, i) => {
                  const st = journeyStatus(t);
                  const count = doc.memories.filter((m) => m.timelineId === t.id).length;
                  const done = t.checklist.filter((c) => c.done).length;
                  return (
                    <motion.button
                      key={t.id}
                      className={`journey is-${st.key}`}
                      onClick={() => onOpen(t)}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -6 }}
                    >
                      <Cover t={t} className="journey__cover" />
                      <span className={`journey__status st-${st.key}`}>
                        {st.label} {st.key !== 'dream' && <small>{st.detail}</small>}
                      </span>
                      <span className="journey__body">
                        <span className="journey__kind">
                          {KINDS[t.kind].emoji} {KINDS[t.kind].label}
                        </span>
                        <b className="journey__title">
                          {t.emoji} {t.title}
                        </b>
                        <span className="journey__meta">
                          {t.location && (
                            <span>
                              <IconPin size={13} /> {t.location}
                            </span>
                          )}
                          {dateRange(t) && <span>{dateRange(t)}</span>}
                          {durationDays(t) > 1 && <span>{durationDays(t)} ngày</span>}
                        </span>
                        <span className="journey__foot">
                          <span>{count} kỉ niệm</span>
                          {t.checklist.length > 0 && (
                            <span className="journey__progress">
                              <span className="journey__track">
                                <i style={{ width: `${(done / t.checklist.length) * 100}%` }} />
                              </span>
                              <em>
                                {done}/{t.checklist.length}
                              </em>
                            </span>
                          )}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </>
      )}
    </section>
  );
}

/* ---------- Tạo / sửa hành trình ---------- */

function blank(kind: TimelineKind): Timeline {
  const now = Date.now();
  return {
    id: uid(),
    kind,
    title: '',
    emoji: KINDS[kind].emoji,
    description: '',
    startDate: kind === 'dream' ? '' : today(),
    endDate: '',
    location: '',
    checklist: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function JourneyEditor({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Timeline | null;
  onClose: () => void;
  onSaved?: (t: Timeline) => void;
}) {
  const { saveTimeline, upload, me } = useData();
  const { toast } = useUI();
  const [t, setT] = useState<Timeline>(() => blank('trip'));
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setT(initial ? structuredClone(initial) : { ...blank('trip'), by: me });
    setItem('');
  }, [open, initial]);

  const set = <K extends keyof Timeline>(k: K, v: Timeline[K]) => setT((x) => ({ ...x, [k]: v }));
  const setKind = (kind: TimelineKind) =>
    setT((x) => ({
      ...x,
      kind,
      emoji: Object.values(KINDS).some((k) => k.emoji === x.emoji) ? KINDS[kind].emoji : x.emoji,
      startDate: kind === 'dream' ? '' : x.startDate || today(),
    }));

  const addItems = (texts: string[]) =>
    setT((x) => ({
      ...x,
      checklist: [
        ...x.checklist,
        ...texts.filter((s) => !x.checklist.some((c) => c.text === s)).map((text) => ({ id: uid(), text, done: false })),
      ],
    }));

  const setCover = async (f: File) => {
    setBusy(true);
    try {
      const meta = await upload(await processImage(f), 'memories');
      set('coverPhotoId', meta.id);
    } catch {
      toast('Chưa tải được ảnh bìa');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t.title.trim()) {
      toast('Đặt tên cho hành trình nhé');
      return;
    }
    setBusy(true);
    const pending = item.trim() ? [{ id: uid(), text: item.trim(), done: false }] : [];
    const final: Timeline = {
      ...t,
      title: t.title.trim(),
      endDate: t.endDate && t.startDate && t.endDate < t.startDate ? t.startDate : t.endDate,
      checklist: [...t.checklist, ...pending],
      updatedAt: Date.now(),
    };
    try {
      await saveTimeline(final);
      toast(initial ? 'Đã cập nhật hành trình' : 'Một hành trình mới bắt đầu ✨');
      onClose();
      onSaved?.(final);
    } catch {
      /* lỗi đã được báo */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide label={initial ? 'Sửa hành trình' : 'Hành trình mới'}>
      <form className="editor" onSubmit={submit}>
        <div className="editor__head">
          <span className="eyebrow">
            <IconSparkle size={14} /> {initial ? 'Chỉnh sửa hành trình' : 'Hành trình mới'}
          </span>
          <input
            className="editor__title"
            value={t.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={
              t.kind === 'trip' ? 'Đà Lạt mùa hoa dã quỳ…' : t.kind === 'plan' ? 'Kế hoạch dọn về chung nhà…' : 'Đặt tên cho hành trình…'
            }
            autoFocus={!initial}
            maxLength={80}
          />
        </div>

        <div className="kinds">
          {KIND_KEYS.map((k) => (
            <button type="button" key={k} className={`kind ${t.kind === k ? 'is-on' : ''}`} onClick={() => setKind(k)}>
              <span className="kind__emoji">{KINDS[k].emoji}</span>
              <b>{KINDS[k].label}</b>
              <small>{KINDS[k].hint}</small>
            </button>
          ))}
        </div>

        <div className="field">
          <span className="field__label">Biểu tượng</span>
          <div className="emojis">
            {EMOJIS.map((e) => (
              <button type="button" key={e} className={t.emoji === e ? 'is-on' : ''} onClick={() => set('emoji', e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="editor__row">
          <label className="field">
            <span className="field__label">{t.kind === 'trip' ? 'Ngày đi' : 'Bắt đầu'}</span>
            <input type="date" value={t.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">{t.kind === 'trip' ? 'Ngày về' : 'Kết thúc (tuỳ chọn)'}</span>
            <input type="date" value={t.endDate} min={t.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Ở đâu</span>
          <input value={t.location} onChange={(e) => set('location', e.target.value)} placeholder="Đà Lạt, Phú Quốc, Seoul…" />
        </label>

        <label className="field">
          <span className="field__label">Mô tả</span>
          <textarea
            rows={3}
            value={t.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Vì sao muốn đi, muốn làm gì, mong chờ điều gì…"
          />
        </label>

        <div className="field">
          <span className="field__label">Ảnh bìa</span>
          <div className="cover-pick">
            <div className="cover-pick__preview" style={{ background: KINDS[t.kind].gradient }}>
              {t.coverPhotoId ? <PhotoImg id={t.coverPhotoId} /> : <span>{t.emoji}</span>}
              {busy && <span className="spinner" />}
            </div>
            <div className="cover-pick__btns">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
                <IconImage size={15} /> Tải ảnh lên
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicking(true)}>
                <IconDrive size={15} /> Chọn từ kho
              </button>
              {t.coverPhotoId && (
                <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => set('coverPhotoId', undefined)}>
                  Bỏ ảnh
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => (e.target.files?.[0] && setCover(e.target.files[0]), (e.target.value = ''))}
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">Việc cần làm / đồ cần mang</span>
          {t.checklist.length > 0 && (
            <ul className="checklist checklist--edit">
              {t.checklist.map((c) => (
                <li key={c.id}>
                  <span>{c.text}</span>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'checklist',
                        t.checklist.filter((x) => x.id !== c.id),
                      )
                    }
                    aria-label="Bỏ"
                  >
                    <IconClose size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="checklist__add">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (item.trim()) addItems([item.trim()]);
                  setItem('');
                }
              }}
              placeholder="Thêm một việc rồi Enter…"
            />
            {CHECKLIST_TEMPLATES[t.kind].length > 0 && (
              <button type="button" className="chip chip--filter" onClick={() => addItems(CHECKLIST_TEMPLATES[t.kind])}>
                <IconSparkle size={13} /> Gợi ý
              </button>
            )}
          </div>
        </div>

        <div className="editor__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn--gold" disabled={busy}>
            {initial ? 'Lưu thay đổi' : 'Bắt đầu hành trình'}
          </button>
        </div>
      </form>
      <LibraryPicker open={picking} onClose={() => setPicking(false)} multiple={false} onPick={(ids) => set('coverPhotoId', ids[0])} />
    </Modal>
  );
}

/* ---------- Trang của một hành trình ---------- */

export function JourneyView({
  journey,
  onBack,
  onEdit,
  onOpenMemory,
  onPhoto,
  onAddMemory,
}: {
  journey: Timeline;
  onBack: () => void;
  onEdit: (t: Timeline) => void;
  onOpenMemory: (m: Memory) => void;
  onPhoto: (ids: string[], i: number) => void;
  onAddMemory: (draft: Partial<Memory>) => void;
}) {
  const { doc, saveTimeline, deleteTimeline } = useData();
  const { confirm, toast } = useUI();
  const t = doc.timelines.find((x) => x.id === journey.id) ?? journey;
  const st = journeyStatus(t);
  const mems = doc.memories.filter((m) => m.timelineId === t.id);
  const [item, setItem] = useState('');
  const done = t.checklist.filter((c) => c.done).length;

  const updateList = (checklist: Timeline['checklist']) => saveTimeline({ ...t, checklist, updatedAt: Date.now() }).catch(() => {});

  const remove = async () => {
    const ok = await confirm({
      title: `Xoá hành trình “${t.title}”?`,
      message: mems.length ? `${mems.length} kỉ niệm trong hành trình này cũng sẽ bị xoá.` : undefined,
      confirmText: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    onBack();
    await deleteTimeline(t.id);
    toast('Đã xoá hành trình');
  };

  const draftDate = st.key === 'upcoming' ? t.startDate : today();

  return (
    <section className="jview">
      <div className="jview__hero">
        <Cover t={t} className="jview__cover" />
        <div className="jview__shade" />
        <div className="jview__top">
          <button className="icon-btn" onClick={onBack} aria-label="Quay lại">
            <IconChevron dir="left" />
          </button>
          <div>
            <button className="icon-btn" onClick={() => onEdit(t)} aria-label="Sửa">
              <IconEdit />
            </button>
            <button className="icon-btn" onClick={remove} aria-label="Xoá">
              <IconTrash />
            </button>
          </div>
        </div>
        <motion.div
          className="jview__head"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">
            {KINDS[t.kind].emoji} {KINDS[t.kind].label}
          </span>
          <h2 className="jview__title">
            {t.emoji} {t.title}
          </h2>
          <p className="jview__meta">
            {t.location && (
              <span>
                <IconPin size={15} /> {t.location}
              </span>
            )}
            {dateRange(t) && <span>{dateRange(t)}</span>}
          </p>
        </motion.div>
      </div>

      <div className="jview__body">
        <div className="jview__stats">
          <div className={`jstat st-${st.key}`}>
            <b>{st.label}</b>
            <small>{st.key === 'dream' ? 'chưa chọn ngày' : st.detail}</small>
          </div>
          <div className="jstat">
            <b>{mems.length}</b>
            <small>kỉ niệm</small>
          </div>
          <div className="jstat">
            <b>{t.checklist.length ? `${done}/${t.checklist.length}` : '—'}</b>
            <small>việc đã xong</small>
          </div>
        </div>

        {t.description && <p className="jview__desc">{t.description}</p>}

        <div className="jview__checklist">
          <h3>Việc cần làm</h3>
          {t.checklist.length > 0 && (
            <div className="jprogress">
              <i style={{ width: `${(done / t.checklist.length) * 100}%` }} />
            </div>
          )}
          <ul className="checklist">
            <AnimatePresence initial={false}>
              {t.checklist.map((c) => (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={c.done ? 'is-done' : ''}
                >
                  <button
                    className="checklist__box"
                    onClick={() => updateList(t.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                    aria-label={c.done ? 'Bỏ đánh dấu' : 'Đánh dấu xong'}
                  >
                    {c.done && <IconCheck size={14} />}
                  </button>
                  <span>{c.text}</span>
                  <button className="checklist__del" onClick={() => updateList(t.checklist.filter((x) => x.id !== c.id))} aria-label="Xoá">
                    <IconClose size={13} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="checklist__add">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && item.trim()) {
                  updateList([...t.checklist, { id: uid(), text: item.trim(), done: false }]);
                  setItem('');
                }
              }}
              placeholder="Thêm việc cần làm rồi Enter…"
            />
          </div>
        </div>

        <div className="section-head jview__tlhead">
          <Ornament />
          <h2 className="section-title">Nhật kí hành trình</h2>
          {mems.length > 0 && (
            <button className="btn btn--gold" onClick={() => onAddMemory({ timelineId: t.id, date: draftDate, location: t.location })}>
              <IconPlus size={16} /> {st.key === 'upcoming' || st.key === 'dream' ? 'Thêm điểm đến / dự kiến' : 'Thêm kỉ niệm'}
            </button>
          )}
        </div>

        <MemoryTimeline
          memories={mems}
          onOpen={onOpenMemory}
          onPhoto={onPhoto}
          onCreate={() => onAddMemory({ timelineId: t.id, date: draftDate, location: t.location })}
          emptyTitle={st.key === 'upcoming' || st.key === 'dream' ? 'Lên lịch trình nào' : 'Chưa có trang nào'}
          emptyText={
            st.key === 'upcoming' || st.key === 'dream'
              ? 'Thêm những điểm muốn ghé, món muốn ăn, việc muốn làm — mỗi mục là một mốc trên dòng thời gian. Khi đi rồi thì cập nhật ảnh vào nhé.'
              : 'Lưu lại những khoảnh khắc của hành trình này.'
          }
          endText={t.startDate ? `Khởi hành · ${formatShort(t.startDate)}` : 'Khởi đầu của hành trình'}
        />
      </div>
    </section>
  );
}
