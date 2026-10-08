import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Memory, MoodKey } from '../types';
import { useData } from '../lib/data';
import { store } from '../lib/db';
import { uid } from '../lib/id';
import { processImage } from '../lib/image';
import { forgetPhotos } from '../lib/photos';
import { MOODS, MOOD_KEYS } from '../lib/moods';
import { today } from '../lib/date';
import { IconClose, IconImage, IconSparkle } from './Icons';
import { PhotoImg } from './PhotoImg';
import { Modal, useUI } from './UI';

function blank(): Memory {
  const now = Date.now();
  return {
    id: uid(),
    title: '',
    date: today(),
    location: '',
    mood: 'love',
    story: '',
    tags: [],
    photoIds: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function MemoryEditor({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Memory | null;
  onClose: () => void;
  onSaved?: (m: Memory) => void;
}) {
  const { saveMemory } = useData();
  const { toast } = useUI();
  const [m, setM] = useState<Memory>(blank);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const added = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setM(initial ? { ...initial, tags: [...initial.tags], photoIds: [...initial.photoIds] } : blank());
    setTagDraft('');
    added.current = [];
  }, [open, initial]);

  const set = <K extends keyof Memory>(k: K, v: Memory[K]) => setM((x) => ({ ...x, [k]: v }));

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    setBusy((b) => b + list.length);
    for (const f of list) {
      try {
        const photo = await processImage(f);
        await store.putPhoto(photo);
        added.current.push(photo.id);
        setM((x) => ({ ...x, photoIds: [...x.photoIds, photo.id] }));
      } catch {
        toast(`Không đọc được ảnh “${f.name}”`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  const removePhoto = (id: string) => setM((x) => ({ ...x, photoIds: x.photoIds.filter((p) => p !== id) }));
  const makeCover = (id: string) => setM((x) => ({ ...x, photoIds: [id, ...x.photoIds.filter((p) => p !== id)] }));

  const commitTag = () => {
    const parts = tagDraft
      .split(/[,#]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parts.length) setM((x) => ({ ...x, tags: [...new Set([...x.tags, ...parts])] }));
    setTagDraft('');
  };

  const cancel = async () => {
    // xoá các ảnh vừa thêm nhưng chưa lưu
    const orphan = added.current;
    added.current = [];
    onClose();
    await store.deletePhotos(orphan);
    forgetPhotos(orphan);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || saving) return;
    setSaving(true);
    const pendingTag = tagDraft.trim()
      ? tagDraft.split(/[,#]/).map((t) => t.trim()).filter(Boolean)
      : [];
    const final: Memory = {
      ...m,
      title: m.title.trim() || 'Một ngày đáng nhớ',
      location: m.location.trim(),
      story: m.story.trim(),
      tags: [...new Set([...m.tags, ...pendingTag])],
      updatedAt: Date.now(),
    };
    const removed = [...(initial?.photoIds ?? []), ...added.current].filter((id) => !final.photoIds.includes(id));
    try {
      await saveMemory(final, removed);
      added.current = [];
      toast(initial ? 'Đã cập nhật kỉ niệm ✨' : 'Đã cất giữ một kỉ niệm mới ✨');
      onClose();
      onSaved?.(final);
    } catch {
      toast('Có lỗi khi lưu — bộ nhớ trình duyệt có thể đã đầy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={cancel} wide label={initial ? 'Sửa kỉ niệm' : 'Kỉ niệm mới'}>
      <form className="editor" onSubmit={submit}>
        <div className="editor__head">
          <span className="eyebrow">
            <IconSparkle size={14} /> {initial ? 'Chỉnh sửa' : 'Trang mới'}
          </span>
          <input
            className="editor__title"
            value={m.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Đặt tên cho kỉ niệm này…"
            autoFocus={!initial}
            maxLength={120}
          />
        </div>

        <div
          className={`dropzone ${drag ? 'is-drag' : ''}`}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          {m.photoIds.length > 0 && (
            <div className="dropzone__grid">
              <AnimatePresence>
                {m.photoIds.map((id, i) => (
                  <motion.div
                    key={id}
                    className="thumb"
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <PhotoImg id={id} />
                    {i === 0 ? (
                      <span className="thumb__cover">Ảnh bìa</span>
                    ) : (
                      <button type="button" className="thumb__make-cover" onClick={() => makeCover(id)}>
                        Đặt làm bìa
                      </button>
                    )}
                    <button type="button" className="thumb__remove" onClick={() => removePhoto(id)} aria-label="Bỏ ảnh">
                      <IconClose size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {Array.from({ length: busy }, (_, i) => (
                <div key={`p${i}`} className="thumb thumb--loading">
                  <span className="spinner" />
                </div>
              ))}
            </div>
          )}
          <button type="button" className="dropzone__btn" onClick={() => fileRef.current?.click()}>
            {busy > 0 && !m.photoIds.length ? <span className="spinner" /> : <IconImage size={26} />}
            <span>
              <b>Thêm ảnh</b> — kéo thả hoặc bấm để chọn
            </span>
            <small>Ảnh được nén gọn và chỉ lưu trên thiết bị này</small>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="editor__row">
          <label className="field">
            <span className="field__label">Ngày</span>
            <input type="date" value={m.date} onChange={(e) => set('date', e.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">Ở đâu</span>
            <input value={m.location} onChange={(e) => set('location', e.target.value)} placeholder="Đà Lạt, quán cà phê quen…" />
          </label>
        </div>

        <div className="field">
          <span className="field__label">Cảm xúc</span>
          <div className="moods">
            {MOOD_KEYS.map((k: MoodKey) => (
              <button
                type="button"
                key={k}
                className={`mood ${m.mood === k ? 'is-on' : ''}`}
                onClick={() => set('mood', k)}
              >
                <span className="mood__emoji">{MOODS[k].emoji}</span>
                <span>{MOODS[k].label}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Câu chuyện</span>
          <textarea
            value={m.story}
            onChange={(e) => set('story', e.target.value)}
            rows={6}
            placeholder="Hôm ấy trời thế nào, hai đứa đã nói gì, điều gì khiến mình muốn nhớ mãi…"
          />
        </label>

        <div className="field">
          <span className="field__label">Thẻ</span>
          <div className="tags-input">
            {m.tags.map((t) => (
              <span key={t} className="tag tag--removable">
                #{t}
                <button type="button" onClick={() => set('tags', m.tags.filter((x) => x !== t))} aria-label={`Bỏ thẻ ${t}`}>
                  <IconClose size={12} />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitTag();
                } else if (e.key === 'Backspace' && !tagDraft && m.tags.length) {
                  set('tags', m.tags.slice(0, -1));
                }
              }}
              onBlur={commitTag}
              placeholder={m.tags.length ? '' : 'hẹn hò, du lịch, sinh nhật… (Enter để thêm)'}
            />
          </div>
        </div>

        <div className="editor__actions">
          <button type="button" className="btn btn--ghost" onClick={cancel}>
            Huỷ
          </button>
          <button type="submit" className="btn btn--gold" disabled={busy > 0 || saving}>
            {busy > 0 ? 'Đang xử lý ảnh…' : saving ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Cất giữ kỉ niệm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
