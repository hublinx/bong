import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePhoto } from '../lib/photos';
import { IconChevron, IconClose, IconDownload } from './Icons';

function Slide({ id }: { id: string }) {
  const { url } = usePhoto(id, 'full');
  const thumb = usePhoto(id, 'thumb').url;
  return <img className="lightbox__img" src={url ?? thumb} alt="" draggable={false} />;
}

export function Lightbox({
  ids,
  start,
  onClose,
}: {
  ids: string[] | null;
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const [dir, setDir] = useState(0);
  const open = !!ids && ids.length > 0;
  const count = ids?.length ?? 0;
  const { url: fullUrl } = usePhoto(open ? ids![i] : undefined, 'full');

  useEffect(() => setI(start), [start, ids]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    // capture để Esc đóng lightbox trước modal phía dưới
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const go = (d: number) => {
    if (count < 2) return;
    setDir(d);
    setI((x) => (x + d + count) % count);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
        >
          <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox__count">
              {i + 1} / {count}
            </span>
            <div>
              {fullUrl && (
                <a className="icon-btn" href={fullUrl} download={`bong-${i + 1}.jpg`} aria-label="Tải ảnh">
                  <IconDownload />
                </a>
              )}
              <button className="icon-btn" onClick={onClose} aria-label="Đóng">
                <IconClose />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={ids![i]}
              className="lightbox__stage"
              custom={dir}
              initial={{ opacity: 0, x: dir * 80, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: dir * -80, scale: 0.96 }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              drag={count > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) go(1);
                else if (info.offset.x > 80) go(-1);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Slide id={ids![i]} />
            </motion.div>
          </AnimatePresence>

          {count > 1 && (
            <>
              <button
                className="lightbox__nav lightbox__nav--prev icon-btn"
                onClick={(e) => (e.stopPropagation(), go(-1))}
                aria-label="Ảnh trước"
              >
                <IconChevron dir="left" size={26} />
              </button>
              <button
                className="lightbox__nav lightbox__nav--next icon-btn"
                onClick={(e) => (e.stopPropagation(), go(1))}
                aria-label="Ảnh sau"
              >
                <IconChevron size={26} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
