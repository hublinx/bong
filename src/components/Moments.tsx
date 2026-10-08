import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Moment } from '../types';
import { useAuthorName, useData } from '../lib/data';
import { relativeTime } from '../lib/date';
import { Avatar } from './Avatar';
import { IconCamera, IconPlus, IconTrash } from './Icons';
import { PhotoImg } from './PhotoImg';
import { Ornament, useUI } from './UI';

export const REACTIONS = ['❤️', '😍', '😂', '🥹', '🔥', '🥰'];

function MomentCard({
  m,
  onPhoto,
  onToMemory,
}: {
  m: Moment;
  onPhoto: () => void;
  onToMemory: () => void;
}) {
  const { me, reactMoment, deleteMoment } = useData();
  const { confirm } = useUI();
  const nameOf = useAuthorName();
  const mine = m.by.email === me.email;
  const myReaction = m.reactions[me.email];
  const others = Object.entries(m.reactions).filter(([e]) => e !== me.email);
  const [burst, setBurst] = useState<string | null>(null);

  const react = (e: string) => {
    const next = myReaction === e ? null : e;
    if (next) {
      setBurst(next);
      setTimeout(() => setBurst(null), 900);
    }
    reactMoment(m.id, next);
  };

  return (
    <motion.article
      className="moment"
      layout
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="moment__frame" onDoubleClick={() => react('❤️')}>
        <PhotoImg id={m.photoId} size="full" onClick={onPhoto} />
        {m.caption && <span className="moment__caption">{m.caption}</span>}
        {(others.length > 0 || myReaction) && (
          <div className="moment__reacts">
            {others.map(([e, r]) => (
              <span key={e}>{r}</span>
            ))}
            {myReaction && <span className="is-mine">{myReaction}</span>}
          </div>
        )}
        <AnimatePresence>
          {burst && (
            <motion.span
              className="moment__burst"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.6, opacity: 1 }}
              exit={{ scale: 2.4, opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
            >
              {burst}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="moment__meta">
        <Avatar author={m.by} size={30} />
        <span className="moment__who">{mine ? 'Bạn' : nameOf(m.by)}</span>
        <span className="moment__time">{relativeTime(m.createdAt)}</span>
        <div className="moment__tools">
          <button onClick={onToMemory} aria-label="Lưu thành kỉ niệm" title="Lưu thành kỉ niệm">
            <IconPlus size={16} />
          </button>
          {mine && (
            <button
              onClick={async () => {
                if (await confirm({ title: 'Xoá khoảnh khắc này?', confirmText: 'Xoá', danger: true })) deleteMoment(m.id);
              }}
              aria-label="Xoá"
            >
              <IconTrash size={16} />
            </button>
          )}
        </div>
      </div>
      {!mine && (
        <div className="moment__bar">
          {REACTIONS.map((e) => (
            <button key={e} className={myReaction === e ? 'is-on' : ''} onClick={() => react(e)} aria-label={`Thả ${e}`}>
              {e}
            </button>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export function Moments({
  onCamera,
  onPhoto,
  onToMemory,
}: {
  onCamera: () => void;
  onPhoto: (ids: string[], i: number) => void;
  onToMemory: (m: Moment) => void;
}) {
  const { doc, me } = useData();
  const nameOf = useAuthorName();
  const [who, setWho] = useState<'all' | 'me' | 'them'>('all');

  const list = useMemo(
    () =>
      [...doc.moments]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((m) => who === 'all' || (who === 'me') === (m.by.email === me.email)),
    [doc.moments, who, me.email],
  );
  const ids = list.map((m) => m.photoId);
  const partner = Object.values(doc.members).find((m) => m.email !== me.email);
  const local = me.email === 'local';

  return (
    <section className="moments-section">
      <div className="section-head">
        <Ornament />
        <h2 className="section-title">Khoảnh khắc</h2>
        <p className="section-sub">Những tấm ảnh nhỏ gửi nhau mỗi ngày, ngay lúc này, ở nơi này</p>
      </div>

      <motion.button className="snap-cta" onClick={onCamera} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
        <span className="snap-cta__icon">
          <IconCamera size={28} />
        </span>
        <span>
          <b>Chụp một khoảnh khắc</b>
          <small>{partner ? `${partner.name} sẽ thấy ngay khi mở app` : 'Gửi cho người ấy một tấm ảnh ngay bây giờ'}</small>
        </span>
      </motion.button>

      {!local && doc.moments.length > 0 && (
        <div className="filters__chips moments__filter">
          <button className={`chip chip--filter ${who === 'all' ? 'is-on' : ''}`} onClick={() => setWho('all')}>
            Tất cả
          </button>
          <button className={`chip chip--filter ${who === 'them' ? 'is-on' : ''}`} onClick={() => setWho('them')}>
            Của {partner ? nameOf(partner) : 'người ấy'}
          </button>
          <button className={`chip chip--filter ${who === 'me' ? 'is-on' : ''}`} onClick={() => setWho('me')}>
            Của mình
          </button>
        </div>
      )}

      <div className="moments">
        {list.map((m, i) => (
          <MomentCard key={m.id} m={m} onPhoto={() => onPhoto(ids, i)} onToMemory={() => onToMemory(m)} />
        ))}
        {!list.length && <p className="notes__empty">Chưa có khoảnh khắc nào — bấm nút chụp phía trên nhé 📸</p>}
      </div>
    </section>
  );
}

/** Ô nhỏ trên trang chủ: khoảnh khắc mới nhất của người kia. */
export function LatestMoment({ onOpen }: { onOpen: () => void }) {
  const { doc, me } = useData();
  const nameOf = useAuthorName();
  const latest = useMemo(() => {
    const sorted = [...doc.moments].sort((a, b) => b.createdAt - a.createdAt);
    return sorted.find((m) => m.by.email !== me.email) ?? sorted[0];
  }, [doc.moments, me.email]);
  if (!latest) return null;
  const mine = latest.by.email === me.email;
  return (
    <motion.button
      className="latest"
      onClick={onOpen}
      initial={{ opacity: 0, y: 20, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: -3 }}
      whileHover={{ rotate: 0, scale: 1.04 }}
      transition={{ delay: 1.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <PhotoImg id={latest.photoId} className="latest__img" />
      <span className="latest__text">
        <small>{mine ? 'Bạn vừa gửi' : `${nameOf(latest.by)} gửi bạn`}</small>
        <b>{latest.caption || 'một khoảnh khắc'}</b>
        <small>{relativeTime(latest.createdAt)}</small>
      </span>
    </motion.button>
  );
}
