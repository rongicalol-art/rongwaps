import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import { AppSettingsDrawer, LayoutShell } from './app/index';
import { TabScreens, prefetchTabScreen } from './app/components/TabScreens';
import { useResponsiveNav } from './app/hooks/useResponsiveNav';
import { useReaderLauncher } from './app/hooks/useReaderLauncher';
import { useGrammarLauncher } from './app/hooks/useGrammarLauncher';
import { DictionaryDetailOverlay } from './features/dictionary';
import { GrammarLessonScreen } from './screens/grammar-lesson';
import { ReaderScreen } from './screens/reader';
import { AppIcon, IconActionButton, LoadingScreen } from './lib/widgets';
import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { useResetProgress } from './hooks/useResetProgress';
import { useBookTheme } from './hooks/useBookTheme';
import { SignInWindow } from './screens/auth';

// Activity screens stay lazy: the practice modal wrapper opens first and each
// activity streams in under its ScreenSkeleton. Grammar + Reader are eager
// WINDOW SHELLS (their heavy content chunks load inside, under a spinner).
const ActivityModals = lazy(() => import('./screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));
// Dev-only debug tools. import.meta.env.DEV is statically false in production
// builds, so the dynamic import chunk is dropped from the bundle graph.
const DebugWindow = import.meta.env.DEV
  ? lazy(() => import('./screens/debug/DebugWindow').then((m) => ({ default: m.DebugWindow })))
  : null;

// Route is the source of truth for the top-level workspace; the persisted
// store tab only decides where a bare '/' boots.
const TAB_ROUTES = {
  path: '/path',
  search: '/search',
  library: '/library',
  profile: '/profile',
} as const;

type TabRoute = keyof typeof TAB_ROUTES;

function tabFromPathname(pathname: string): TabRoute | null {
  const first = pathname.split('/')[1];
  return first && first in TAB_ROUTES ? (first as TabRoute) : null;
}

export default function App() {
  useAudioUnlock();
  useCloudSync();

  // Per-slice selectors: a no-argument useAppStore() call would subscribe the
  // shell to every store change (including SRS progress updates).
  const activeBookId = useAppStore((state) => state.activeBookId);
  const setActiveBookId = useAppStore((state) => state.setActiveBookId);
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useAppStore((state) => state.setIsSettingsOpen);
  const { currentUser, isLoading } = useAuth();
  
  const {
    activeTab,
    setActiveTab,
    activeActivity,
    setActiveActivity,
    selectedLessons,
    toggleLesson,
    startPathPractice,
  } = useAppNavigation();

  const { isNavOpen, setIsNavOpen, setResponsiveNavOpen, isDesktop } = useResponsiveNav(activeTab);
  const [showDebugWindow, setShowDebugWindow] = useState(false);
  const [isInitialAuthOpen, setIsInitialAuthOpen] = useState(true);

  const { activeGrammarPartId, setActiveGrammarPartId, activeGrammarPart } = useGrammarLauncher();
  const { readings, activeReadingIndex, openReader, closeReader, navigateReader } = useReaderLauncher({
    selectedLessons,
    activeBookId,
    activeGrammarPartId,
  });

  const handleResetProgress = useResetProgress({
    currentUser,
    onActivityCleared: () => setActiveActivity(null),
    onGrammarCleared: () => setActiveGrammarPartId(null),
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === '0' && e.ctrlKey && e.shiftKey) {
        setShowDebugWindow((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const store = useAppStore.getState();
    if (store.activeActivity === 'create-card') {
      store.setActiveActivity(null);
    }
  }, []);

  const actualActiveBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const isLibraryOrSearch = activeTab === 'library' || activeTab === 'search';
  const activeBook = isLibraryOrSearch ? SAMPLE_BOOKS[0] : actualActiveBook;

  useBookTheme(activeBook.theme);

  const activeReading = activeReadingIndex !== null ? readings[activeReadingIndex] : null;
  const isReaderOpen = Boolean(activeReading);
  const isGrammarOpen = Boolean(activeGrammarPart);
  const dictionaryWord = useAppStore((state) => state.dictionaryWord);
  const isOverlayActive = isReaderOpen || isGrammarOpen || Boolean(dictionaryWord);

  useEffect(() => {
    useAppStore.getState().setIsOverlayOpen(isOverlayActive);
  }, [isOverlayActive]);

  const navigate = useNavigate();
  const location = useLocation();
  const routeTab = tabFromPathname(location.pathname);

  // The route drives the workspace: every location change (sidebar click,
  // browser back/forward, deep link) runs the same tab-change side effects
  // the old onTabChange handler owned.
  useEffect(() => {
    if (!routeTab || routeTab === activeTab) return;
    // Sidebar navigation is workspace-level: dismiss every open
    // full-viewport/column window (Reading Mode, grammar lesson,
    // dictionary word detail) so the destination tab actually comes
    // to the front instead of switching behind the still-open window.
    closeReader();
    setActiveActivity(null);
    setActiveGrammarPartId(null);
    const store = useAppStore.getState();
    store.setDictionaryWord(null);
    setActiveTab(routeTab);
    // Kick off the destination tab's chunk immediately so the switch is
    // instant when the user actually lands there (the browser dedupes
    // the import with React.lazy's own fetch).
    prefetchTabScreen(routeTab);
    store.setIsReviewMode(false);
    store.setActiveReviewSessionCards(null);
    store.setIsSearchOpen(false);
  }, [routeTab, activeTab, closeReader, setActiveActivity, setActiveGrammarPartId, setActiveTab]);

  const handleTabChange = (tab: TabRoute) => {
    navigate(TAB_ROUTES[tab]);
    if (!isDesktop()) setIsNavOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ui-canvas">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <>
      <LayoutShell
        activeTab={activeTab}
        activeActivity={isOverlayActive ? null : activeActivity}
        practiceCanvasOpen={Boolean(dictionaryWord)}
        activeBook={activeBook}
        isNavOpen={isNavOpen}
        setIsNavOpen={setResponsiveNavOpen}
        isOverlayActive={isOverlayActive}
        onSettingsClick={() => {
          setIsSettingsOpen(true);
          if (!isDesktop()) setIsNavOpen(false);
        }}
        onTabChange={handleTabChange}
        activityModals={
          <Suspense fallback={null}>
            <ActivityModals
              activeActivity={activeActivity}
              setActiveActivity={setActiveActivity}
              activeBookId={activeBook.id}
              selectedLessons={selectedLessons}
              isLibraryMode={activeTab === 'library'}
              onNavigateToPractice={() => {
                navigate(TAB_ROUTES.path);
                setActiveActivity(null);
              }}
              onOpenGrammarPart={(partId) => setActiveGrammarPartId(partId)}
              onOpenReading={() => void openReader(activeBook.id)}
            />
          </Suspense>
        }
      >
        <Routes>
          {/* '/' renders the persisted tab — boot restore keeps working; the
              catch-all sends unknown URLs to the persisted tab. */}
          <Route index element={<TabScreens activeTab={activeTab} activeBookId={activeBookId} setActiveBookId={setActiveBookId} selectedLessons={selectedLessons} toggleLesson={toggleLesson} startPathPractice={startPathPractice} setActiveTab={handleTabChange} setActiveActivity={setActiveActivity} isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />} />
          <Route path={TAB_ROUTES.path.slice(1)} element={<TabScreens activeTab="path" activeBookId={activeBookId} setActiveBookId={setActiveBookId} selectedLessons={selectedLessons} toggleLesson={toggleLesson} startPathPractice={startPathPractice} setActiveTab={handleTabChange} setActiveActivity={setActiveActivity} isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />} />
          <Route path={TAB_ROUTES.search.slice(1)} element={<TabScreens activeTab="search" activeBookId={activeBookId} setActiveBookId={setActiveBookId} selectedLessons={selectedLessons} toggleLesson={toggleLesson} startPathPractice={startPathPractice} setActiveTab={handleTabChange} setActiveActivity={setActiveActivity} isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />} />
          <Route path={TAB_ROUTES.library.slice(1)} element={<TabScreens activeTab="library" activeBookId={activeBookId} setActiveBookId={setActiveBookId} selectedLessons={selectedLessons} toggleLesson={toggleLesson} startPathPractice={startPathPractice} setActiveTab={handleTabChange} setActiveActivity={setActiveActivity} isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />} />
          <Route path={TAB_ROUTES.profile.slice(1)} element={<TabScreens activeTab="profile" activeBookId={activeBookId} setActiveBookId={setActiveBookId} selectedLessons={selectedLessons} toggleLesson={toggleLesson} startPathPractice={startPathPractice} setActiveTab={handleTabChange} setActiveActivity={setActiveActivity} isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />} />
          <Route path="*" element={<Navigate to={`/${activeTab}`} replace />} />
        </Routes>
      </LayoutShell>

      <AnimatePresence>
        {activeGrammarPart && (
          <GrammarLessonScreen
            key={activeGrammarPart.id}
            part={activeGrammarPart}
            onClose={() => setActiveGrammarPartId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeReadingIndex !== null && readings[activeReadingIndex] && (
          <ReaderScreen
            key="reader-screen"
            readings={readings}
            index={activeReadingIndex}
            onNavigate={navigateReader}
            onClose={closeReader}
          />
        )}
      </AnimatePresence>

      <DictionaryDetailOverlay />
      <AppSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterPreference={characterPreference}
        onCharacterPreferenceChange={setCharacterPreference}
        onResetProgress={handleResetProgress}
      />

      <AnimatePresence>
        {!currentUser && isInitialAuthOpen && (
          <SignInWindow onClose={() => setIsInitialAuthOpen(false)} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showDebugWindow && DebugWindow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="workspace-window absolute inset-0 z-[1000] bg-white flex flex-col overflow-auto overscroll-none"
          >
            <div className="sticky top-0 right-0 p-4 shrink-0 flex justify-end bg-white/90 backdrop-blur-sm shadow-sm z-10">
              <IconActionButton
                onClick={() => setShowDebugWindow(false)}
                label="Close debug tools"
                icon={<AppIcon name="close" size={24} />}
                className="h-12 w-12 rounded-full"
              />
            </div>
            <div className="relative isolate flex min-h-0 flex-1">
              <Suspense fallback={<LoadingScreen message="Loading debug tools..." />}>
                {DebugWindow && <DebugWindow />}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
