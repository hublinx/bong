import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { Memory, MoodKey } from '../types';
import { useData } from '../lib/data';
import { MOODS, MOOD_KEYS } from '../lib/moods';
import { formatShort, parseDay, today } from '../lib/date';
import { MemoryCard } from './MemoryCard';
import { IconHeart, IconPlus, IconSearch, IconSparkle } from './Icons';
import { Ornament } from './UI';
import { PhotoImg } from './PhotoImg';

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function OnThisDay({ memories, onOpen }: { memories: Memory[]; onOpen: (m: Memory) => void }) {
  const t = today();
  const md = t.slice(5);
  const year = Number(t.slice(0, 4));
  const list = memories.filter((m) => m.date.slice(5) === md && Number(m.date.slice(0, 4)) < year);
  if (!list.length) return null;
  return (
    <motion.section
      className="otd"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
    >
      <div className="otd__head">
        <IconSparkle size={18} />
        <span>Ngày này năm xưa</span>
      </div>
      <div className="otd__list">
        {list.map((m) => {
          const ago = year - Number(m.date.slice(0, 4));
          return (
            <button key={m.id} className="otd__item" onClick={() => onOpen(m)}>
              {m.photoIds[0] && <PhotoImg id={m.photoIds[0]} className="otd__img" />}
              <div>
                <span className="otd__ago">{ago} năm trước · {formatShort(m.date)}</span>
                <span className="otd__title">{m.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

export function Timeline({
  onOpen,
  onPhoto,
  onCreate,
}: {
  onOpen: (m: Memory) => void;
  onPhoto: (photoIds: string[], index: number) => void;
  onCreate: () => void;
}) {
  const { memories } = useData();
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: lineRef, offset: ['start 70%', 'end 70%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const usedMoods = useMemo(() => MOOD_KEYS.filter((k) => memories.some((m) => m.mood === k)), [memories]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return memories.filter((m) => {
      if (favOnly && !m.favorite) return false;
      if (mood && m.mood !== mood) return false;
      if (!q) return true;
      return normalize([m.title, m.story, m.location, m.tags.join(' ')].join(' ')).includes(q);
    });
  }, [memories, query, mood, favOnly]);

  const groups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    for (const m of filtered) {
      const y = m.date.slice(0, 4) || '—';
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!memories.length) {
    return (
      <section className="empty">
        <motion.div
          className="empty__inner"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <div className="empty__seal">
            <IconHeart size={34} />
          </div>
          <h2 className="section-title">Trang đầu tiên đang chờ</h2>
          <p className="empty__text">
            Mỗi câu chuyện đẹp đều bắt đầu bằng một khoảnh khắc. Hãy lưu lại kỉ niệm đầu tiên của hai đứa — một tấm ảnh,
            một nơi chốn, một cảm xúc.
          </p>
          <button className="btn btn--gold btn--lg" onClick={onCreate}>
            <IconPlus size={18} /> Viết kỉ niệm đầu tiên
          </button>
        </motion.div>
      </section>
    );
  }

  let index = 0;

  return (
    <section className="timeline-section">
      <OnThisDay memories={memories} onOpen={onOpen} />

      <div className="section-head">
        <Ornament />
        <h2 className="section-title">Dòng thời gian</h2>
        <p className="section-sub">Những trang nhật kí nhỏ của chúng mình</p>
      </div>

      <div className="filters">
        <label className="search">
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm một kỉ niệm, một nơi chốn, một #tag…"
          />
        </label>
        <div className="filters__chips">
          <button className={`chip chip--filter ${!mood && !favOnly ? 'is-on' : ''}`} onClick={() => (setMood(null), setFavOnly(false))}>
            Tất cả
          </button>
          <button className={`chip chip--filter ${favOnly ? 'is-on' : ''}`} onClick={() => setFavOnly((v) => !v)}>
            <IconHeart size={13} filled={favOnly} /> Yêu thích
          </button>
          {usedMoods.map((k) => (
            <button key={k} className={`chip chip--filter ${mood === k ? 'is-on' : ''}`} onClick={() => setMood(mood === k ? null : k)}>
              {MOODS[k].emoji} {MOODS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline" ref={lineRef}>
        <div className="timeline__rail" aria-hidden>
          <motion.div className="timeline__fill" style={{ scaleY: progress }} />
        </div>

        <AnimatePresence mode="popLayout">
          {groups.length === 0 && (
            <motion.p className="timeline__none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Không tìm thấy kỉ niệm nào phù hợp.
            </motion.p>
          )}
        </AnimatePresence>

        {groups.map(([year, items]) => (
          <div key={year} className="tl-year">
            <motion.div
              className="tl-year__label"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span>{year}</span>
              <small>{items.length} kỉ niệm</small>
            </motion.div>
            {items.map((m) => {
              const side = index++ % 2 === 0 ? 'left' : 'right';
              return (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  side={side}
                  onOpen={() => onOpen(m)}
                  onPhoto={(i) => onPhoto(m.photoIds, i)}
                />
              );
            })}
          </div>
        ))}

        {groups.length > 0 && (
          <div className="timeline__end">
            <span className="timeline__end-dot" />
            <p>
              {(() => {
                const first = memories[memories.length - 1];
                const d = parseDay(first.date);
                return d ? `Nơi mọi chuyện bắt đầu · ${formatShort(first.date)}` : 'Nơi mọi chuyện bắt đầu';
              })()}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
