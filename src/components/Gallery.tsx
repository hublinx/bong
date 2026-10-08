import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useData } from '../lib/data';
import { formatShort } from '../lib/date';
import { IconImage, IconPlus } from './Icons';
import { PhotoImg } from './PhotoImg';
import { Ornament } from './UI';
import { usePhoto } from '../lib/photos';

function Tile({ id, caption, date, onClick, i }: { id: string; caption: string; date: string; onClick: () => void; i: number }) {
  const { ratio } = usePhoto(id, 'thumb');
  return (
    <motion.figure
      className="gallery__tile"
      style={{ aspectRatio: ratio ? String(ratio) : '4 / 5' }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
    >
      <PhotoImg id={id} />
      <figcaption>
        <span>{caption}</span>
        <small>{formatShort(date)}</small>
      </figcaption>
    </motion.figure>
  );
}

export function Gallery({ onPhoto, onCreate }: { onPhoto: (ids: string[], index: number) => void; onCreate: () => void }) {
  const { memories } = useData();
  const items = useMemo(
    () => memories.flatMap((m) => m.photoIds.map((id) => ({ id, caption: m.title, date: m.date }))),
    [memories],
  );
  const ids = useMemo(() => items.map((x) => x.id), [items]);

  return (
    <section className="gallery-section">
      <div className="section-head">
        <Ornament />
        <h2 className="section-title">Kho ảnh</h2>
        <p className="section-sub">{items.length ? `${items.length} khoảnh khắc được đóng khung` : 'Chưa có tấm ảnh nào'}</p>
      </div>
      {items.length === 0 ? (
        <div className="empty empty--small">
          <div className="empty__seal">
            <IconImage size={30} />
          </div>
          <p className="empty__text">Ảnh trong các kỉ niệm sẽ hiện ở đây, xếp thành một bức tường kỉ niệm.</p>
          <button className="btn btn--gold" onClick={onCreate}>
            <IconPlus size={16} /> Thêm kỉ niệm có ảnh
          </button>
        </div>
      ) : (
        <div className="gallery">
          {items.map((it, i) => (
            <Tile key={it.id} {...it} i={i} onClick={() => onPhoto(ids, i)} />
          ))}
        </div>
      )}
    </section>
  );
}
