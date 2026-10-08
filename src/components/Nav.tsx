import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { useData } from '../lib/data';
import { IconCamera, IconHeart, IconMap, IconNote, IconPlus, IconTimeline } from './Icons';

export type View = 'story' | 'journeys' | 'moments' | 'notes';

const TABS: { key: View; label: string; Icon: typeof IconTimeline }[] = [
  { key: 'story', label: 'Kỉ niệm', Icon: IconTimeline },
  { key: 'journeys', label: 'Hành trình', Icon: IconMap },
  { key: 'moments', label: 'Khoảnh khắc', Icon: IconHeart },
  { key: 'notes', label: 'Lời nhắn', Icon: IconNote },
];

export function Nav({
  view,
  onView,
  onCreate,
  onCamera,
  onSettings,
}: {
  view: View;
  onView: (v: View) => void;
  onCreate: () => void;
  onCamera: () => void;
  onSettings: () => void;
}) {
  const { doc, profile, sync, me } = useData();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 40));

  const { settings } = doc;
  const initials = `${settings.myName.charAt(0)}&${settings.partnerName.charAt(0)}`;
  // khoảnh khắc mới từ người kia trong 24 giờ qua
  const fresh = doc.moments.some((m) => m.by.email !== me.email && Date.now() - m.createdAt < 86_400_000);

  const avatar = (
    <button className={`me-btn sync-${sync}`} onClick={onSettings} aria-label="Tài khoản và cài đặt" title={sync === 'saving' ? 'Đang lưu…' : sync === 'error' ? 'Chưa lưu được' : 'Đã đồng bộ'}>
      {profile.picture ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" /> : <span>{profile.name.charAt(0)}</span>}
      <i className="me-btn__dot" />
    </button>
  );

  return (
    <>
      <motion.nav
        className={`topbar ${solid ? 'is-solid' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <button className="monogram" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Về đầu trang">
          {initials}
        </button>
        <div className="tabs" role="tablist">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} role="tab" aria-selected={view === key} className={`tab ${view === key ? 'is-on' : ''}`} onClick={() => onView(key)}>
              {view === key && <motion.span layoutId="tab-pill" className="tab__pill" transition={{ type: 'spring', damping: 30, stiffness: 320 }} />}
              <Icon size={17} />
              <span>{label}</span>
              {key === 'moments' && fresh && view !== 'moments' && <i className="tab__dot" />}
            </button>
          ))}
        </div>
        <div className="topbar__right">
          <button className="icon-btn topbar__desk" onClick={onCamera} aria-label="Chụp khoảnh khắc" title="Chụp khoảnh khắc">
            <IconCamera />
          </button>
          <button className="btn btn--gold btn--sm topbar__desk" onClick={onCreate}>
            <IconPlus size={16} /> Kỉ niệm mới
          </button>
          {avatar}
        </div>
      </motion.nav>

      {/* thanh dưới cho điện thoại */}
      <nav className="bottombar">
        {TABS.slice(0, 2).map(({ key, label, Icon }) => (
          <button key={key} className={`bottombar__tab ${view === key ? 'is-on' : ''}`} onClick={() => onView(key)}>
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button className="bottombar__fab" onClick={onCamera} aria-label="Chụp khoảnh khắc">
          <IconCamera size={26} />
        </button>
        {TABS.slice(2).map(({ key, label, Icon }) => (
          <button key={key} className={`bottombar__tab ${view === key ? 'is-on' : ''}`} onClick={() => onView(key)}>
            <Icon size={22} />
            <span>{label}</span>
            {key === 'moments' && fresh && view !== 'moments' && <i className="tab__dot" />}
          </button>
        ))}
      </nav>
    </>
  );
}
