import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { MAIN_TIMELINE, type Memory, type Moment, type Timeline } from './types';
import { useAuth } from './lib/auth';
import { DataProvider, useData } from './lib/data';
import { today, toDayString } from './lib/date';
import { Ambient } from './components/Ambient';
import { Camera } from './components/Camera';
import { Gallery } from './components/Gallery';
import { Hero } from './components/Hero';
import { JourneyEditor, Journeys, JourneyView } from './components/Journeys';
import { Lightbox } from './components/Lightbox';
import { LoginScreen, ReauthBanner } from './components/Login';
import { MemoryDetail } from './components/MemoryDetail';
import { MemoryEditor } from './components/MemoryEditor';
import { Moments } from './components/Moments';
import { Nav, type View } from './components/Nav';
import { NotesWall } from './components/NotesWall';
import { SettingsPanel } from './components/SettingsPanel';
import { MemoryTimeline, OnThisDay } from './components/Timeline';
import { IconPlus } from './components/Icons';
import { Ornament, useUI } from './components/UI';

export default function Root() {
  const { session } = useAuth();
  const { toast } = useUI();
  return (
    <>
      <Ambient />
      <ReauthBanner />
      {session.status === 'ready' ? (
        <DataProvider key={`${session.backend.kind}:${session.profile.email}`} backend={session.backend} profile={session.profile} onError={toast}>
          <App />
        </DataProvider>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

function Loading() {
  const { loadError, reload } = useData();
  const { signOut } = useAuth();
  return (
    <div className="login">
      <div className="login__card login__card--plain">
        {loadError ? (
          <>
            <p className="login__lead">Chưa mở được cuốn nhật kí: {loadError}</p>
            <button className="btn btn--gold" onClick={reload}>
              Thử lại
            </button>
            <button className="login__link" onClick={signOut}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <span className="spinner" />
            <p className="login__lead">Đang mở cuốn nhật kí…</p>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const { ready, doc } = useData();
  const [view, setView] = useState<View>('story');
  const [storyMode, setStoryMode] = useState<'timeline' | 'gallery'>('timeline');
  const [journey, setJourney] = useState<Timeline | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; memory: Memory | null; draft?: Partial<Memory> }>({ open: false, memory: null });
  const [journeyEditing, setJourneyEditing] = useState<{ open: boolean; t: Timeline | null }>({ open: false, t: null });
  const [viewing, setViewing] = useState<Memory | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!ready) return <Loading />;

  const scrollToContent = () => {
    const el = contentRef.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  };

  const changeView = (v: View) => {
    setView(v);
    if (v !== 'journeys') setJourney(null);
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el && el.getBoundingClientRect().top < 0) scrollToContent();
    });
  };

  const create = (draft?: Partial<Memory>) => setEditing({ open: true, memory: null, draft });
  const openPhotos = (ids: string[], index: number) => setLightbox({ ids, index });
  const openJourney = (t: Timeline) => {
    setView('journeys');
    setJourney(t);
    requestAnimationFrame(scrollToContent);
  };
  const momentToMemory = (m: Moment) =>
    create({ title: m.caption, date: toDayString(new Date(m.createdAt)), photoIds: [m.photoId], mood: 'love' });

  // câu chuyện chung: mọi kỉ niệm đã diễn ra (kể cả trong các hành trình)
  const t = today();
  const story = doc.memories.filter((m) => m.timelineId === MAIN_TIMELINE || m.date <= t);
  const contentKey = view === 'journeys' && journey ? `j:${journey.id}` : view;

  return (
    <>
      <Nav view={view} onView={changeView} onCreate={() => create()} onCamera={() => setCamera(true)} onSettings={() => setSettingsOpen(true)} />

      <Hero onSetup={() => setSettingsOpen(true)} onExplore={scrollToContent} onMoments={() => changeView('moments')} />

      <main className="content" ref={contentRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={contentKey}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {view === 'story' && (
              <section className="timeline-section">
                <OnThisDay memories={doc.memories} onOpen={setViewing} />
                <div className="section-head">
                  <Ornament />
                  <h2 className="section-title">{storyMode === 'timeline' ? 'Dòng thời gian' : 'Kho ảnh'}</h2>
                  <p className="section-sub">{storyMode === 'timeline' ? 'Những trang nhật kí nhỏ của chúng mình' : 'Mọi tấm ảnh của hai đứa, ở cùng một nơi'}</p>
                  <div className="segmented">
                    {(['timeline', 'gallery'] as const).map((k) => (
                      <button key={k} className={storyMode === k ? 'is-on' : ''} onClick={() => setStoryMode(k)}>
                        {storyMode === k && <motion.span layoutId="seg" className="segmented__pill" />}
                        <span>{k === 'timeline' ? 'Dòng thời gian' : 'Kho ảnh'}</span>
                      </button>
                    ))}
                  </div>
                  {storyMode === 'timeline' && story.length > 0 && (
                    <button className="btn btn--ghost btn--sm section-head__add" onClick={() => create()}>
                      <IconPlus size={15} /> Viết kỉ niệm
                    </button>
                  )}
                </div>
                {storyMode === 'timeline' ? (
                  <MemoryTimeline memories={story} onOpen={setViewing} onPhoto={openPhotos} onCreate={() => create()} showJourney />
                ) : (
                  <Gallery onPhoto={openPhotos} />
                )}
              </section>
            )}
            {view === 'journeys' &&
              (journey ? (
                <JourneyView
                  journey={journey}
                  onBack={() => setJourney(null)}
                  onEdit={(x) => setJourneyEditing({ open: true, t: x })}
                  onOpenMemory={setViewing}
                  onPhoto={openPhotos}
                  onAddMemory={(d) => create(d)}
                />
              ) : (
                <Journeys onOpen={openJourney} onCreate={() => setJourneyEditing({ open: true, t: null })} onOpenMemory={setViewing} />
              ))}
            {view === 'moments' && <Moments onCamera={() => setCamera(true)} onPhoto={openPhotos} onToMemory={momentToMemory} />}
            {view === 'notes' && <NotesWall />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="footer">
        <span className="footer__heart">♡</span>
        <p>
          Được viết bằng cả trái tim · {doc.settings.myName} &amp; {doc.settings.partnerName}
        </p>
      </footer>

      <MemoryDetail memory={viewing} onClose={() => setViewing(null)} onEdit={(m) => setEditing({ open: true, memory: m })} onPhoto={openPhotos} />
      <MemoryEditor
        open={editing.open}
        initial={editing.memory}
        draft={editing.draft}
        onClose={() => setEditing((e) => ({ ...e, open: false }))}
        onSaved={(m) => {
          if (editing.memory) setViewing(m);
          else if (m.timelineId === MAIN_TIMELINE && view !== 'story') changeView('story');
        }}
      />
      <JourneyEditor
        open={journeyEditing.open}
        initial={journeyEditing.t}
        onClose={() => setJourneyEditing((e) => ({ ...e, open: false }))}
        onSaved={(x) => !journeyEditing.t && openJourney(x)}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Camera open={camera} onClose={() => setCamera(false)} onSent={() => changeView('moments')} />
      <Lightbox ids={lightbox?.ids ?? null} start={lightbox?.index ?? 0} onClose={() => setLightbox(null)} />
    </>
  );
}
