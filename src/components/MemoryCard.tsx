import { motion } from 'framer-motion';
import type { Memory, Timeline } from '../types';
import { formatShort, parseDay } from '../lib/date';
import { MOODS } from '../lib/moods';
import { useData } from '../lib/data';
import { IconHeart, IconPin } from './Icons';
import { PhotoMosaic } from './PhotoMosaic';

export function MemoryCard({
  memory,
  side,
  planned,
  journey,
  onOpen,
  onPhoto,
}: {
  memory: Memory;
  side: 'left' | 'right';
  planned?: boolean;
  journey?: Timeline;
  onOpen: () => void;
  onPhoto: (index: number) => void;
}) {
  const { toggleFavorite } = useData();
  const mood = MOODS[memory.mood] ?? MOODS.happy;
  const d = parseDay(memory.date);

  return (
    <motion.article
      className={`tl-item tl-item--${side} ${planned ? 'is-planned' : ''}`}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="tl-item__node" aria-hidden>
        <span className="tl-item__emoji">{mood.emoji}</span>
      </div>

      <div className="tl-item__date">
        {d && (
          <>
            <span className="tl-item__day">{String(d.getDate()).padStart(2, '0')}</span>
            <span className="tl-item__month">Tháng {d.getMonth() + 1}</span>
          </>
        )}
      </div>

      <div
        className="card"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
        }}
      >
        {memory.photoIds.length > 0 && (
          <div className="card__media" onClick={(e) => e.stopPropagation()}>
            <PhotoMosaic ids={memory.photoIds} onOpen={onPhoto} />
          </div>
        )}
        <div className="card__body">
          <div className="card__meta">
            <span className="chip chip--mood">
              {mood.emoji} {mood.label}
            </span>
            <span className="card__date">{planned ? 'Dự kiến · ' : ''}{formatShort(memory.date)}</span>
          </div>
          {journey && (
            <span className="card__journey">
              {journey.emoji} {journey.title}
            </span>
          )}
          <h3 className="card__title">{memory.title || 'Một ngày đáng nhớ'}</h3>
          {memory.location && (
            <p className="card__loc">
              <IconPin size={14} /> {memory.location}
            </p>
          )}
          {memory.story && <p className="card__story">{memory.story}</p>}
          {memory.tags.length > 0 && (
            <div className="card__tags">
              {memory.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          className={`card__fav ${memory.favorite ? 'is-on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(memory.id);
          }}
          aria-label={memory.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
          aria-pressed={memory.favorite}
        >
          <IconHeart filled={memory.favorite} size={18} />
        </button>
      </div>
    </motion.article>
  );
}
