import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
const DebugWindow = lazy(() => import('./screens/debug/DebugWindow').then((m) => ({ default: m.DebugWindow })));

export default function App() {
  useAudioUnlock();
  useCloudSync();

  const {
    activeBookId,
    setActiveBookId,
    characterPreference,
    setCharacterPreference,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useAppStore();
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
        onTabChange={(tab) => {
          // Sidebar navigation is workspace-level: dismiss every open
          // full-viewport/column window (Reading Mode, grammar lesson,
          // dictionary word detail) so the destination tab actually comes
          // to the front instead of switching behind the still-open window.
          closeReader();
          setActiveActivity(null);
          setActiveGrammarPartId(null);
          const store = useAppStore.getState();
          store.setDictionaryWord(null);
          setActiveTab(tab);
          // Kick off the destination tab's chunk immediately so the switch is
          // instant when the user actually lands there (the browser dedupes
          // the import with React.lazy's own fetch).
          prefetchTabScreen(tab);
          store.setIsReviewMode(false);
          store.setActiveReviewSessionCards(null);
          store.setIsSearchOpen(false);
          if (!isDesktop()) setIsNavOpen(false);
        }}
        activityModals={
          <Suspense fallback={null}>
            <ActivityModals 
              activeActivity={activeActivity}
              setActiveActivity={setActiveActivity}
              activeBookId={activeBook.id}
              selectedLessons={selectedLessons}
              isLibraryMode={activeTab === 'library'}
              onNavigateToPractice={() => {
                setActiveTab('path');
                setActiveActivity(null);
              }}
              onOpenGrammarPart={(partId) => setActiveGrammarPartId(partId)}
              onOpenReading={() => void openReader(activeBook.id)}
            />
          </Suspense>
        }
      >
        <TabScreens
          activeTab={activeTab}
          activeBookId={activeBookId}
          setActiveBookId={setActiveBookId}
          selectedLessons={selectedLessons}
          toggleLesson={toggleLesson}
          startPathPractice={startPathPractice}
          setActiveTab={setActiveTab}
          setActiveActivity={setActiveActivity}
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
        />
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
        {showDebugWindow && (
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
                <DebugWindow />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
