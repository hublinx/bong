import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconClose } from './Icons';

/* ---------- Modal ---------- */

let openModals = 0;

export function Modal({
  open,
  onClose,
  children,
  wide,
  label,
  bare,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  label: string;
  bare?: boolean;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openModals += 1;
    document.body.style.overflow = 'hidden';
    const myLevel = openModals;
    const onKey = (e: KeyboardEvent) => {
      // chỉ modal trên cùng mới phản ứng phím Esc
      if (e.key === 'Escape' && myLevel === openModals) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            className={`modal ${wide ? 'modal--wide' : ''} ${bare ? 'modal--bare' : ''}`}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <button className="modal__close icon-btn" onClick={onClose} aria-label="Đóng">
              <IconClose />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toast + Confirm ---------- */

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
}

interface UICtx {
  toast: (msg: string) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })),
    [],
  );

  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="toast"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <span className="toast__dot" />
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal open={!!confirmState} onClose={() => close(false)} label="Xác nhận">
        {confirmState && (
          <div className="confirm">
            <h3 className="confirm__title">{confirmState.title}</h3>
            {confirmState.message && <p className="confirm__msg">{confirmState.message}</p>}
            <div className="confirm__actions">
              <button className="btn btn--ghost" onClick={() => close(false)}>
                Thôi
              </button>
              <button
                className={`btn ${confirmState.danger ? 'btn--danger' : 'btn--gold'}`}
                onClick={() => close(true)}
                autoFocus
              >
                {confirmState.confirmText ?? 'Đồng ý'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI phải nằm trong UIProvider');
  return c;
}

/* ---------- Ornament ---------- */

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden>
      <span className="ornament__line" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c.7 5 3 7.3 8 8-5 .7-7.3 3-8 8-.7-5-3-7.3-8-8 5-.7 7.3-3 8-8Z" />
      </svg>
      <span className="ornament__line" />
    </div>
  );
}
