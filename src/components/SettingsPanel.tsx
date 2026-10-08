import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';
import { useData } from '../lib/data';
import { exportBackup, importBackup } from '../lib/backup';
import { store } from '../lib/db';
import { IconDownload, IconSettings, IconTrash, IconUpload } from './Icons';
import { Modal, useUI } from './UI';

function fmtBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, saveSettings, reload } = useData();
  const { toast, confirm } = useUI();
  const [s, setS] = useState<Settings>(settings);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [working, setWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setS(settings);
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => {});
  }, [open, settings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      ...s,
      myName: s.myName.trim() || 'Tôi',
      partnerName: s.partnerName.trim() || 'Bông',
      tagline: s.tagline.trim(),
    });
    toast('Đã lưu cài đặt');
    onClose();
  };

  const doExport = async () => {
    setWorking(true);
    try {
      await exportBackup();
      toast('Đã tạo bản sao lưu');
    } catch {
      toast('Không thể xuất bản sao lưu');
    } finally {
      setWorking(false);
    }
  };

  const doImport = async (f: File) => {
    setWorking(true);
    try {
      const r = await importBackup(f);
      await reload();
      toast(`Đã khôi phục ${r.memories} kỉ niệm, ${r.photos} ảnh, ${r.notes} lời nhắn`);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'File sao lưu không hợp lệ');
    } finally {
      setWorking(false);
    }
  };

  const wipe = async () => {
    const ok = await confirm({
      title: 'Xoá toàn bộ dữ liệu?',
      message: 'Tất cả kỉ niệm, ảnh và lời nhắn trên thiết bị này sẽ biến mất. Hãy chắc rằng bạn đã sao lưu.',
      confirmText: 'Xoá hết',
      danger: true,
    });
    if (!ok) return;
    await store.clearAll();
    await reload();
    toast('Đã xoá toàn bộ dữ liệu');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label="Cài đặt">
      <form className="settings" onSubmit={save}>
        <span className="eyebrow">
          <IconSettings size={14} /> Cài đặt
        </span>
        <h2 className="settings__title">Câu chuyện của chúng mình</h2>

        <div className="editor__row">
          <label className="field">
            <span className="field__label">Tên của bạn</span>
            <input value={s.myName} onChange={(e) => setS({ ...s, myName: e.target.value })} maxLength={30} />
          </label>
          <label className="field">
            <span className="field__label">Tên người ấy</span>
            <input value={s.partnerName} onChange={(e) => setS({ ...s, partnerName: e.target.value })} maxLength={30} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Ngày bắt đầu</span>
          <input type="date" value={s.startDate} onChange={(e) => setS({ ...s, startDate: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Lời đề tựa</span>
          <input value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} maxLength={120} />
        </label>

        <div className="editor__actions">
          <button type="submit" className="btn btn--gold">
            Lưu
          </button>
        </div>

        <div className="settings__block">
          <h3>Sao lưu &amp; khôi phục</h3>
          <p>
            Dữ liệu được cất giữ riêng tư ngay trong trình duyệt của thiết bị này. Thỉnh thoảng hãy tải bản sao lưu về để
            giữ an toàn, hoặc để chuyển sang điện thoại / máy tính khác.
          </p>
          {usage && usage.quota > 0 && (
            <div className="usage">
              <div className="usage__bar">
                <span style={{ width: `${Math.max(1, Math.min(100, (usage.used / usage.quota) * 100))}%` }} />
              </div>
              <small>
                Đang dùng {fmtBytes(usage.used)} / {fmtBytes(usage.quota)}
              </small>
            </div>
          )}
          <div className="settings__btns">
            <button type="button" className="btn btn--ghost" onClick={doExport} disabled={working}>
              <IconDownload size={16} /> Tải bản sao lưu
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={working}>
              <IconUpload size={16} /> Khôi phục từ file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="settings__block settings__block--danger">
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={wipe}>
            <IconTrash size={16} /> Xoá toàn bộ dữ liệu
          </button>
        </div>
      </form>
    </Modal>
  );
}
