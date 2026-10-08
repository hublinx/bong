import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../lib/data';
import { processImage, processSource } from '../lib/image';
import { IconBolt, IconClose, IconFlip, IconImage, IconSend } from './Icons';
import { useUI } from './UI';

type Facing = 'user' | 'environment';

/** Chụp khoảnh khắc trực tiếp, kiểu Locket: khung vuông, chú thích nhỏ, gửi ngay. */
export function Camera({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent?: () => void }) {
  const { upload, addMoment, doc, me } = useData();
  const { toast } = useUI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [flash, setFlash] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [camError, setCamError] = useState('');
  const [shot, setShot] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setCamError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Trình duyệt này không mở được camera. Bạn vẫn có thể chọn ảnh từ máy.');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setCamError(
        name === 'NotAllowedError'
          ? 'Bạn chưa cho phép dùng camera. Hãy bật quyền camera cho trang này nhé.'
          : 'Không mở được camera. Bạn vẫn có thể chọn ảnh từ máy.',
      );
    }
  }, [facing, stop]);

  useEffect(() => {
    if (open && !shot) start();
    return stop;
  }, [open, shot, start, stop]);

  useEffect(() => {
    if (!open) {
      setShot(null);
      setCaption('');
      setSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    if (flash && facing === 'user') {
      setFlashing(true);
      await new Promise((r) => setTimeout(r, 180));
    }
    const s = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d')!;
    if (facing === 'user') {
      ctx.translate(s, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, s, s);
    setFlashing(false);
    stop();
    setShot({ canvas: c, url: c.toDataURL('image/jpeg', 0.9) });
  };

  const fromFile = async (f: File) => {
    try {
      const p = await processImage(f);
      const img = new Image();
      img.src = URL.createObjectURL(p.full);
      await img.decode();
      // cắt vuông như ảnh chụp
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = s;
      c.height = s;
      c.getContext('2d')!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, s, s);
      URL.revokeObjectURL(img.src);
      stop();
      setShot({ canvas: c, url: c.toDataURL('image/jpeg', 0.9) });
    } catch {
      toast('Không đọc được ảnh này');
    }
  };

  const send = async () => {
    if (!shot || sending) return;
    setSending(true);
    try {
      const p = await processSource(shot.canvas);
      const meta = await upload(p, 'moments');
      await addMoment(meta, caption);
      const other = Object.values(doc.members).find((m) => m.email !== me.email);
      toast(`Đã gửi khoảnh khắc${other ? ` tới ${other.name}` : ''} ♡`);
      onSent?.();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? `Gửi chưa được: ${e.message}` : 'Gửi chưa được');
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="camera"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Chụp khoảnh khắc"
        >
          <div className="camera__top">
            <button className="icon-btn" onClick={onClose} aria-label="Đóng">
              <IconClose />
            </button>
            <span className="camera__title">{shot ? 'Gửi khoảnh khắc' : 'Khoảnh khắc'}</span>
            {!shot ? (
              <button
                className={`icon-btn ${flash ? 'is-on' : ''}`}
                onClick={() => setFlash((f) => !f)}
                aria-label="Đèn flash màn hình"
                aria-pressed={flash}
              >
                <IconBolt filled={flash} />
              </button>
            ) : (
              <span style={{ width: 42 }} />
            )}
          </div>

          <motion.div className="camera__frame" layout>
            {shot ? (
              <>
                <motion.img
                  src={shot.url}
                  alt=""
                  className="camera__shot"
                  initial={{ scale: 1.08, filter: 'brightness(2)' }}
                  animate={{ scale: 1, filter: 'brightness(1)' }}
                  transition={{ duration: 0.5 }}
                />
                <input
                  className="camera__caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Thêm lời nhắn…"
                  maxLength={60}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
              </>
            ) : camError ? (
              <div className="camera__error">
                <p>{camError}</p>
                <button className="btn btn--ghost btn--sm" onClick={start}>
                  Thử lại
                </button>
              </div>
            ) : (
              <video ref={videoRef} className={`camera__video ${facing === 'user' ? 'is-mirror' : ''}`} playsInline muted autoPlay />
            )}
            {sending && (
              <div className="camera__sending">
                <span className="spinner" />
              </div>
            )}
          </motion.div>

          <div className="camera__controls">
            {shot ? (
              <>
                <button className="camera__side" onClick={() => setShot(null)} disabled={sending} aria-label="Chụp lại">
                  <IconClose size={26} />
                </button>
                <button className="camera__shutter camera__shutter--send" onClick={send} disabled={sending} aria-label="Gửi">
                  <IconSend size={30} />
                </button>
                <span className="camera__side" />
              </>
            ) : (
              <>
                <button className="camera__side" onClick={() => fileRef.current?.click()} aria-label="Chọn ảnh từ máy">
                  <IconImage size={26} />
                </button>
                <button className="camera__shutter" onClick={capture} disabled={!!camError} aria-label="Chụp">
                  <span />
                </button>
                <button
                  className="camera__side"
                  onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                  aria-label="Đổi camera"
                >
                  <IconFlip size={26} />
                </button>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fromFile(f);
              e.target.value = '';
            }}
          />
          <AnimatePresence>
            {flashing && <motion.div className="camera__flash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
