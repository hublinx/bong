import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import type { SpaceMember } from '../lib/backend/types';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { IconCloud, IconDrive, IconLogout, IconSettings, IconUsers } from './Icons';
import { Modal, useUI } from './UI';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { doc, saveSettings, backend, profile } = useData();
  const { signOut } = useAuth();
  const { toast, confirm } = useUI();
  const [s, setS] = useState<Settings>(doc.settings);
  const [members, setMembers] = useState<SpaceMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setS(doc.settings);
    if (backend.members) backend.members().then(setMembers).catch(() => setMembers(null));
  }, [open]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings({
        ...s,
        myName: s.myName.trim() || 'Hùng',
        partnerName: s.partnerName.trim() || 'Linh',
        tagline: s.tagline.trim(),
      });
      toast('Đã lưu cài đặt');
      onClose();
    } catch {
      /* đã báo lỗi */
    }
  };

  const invite = async () => {
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || !backend.invite) {
      toast('Email chưa đúng');
      return;
    }
    setInviting(true);
    try {
      await backend.invite(em, `${profile.givenName} mời bạn vào cuốn nhật kí "Hùng & Linh" ♡ Mở app và đăng nhập bằng email này nhé.`);
      toast(`Đã mời ${em} ✨`);
      setEmail('');
      backend.members?.().then(setMembers).catch(() => {});
    } catch (e) {
      toast(e instanceof Error ? `Chưa mời được: ${e.message}` : 'Chưa mời được');
    } finally {
      setInviting(false);
    }
  };

  const logout = async () => {
    const ok = await confirm({
      title: backend.kind === 'drive' ? 'Đăng xuất?' : 'Thoát chế độ dùng thử?',
      message: backend.kind === 'drive' ? 'Dữ liệu vẫn an toàn trên Google Drive.' : 'Dữ liệu dùng thử vẫn còn trên máy này cho lần sau.',
      confirmText: 'Đăng xuất',
    });
    if (ok) {
      onClose();
      signOut();
    }
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
            <span className="field__label">Tên người thứ nhất</span>
            <input value={s.myName} onChange={(e) => setS({ ...s, myName: e.target.value })} maxLength={30} />
          </label>
          <label className="field">
            <span className="field__label">Tên người thứ hai</span>
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
          <h3>
            <IconCloud size={20} /> Nơi lưu trữ
          </h3>
          <div className="account">
            {profile.picture ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{profile.name.charAt(0)}</span>}
            <span>
              <b>{backend.kind === 'drive' ? profile.name : 'Chế độ dùng thử'}</b>
              <small>{backend.kind === 'drive' ? profile.email : 'Dữ liệu chỉ nằm trên trình duyệt này'}</small>
            </span>
          </div>
          <p>{backend.label}</p>
          <div className="settings__btns">
            {backend.folderUrl && (
              <a className="btn btn--ghost" href={backend.folderUrl} target="_blank" rel="noreferrer">
                <IconDrive size={16} /> Mở thư mục trên Drive
              </a>
            )}
            <button type="button" className="btn btn--ghost" onClick={logout}>
              <IconLogout size={16} /> {backend.kind === 'drive' ? 'Đăng xuất' : 'Đăng nhập Google'}
            </button>
          </div>
        </div>

        {backend.invite && (
          <div className="settings__block">
            <h3>
              <IconUsers size={20} /> Mời người ấy
            </h3>
            <p>
              Nhập Gmail của người ấy: thư mục trên Drive sẽ được chia sẻ, và người ấy đăng nhập app bằng email đó là thấy chung mọi kỉ niệm.
            </p>
            {members && members.length > 0 && (
              <ul className="members">
                {members.map((m) => (
                  <li key={m.email}>
                    {m.picture ? <img src={m.picture} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{m.name.charAt(0)}</span>}
                    <span>
                      <b>{m.name}</b>
                      <small>{m.email}</small>
                    </span>
                    <em>{m.role === 'owner' ? 'Chủ sở hữu' : 'Cùng viết'}</em>
                  </li>
                ))}
              </ul>
            )}
            <div className="invite">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    invite();
                  }
                }}
                placeholder="linh@gmail.com"
              />
              <button type="button" className="btn btn--gold btn--sm" onClick={invite} disabled={inviting || !email.trim()}>
                {inviting ? 'Đang mời…' : 'Gửi lời mời'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
