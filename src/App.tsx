import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Memory } from './types';
import { useData } from './lib/data';
import { Ambient } from './components/Ambient';
import { Gallery } from './components/Gallery';
import { Hero } from './components/Hero';
import { Lightbox } from './components/Lightbox';
import { MemoryDetail } from './components/MemoryDetail';
import { MemoryEditor } from './components/MemoryEditor';
import { Nav, type View } from './components/Nav';
import { NotesWall } from './components/NotesWall';
import { SettingsPanel } from './components/SettingsPanel';
import { Timeline } from './components/Timeline';

export default function App() {
  const { ready, settings } = useData();
  const [view, setView] = useState<View>('timeline');
  const [editing, setEditing] = useState<{ open: boolean; memory: Memory | null }>({ open: false, memory: null });
  const [viewing, setViewing] = useState<Memory | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    const el = contentRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const changeView = (v: View) => {
    setView(v);
    // nếu đang ở dưới phần nội dung thì cuộn lên đầu mục mới
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el && el.getBoundingClientRect().top < 0) scrollToContent();
    });
  };

  const create = () => setEditing({ open: true, memory: null });
  const openPhotos = (ids: string[], index: number) => setLightbox({ ids, index });

  return (
    <>
      <Ambient />
      <Nav view={view} onView={changeView} onCreate={create} onSettings={() => setSettingsOpen(true)} />

      <Hero onSetup={() => setSettingsOpen(true)} onExplore={scrollToContent} />

      <main className="content" ref={contentRef}>
        {ready && (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === 'timeline' && <Timeline onOpen={setViewing} onPhoto={openPhotos} onCreate={create} />}
              {view === 'gallery' && <Gallery onPhoto={openPhotos} onCreate={create} />}
              {view === 'notes' && <NotesWall />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="footer">
        <span className="footer__heart">♡</span>
        <p>
          Được viết bằng cả trái tim · {settings.myName} &amp; {settings.partnerName}
        </p>
      </footer>

      <MemoryDetail
        memory={viewing}
        onClose={() => setViewing(null)}
        onEdit={(m) => setEditing({ open: true, memory: m })}
        onPhoto={openPhotos}
      />
      <MemoryEditor
        open={editing.open}
        initial={editing.memory}
        onClose={() => setEditing((e) => ({ ...e, open: false }))}
        onSaved={(m) => {
          if (!editing.memory) setView('timeline');
          else setViewing(m);
        }}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Lightbox ids={lightbox?.ids ?? null} start={lightbox?.index ?? 0} onClose={() => setLightbox(null)} />
    </>
  );
}
