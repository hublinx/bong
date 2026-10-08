import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Memory } from '../types';
import { MAIN_TIMELINE } from '../types';
import { useAuthorName, useData } from '../lib/data';
import { daysBetween, formatLong, parseDay, startOfToday } from '../lib/date';
import { MOODS } from '../lib/moods';
import { IconChevron, IconEdit, IconHeart, IconPin, IconTrash } from './Icons';
import { PhotoImg } from './PhotoImg';
import { Modal, Ornament, useUI } from './UI';

function ago(date: string) {
  const d = parseDay(date);
  if (!d) return '';
  const n = daysBetween(d, startOfToday());
  if (n === 0) return 'Hôm nay';
  if (n < 0) return `Còn ${-n} ngày nữa`;
  if (n < 31) return `${n} ngày trước`;
  if (n < 365) return `${Math.floor(n / 30)} tháng trước`;
  const y = Math.floor(n / 365);
  const mo = Math.floor((n % 365) / 30);
  return mo ? `${y} năm ${mo} tháng trước` : `${y} năm trước`;
}

export function MemoryDetail({
  memory,
  onClose,
  onEdit,
  onPhoto,
}: {
  memory: Memory | null;
  onClose: () => void;
  onEdit: (m: Memory) => void;
  onPhoto: (ids: string[], index: number) => void;
}) {
  const { deleteMemory, toggleFavorite, doc, backend } = useData();
  const memories = doc.memories;
  const nameOf = useAuthorName();
  const { confirm, toast } = useUI();
  const [idx, setIdx] = useState(0);
  // luôn lấy bản mới nhất (vd. sau khi bấm yêu thích)
  const m = memory ? memories.find((x) => x.id === memory.id) ?? memory : null;

  useEffect(() => setIdx(0), [memory?.id]);

  const remove = async () => {
    if (!m) return;
    const ok = await confirm({
      title: 'Xoá kỉ niệm này?',
      message:
        backend.kind === 'drive'
          ? `“${m.title}” sẽ bị xoá khỏi dòng thời gian. Ảnh vẫn được giữ trong kho ảnh trên Google Drive.`
          : `“${m.title}” cùng ${m.photoIds.length} ảnh sẽ bị xoá vĩnh viễn khỏi thiết bị.`,
      confirmText: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    onClose();
    await deleteMemory(m.id);
    toast('Đã xoá kỉ niệm');
  };

  const photos = m?.photoIds ?? [];
  const mood = m ? MOODS[m.mood] ?? MOODS.happy : null;
  const step = (d: number) => setIdx((i) => (i + d + photos.length) % photos.length);

  return (
    <Modal open={!!memory} onClose={onClose} wide label="Kỉ niệm">
      {m && mood && (
        <article className="detail">
          {photos.length > 0 && (
            <div className="detail__media">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={photos[idx]}
                  className="detail__slide"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <PhotoImg id={photos[idx]} size="full" onClick={() => onPhoto(photos, idx)} />
                </motion.div>
              </AnimatePresence>
              {photos.length > 1 && (
                <>
                  <button className="detail__nav detail__nav--prev icon-btn" onClick={() => step(-1)} aria-label="Ảnh trước">
                    <IconChevron dir="left" />
                  </button>
                  <button className="detail__nav detail__nav--next icon-btn" onClick={() => step(1)} aria-label="Ảnh sau">
                    <IconChevron />
                  </button>
                  <div className="detail__dots">
                    {photos.map((p, i) => (
                      <button key={p} className={i === idx ? 'is-on' : ''} onClick={() => setIdx(i)} aria-label={`Ảnh ${i + 1}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="detail__body">
            <div className="detail__meta">
              <span className="chip chip--mood">
                {mood.emoji} {mood.label}
              </span>
              <span className="detail__ago">{ago(m.date)}</span>
            </div>
            {m.timelineId !== MAIN_TIMELINE && (() => {
              const j = doc.timelines.find((t) => t.id === m.timelineId);
              return j ? <span className="card__journey detail__journey">{j.emoji} {j.title}</span> : null;
            })()}
            <h2 className="detail__title">{m.title}</h2>
            <p className="detail__date">{formatLong(m.date)}</p>
            {m.location && (
              <p className="detail__loc">
                <IconPin size={16} /> {m.location}
              </p>
            )}
            <Ornament className="ornament--left" />
            {m.story ? <p className="detail__story">{m.story}</p> : <p className="detail__story is-empty">Chưa có lời kể nào…</p>}
            {m.tags.length > 0 && (
              <div className="card__tags">
                {m.tags.map((t) => (
                  <span key={t} className="tag">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {m.by && m.by.email !== 'local' && <p className="detail__by">— {nameOf(m.by)} đã viết</p>}
            <div className="detail__actions">
              <button className={`btn btn--ghost ${m.favorite ? 'is-fav' : ''}`} onClick={() => toggleFavorite(m.id)}>
                <IconHeart size={16} filled={m.favorite} /> {m.favorite ? 'Đã yêu thích' : 'Yêu thích'}
              </button>
              <button className="btn btn--ghost" onClick={() => onEdit(m)}>
                <IconEdit size={16} /> Sửa
              </button>
              <button className="btn btn--ghost btn--danger-text" onClick={remove}>
                <IconTrash size={16} /> Xoá
              </button>
            </div>
          </div>
        </article>
      )}
    </Modal>
  );
}
