import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryPhoto, PhotoFolder } from '../lib/backend/types';
import { useData } from '../lib/data';
import { formatShort, toDayString } from '../lib/date';
import { processImage } from '../lib/image';
import { IconDrive, IconImage, IconUpload } from './Icons';
import { PhotoImg } from './PhotoImg';
import { useUI } from './UI';

function Tile({ p, caption, onClick, i }: { p: LibraryPhoto; caption: string; onClick: () => void; i: number }) {
  return (
    <motion.figure
      className="gallery__tile"
      style={{ aspectRatio: `${p.width} / ${p.height}` }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
    >
      <PhotoImg id={p.id} />
      <figcaption>
        {caption && <span>{caption}</span>}
        <small>{formatShort(toDayString(new Date(p.createdAt)))}</small>
      </figcaption>
    </motion.figure>
  );
}

export function Gallery({ onPhoto }: { onPhoto: (ids: string[], index: number) => void }) {
  const { library, refreshLibrary, backend, doc, upload } = useData();
  const { toast } = useUI();
  const [filter, setFilter] = useState<'all' | PhotoFolder>('all');
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const captions = useMemo(() => {
    const c = new Map<string, string>();
    doc.moments.forEach((m) => m.caption && c.set(m.photoId, m.caption));
    doc.memories.forEach((m) => m.photoIds.forEach((id) => c.set(id, m.title)));
    return c;
  }, [doc]);

  const items = useMemo(() => (library ?? []).filter((p) => filter === 'all' || p.folder === filter).sort((a, b) => b.createdAt - a.createdAt), [library, filter]);
  const ids = items.map((x) => x.id);

  const addFiles = async (files: FileList) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    setUploading(list.length);
    for (const f of list) {
      try {
        await upload(await processImage(f), 'memories');
      } catch (e) {
        toast(`Chưa tải lên được “${f.name}”${e instanceof Error ? `: ${e.message}` : ''}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  return (
    <>
      <div className="gallery__bar">
        <div className="filters__chips">
          {(
            [
              ['all', 'Tất cả'],
              ['memories', 'Ảnh kỉ niệm'],
              ['moments', 'Khoảnh khắc'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={`chip chip--filter ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="gallery__actions">
          {backend.folderUrl && (
            <a className="btn btn--ghost btn--sm" href={backend.folderUrl} target="_blank" rel="noreferrer">
              <IconDrive size={15} /> Mở trên Drive
            </a>
          )}
          <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            {uploading > 0 ? <span className="spinner spinner--sm" /> : <IconUpload size={15} />}
            {uploading > 0 ? `Đang tải ${uploading} ảnh…` : 'Tải ảnh vào kho'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => (e.target.files && addFiles(e.target.files), (e.target.value = ''))} />
        </div>
      </div>

      {library === null ? (
        <div className="picker__loading">
          <span className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty empty--small">
          <div className="empty__seal">
            <IconImage size={30} />
          </div>
          <p className="empty__text">
            {backend.kind === 'drive'
              ? 'Kho còn trống. Ảnh trong kỉ niệm, khoảnh khắc, hoặc ảnh bạn thả thẳng vào thư mục Drive đều sẽ hiện ở đây.'
              : 'Ảnh trong các kỉ niệm và khoảnh khắc sẽ hiện ở đây.'}
          </p>
        </div>
      ) : (
        <div className="gallery">
          {items.map((p, i) => (
            <Tile key={p.id} p={p} i={i} caption={captions.get(p.id) ?? ''} onClick={() => onPhoto(ids, i)} />
          ))}
        </div>
      )}
    </>
  );
}
