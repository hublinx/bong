import { useEffect, useState } from 'react';
import { useData } from '../lib/data';
import { IconCheck, IconDrive } from './Icons';
import { PhotoImg } from './PhotoImg';
import { Modal } from './UI';

/** Chọn ảnh có sẵn trong kho (thư mục Drive chung). */
export function LibraryPicker({
  open,
  onClose,
  onPick,
  multiple = true,
  exclude = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  multiple?: boolean;
  exclude?: string[];
}) {
  const { library, refreshLibrary, backend } = useData();
  const [sel, setSel] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSel([]);
      refreshLibrary();
    }
  }, [open, refreshLibrary]);

  const list = (library ?? []).filter((p) => !exclude.includes(p.id));
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));

  return (
    <Modal open={open} onClose={onClose} wide label="Chọn ảnh từ kho">
      <div className="picker">
        <span className="eyebrow">
          <IconDrive size={14} /> {backend.kind === 'drive' ? 'Kho ảnh trên Google Drive' : 'Kho ảnh'}
        </span>
        <h2 className="settings__title">Chọn ảnh</h2>
        {backend.kind === 'drive' && (
          <p className="picker__hint">
            Mẹo: thả ảnh vào thư mục <b>Ảnh kỉ niệm</b> trên Google Drive (kể cả từ app Drive trên điện thoại) là ảnh sẽ hiện ở đây.
          </p>
        )}
        {library === null ? (
          <div className="picker__loading">
            <span className="spinner" />
          </div>
        ) : list.length === 0 ? (
          <p className="notes__empty">Kho đang trống.</p>
        ) : (
          <div className="picker__grid">
            {list.map((p) => (
              <button key={p.id} className={`picker__item ${sel.includes(p.id) ? 'is-on' : ''}`} onClick={() => toggle(p.id)}>
                <PhotoImg id={p.id} />
                <span className="picker__check">
                  <IconCheck size={14} />
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="editor__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            className="btn btn--gold"
            disabled={!sel.length}
            onClick={() => {
              onPick(sel);
              onClose();
            }}
          >
            Chọn {sel.length > 0 ? `${sel.length} ảnh` : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}
