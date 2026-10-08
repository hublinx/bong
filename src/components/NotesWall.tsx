import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Author, NoteColor } from '../types';
import { useAuthorName, useData } from '../lib/data';
import { uid } from '../lib/id';
import { relativeTime } from '../lib/date';
import { IconPinNote, IconTrash } from './Icons';
import { Ornament, useUI } from './UI';

const COLORS: NoteColor[] = ['cream', 'rose', 'sage', 'lilac', 'sky'];

// góc nghiêng cố định theo id để giấy nhớ trông tự nhiên mà không nhảy mỗi lần render
function tilt(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.8;
}

export function NotesWall() {
  const { doc, saveNote, deleteNote, me } = useData();
  const { notes, settings } = doc;
  const nameOf = useAuthorName();
  const { confirm } = useUI();
  const [text, setText] = useState('');
  // chế độ dùng thử: một máy dùng chung nên cho chọn ai viết
  const local = me.email === 'local';
  const [localWho, setLocalWho] = useState<'me' | 'partner'>('me');
  const author: Author = local ? { email: 'local', name: localWho === 'me' ? settings.myName : settings.partnerName } : me;
  const partner = Object.values(doc.members).find((m) => m.email !== me.email);
  const recipient = local ? (localWho === 'me' ? settings.partnerName : settings.myName) : partner?.name ?? settings.partnerName;
  const [color, setColor] = useState<NoteColor>('cream');

  const sorted = useMemo(
    () => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt),
    [notes],
  );

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    await saveNote({ id: uid(), text: t, by: author, color, pinned: false, createdAt: Date.now() });
    setText('');
  };

  return (
    <section className="notes-section">
      <div className="section-head">
        <Ornament />
        <h2 className="section-title">Những lời nhắn</h2>
        <p className="section-sub">Một góc nhỏ cho những điều muốn nói, những lời hứa và cả những điều vụn vặt</p>
      </div>

      <div className={`composer note--${color}`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder={`Viết gì đó cho ${recipient}…`}
          rows={3}
          maxLength={600}
        />
        <div className="composer__bar">
          {local && (
            <div className="composer__who">
              {(['me', 'partner'] as const).map((a) => (
                <button key={a} className={`chip chip--filter ${localWho === a ? 'is-on' : ''}`} onClick={() => setLocalWho(a)}>
                  {a === 'me' ? settings.myName : settings.partnerName} viết
                </button>
              ))}
            </div>
          )}
          <div className="composer__colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch note--${c} ${color === c ? 'is-on' : ''}`}
                onClick={() => setColor(c)}
                aria-label={`Màu ${c}`}
              />
            ))}
          </div>
          <button className="btn btn--gold btn--sm" onClick={add} disabled={!text.trim()}>
            Ghim lên tường
          </button>
        </div>
      </div>

      <div className="notes">
        <AnimatePresence>
          {sorted.map((n) => (
            <motion.div
              key={n.id}
              layout
              className={`note note--${n.color} ${n.pinned ? 'is-pinned' : ''}`}
              style={{ rotate: tilt(n.id) }}
              initial={{ opacity: 0, scale: 0.7, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 12 }}
              whileHover={{ rotate: 0, scale: 1.03, zIndex: 2 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <span className="note__tape" aria-hidden />
              <p className="note__text">{n.text}</p>
              <div className="note__foot">
                <span className="note__author">— {n.by.email === me.email && !local ? 'Bạn' : nameOf(n.by)}</span>
                <span className="note__time">{relativeTime(n.createdAt)}</span>
              </div>
              <div className="note__tools">
                <button
                  onClick={() => saveNote({ ...n, pinned: !n.pinned })}
                  aria-label={n.pinned ? 'Bỏ ghim' : 'Ghim'}
                  className={n.pinned ? 'is-on' : ''}
                >
                  <IconPinNote size={15} />
                </button>
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Gỡ lời nhắn này?', confirmText: 'Gỡ', danger: true })) deleteNote(n.id);
                  }}
                  aria-label="Xoá"
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!sorted.length && <p className="notes__empty">Bức tường còn trống — hãy để lại lời nhắn đầu tiên ♡</p>}
      </div>
    </section>
  );
}
