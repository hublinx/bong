import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { useData } from '../lib/data';
import { IconImage, IconNote, IconPlus, IconSettings, IconTimeline } from './Icons';

export type View = 'timeline' | 'gallery' | 'notes';

const TABS: { key: View; label: string; Icon: typeof IconTimeline }[] = [
  { key: 'timeline', label: 'Kỉ niệm', Icon: IconTimeline },
  { key: 'gallery', label: 'Kho ảnh', Icon: IconImage },
  { key: 'notes', label: 'Lời nhắn', Icon: IconNote },
];

export function Nav({
  view,
  onView,
  onCreate,
  onSettings,
}: {
  view: View;
  onView: (v: View) => void;
  onCreate: () => void;
  onSettings: () => void;
}) {
  const { settings } = useData();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 40));

  const initials = `${settings.myName.charAt(0)}&${settings.partnerName.charAt(0)}`;

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
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              className={`tab ${view === key ? 'is-on' : ''}`}
              onClick={() => onView(key)}
            >
              {view === key && <motion.span layoutId="tab-pill" className="tab__pill" transition={{ type: 'spring', damping: 30, stiffness: 320 }} />}
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="topbar__right">
          <button className="btn btn--gold btn--sm topbar__add" onClick={onCreate}>
            <IconPlus size={16} /> Kỉ niệm mới
          </button>
          <button className="icon-btn" onClick={onSettings} aria-label="Cài đặt">
            <IconSettings />
          </button>
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
        <button className="bottombar__fab" onClick={onCreate} aria-label="Kỉ niệm mới">
          <IconPlus size={26} />
        </button>
        {TABS.slice(2).map(({ key, label, Icon }) => (
          <button key={key} className={`bottombar__tab ${view === key ? 'is-on' : ''}`} onClick={() => onView(key)}>
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button className="bottombar__tab" onClick={onSettings}>
          <IconSettings size={22} />
          <span>Cài đặt</span>
        </button>
      </nav>
    </>
  );
}
