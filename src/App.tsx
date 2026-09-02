import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import type { InteractiveGrammarPart, ReadingRecord } from './types/models';
import { AppSettingsDrawer, LayoutShell } from './app/index';
import { DictionaryDetailOverlay } from './features/dictionary';

import {
  ErrorBoundary,
  AppIcon,
  IconActionButton,
  LoadingScreen
} from './lib/widgets';

import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { useResetProgress } from './hooks/useResetProgress';
import { useBookTheme } from './hooks/useBookTheme';
import { resolveActiveReadingIndex } from './utils/readingContext';

// Route-level code splitting: only the active screen's code is fetched (AGENTS.md perf).
const CurriculumLibrary = React.lazy(() => import('./screens/curriculum').then((m) => ({ default: m.CurriculumLibrary })));
const ProfileScreen = React.lazy(() => import('./screens/profile').then((m) => ({ default: m.ProfileScreen })));
const SearchScreen = React.lazy(() => import('./screens/search').then((m) => ({ default: m.SearchScreen })));
const LibraryScreen = React.lazy(() => import('./screens/library').then((m) => ({ default: m.LibraryScreen })));
const ActivityModals = React.lazy(() => import('./screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));
const GrammarLessonScreen = React.lazy(() => import('./screens/grammar-lesson').then((m) => ({ default: m.GrammarLessonScreen })));
const ReaderScreen = React.lazy(() => import('./screens/reader').then((m) => ({ default: m.ReaderScreen })));

const DebugWindow = React.lazy(() => (
  import('./screens/debug/DebugWindow').then((module) => ({ default: module.DebugWindow }))
));

// Lazy-load the interactive grammar data on demand. The data module re-exports
// all lesson parts (~tens of KB); it must not ship in the main chunk.
async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  const { getInteractiveGrammarPart } = await import('./data/interactiveGrammarPages');
  return getInteractiveGrammarPart(partId);
}

// Readings derive from the grammar data, which is large — load them on demand.
async function loadReadings(bookId: number): Promise<ReadingRecord[]> {
  const { getReadingsForBook } = await import('./data/readings');
  return getReadingsForBook(bookId);
}

const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
);

const DESKTOP_NAV_PREFERENCE_KEY = 'rongwaps:desktop-nav-open';

const getInitialNavOpen = () => {
  if (!isDesktopViewport()) return false;
  return window.localStorage.getItem(DESKTOP_NAV_PREFERENCE_KEY) !== 'false';
};

export default function App() {
  // Initialize global audio
  useAudioUnlock();
  
  // Sync user progress automatically
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
    headerProps,
    startPathPractice
  } = useAppNavigation();

  const [isNavOpen, setIsNavOpen] = React.useState(() => (
    activeTab === 'path' && isDesktopViewport() ? true : getInitialNavOpen()
  ));
  const [showDebugWindow, setShowDebugWindow] = useState(false);
  const [activeGrammarPartId, setActiveGrammarPartId] = useState<string | null>(null);
  const [activeGrammarPart, setActiveGrammarPart] = useState<Awaited<
    ReturnType<typeof loadInteractiveGrammarPart>
  > | null>(null);
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [activeReadingIndex, setActiveReadingIndex] = useState<number | null>(null);

  const openReader = React.useCallback(async (bookId: number) => {
    const loaded = await loadReadings(bookId);
    if (!loaded.length) {
      setReadings([]);
      setActiveReadingIndex(null);
      return;
    }
    const store = useAppStore.getState();
    const targetIdx = resolveActiveReadingIndex({
      bookId,
      selectedLessons: store.selectedLessons.length > 0 ? store.selectedLessons : selectedLessons,
      selectedLessonParts: store.selectedLessonParts,
      readings: loaded,
    });
    setReadings(loaded);
    setActiveReadingIndex(targetIdx);
  }, [selectedLessons]);

  const closeReader = React.useCallback(() => {
    setActiveReadingIndex(null);
    setReadings([]);
  }, []);

  const navigateReader = React.useCallback((targetIndex: number) => {
    setActiveReadingIndex((current) => {
      if (current === null) return current;
      const nextIndex = Math.min(Math.max(targetIndex, 0), readings.length - 1);
      return nextIndex === current ? current : nextIndex;
    });
  }, [readings.length]);

  // Load the grammar part lazily — the interactive grammar data is large and
  // must not ship in the main chunk. Only fetched when a part is actually opened.
  useEffect(() => {
    if (!activeGrammarPartId) {
      setActiveGrammarPart(null);
      return;
    }
    let cancelled = false;
    void loadInteractiveGrammarPart(activeGrammarPartId).then((part) => {
      if (!cancelled) setActiveGrammarPart(part);
    });
    return () => {
      cancelled = true;
    };
  }, [activeGrammarPartId]);

  const handleResetProgress = useResetProgress({
    currentUser,
    onActivityCleared: () => setActiveActivity(null),
    onGrammarCleared: () => setActiveGrammarPartId(null),
  });

  const setResponsiveNavOpen = React.useCallback((open: boolean) => {
    setIsNavOpen(open);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncNavToViewport = (event: MediaQueryListEvent) => {
      setIsNavOpen(
        event.matches
          ? window.localStorage.getItem(DESKTOP_NAV_PREFERENCE_KEY) !== 'false'
          : false,
      );
    };

    desktopQuery.addEventListener('change', syncNavToViewport);

    return () => {
      desktopQuery.removeEventListener('change', syncNavToViewport);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopViewport()) return;
    window.localStorage.setItem(DESKTOP_NAV_PREFERENCE_KEY, String(isNavOpen));
  }, [activeTab, isNavOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === '0' && e.ctrlKey && e.shiftKey) {
        setShowDebugWindow(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 'r' toggles the reading overlay. Temporary keybind — no visible button
  // until an entry point is designed.
  useEffect(() => {
    const handleReaderKey = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      if (!target || (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key.toLowerCase() !== 'r' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // Never stack the reader over a lesson already in progress.
      if (activeGrammarPartId) return;
      if (activeReadingIndex !== null) closeReader();
      else void openReader(activeBookId);
    };
    window.addEventListener('keydown', handleReaderKey);
    return () => window.removeEventListener('keydown', handleReaderKey);
  }, [activeGrammarPartId, activeReadingIndex, activeBookId, closeReader, openReader]);

  // A practice session survives page reloads (tab switches, tab discards) via
  // the persisted store. The transient add-card form is the exception: never
  // reopen it after a reload — its draft input is gone anyway.
  useEffect(() => {
    const store = useAppStore.getState();
    if (store.activeActivity === 'create-card') {
      store.setActiveActivity(null);
    }
  }, []);

  const actualActiveBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const isLibraryOrSearch = activeTab === 'library' || activeTab === 'search';
  const activeBook = isLibraryOrSearch ? SAMPLE_BOOKS[0] : actualActiveBook;

  // Theme the whole app (brand-* tokens) with the active book's palette.
  useBookTheme(activeBook.theme);

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
        activeActivity={activeActivity}
        activeBook={activeBook}
        isNavOpen={isNavOpen}
        setIsNavOpen={setResponsiveNavOpen}
        headerProps={headerProps}
        onProfileClick={() => setActiveTab('profile')}
        onSettingsClick={() => {
          setIsSettingsOpen(true);
          if (!isDesktopViewport()) setIsNavOpen(false);
        }}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveActivity(null);
          setActiveGrammarPartId(null);
          const store = useAppStore.getState();
          store.setIsReviewMode(false);
          store.setActiveReviewSessionCards(null);
          store.setIsSearchOpen(false);
          if (!isDesktopViewport()) setIsNavOpen(false);
        }}
        activityModals={
          <React.Suspense fallback={null}>
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
              onOpenGrammarPart={(partId) => {
                setActiveGrammarPartId(partId);
              }}
              onOpenReading={() => {
                void openReader(activeBook.id);
              }}
            />
          </React.Suspense>
        }
      >
        <AnimatePresence mode="wait">
          {activeTab === 'path' && (
            <motion.div
              key="path"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex w-full shrink-0 flex-col"
            >
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingScreen message="Loading lessons…" />}>
                  <CurriculumLibrary
                    activeBookId={activeBookId}
                    onActiveBookChange={setActiveBookId}
                    selectedLessons={selectedLessons}
                    onToggleLesson={toggleLesson}
                    onStartPractice={startPathPractice}
                    onProfileClick={() => setActiveTab('profile')}
                    menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }}
                  />
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col w-full"
            >
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingScreen message="Loading library…" />}>
                  <LibraryScreen
                    onAddCard={() => setActiveActivity('create-card')}
                    onPlayFlashcards={() => setActiveActivity('flashcards-library')}
                    menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }}
                  />
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col w-full"
            >
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingScreen message="Loading dictionary…" />}>
                  <SearchScreen menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }} />
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col w-full"
            >
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingScreen message="Loading profile…" />}>
                  <ProfileScreen
                    onStartReview={() => {
                      const store = useAppStore.getState();
                      store.setIsReviewMode(true);
                      store.setActiveReviewSessionCards(null);
                      setActiveActivity('flashcards-review');
                    }}
                  />
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutShell>

      <AnimatePresence>
        {activeGrammarPart && (
          <React.Suspense fallback={<LoadingScreen message="Loading grammar lesson…" />}>
            <GrammarLessonScreen
              key={activeGrammarPart.id}
              part={activeGrammarPart}
              onClose={() => setActiveGrammarPartId(null)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeReadingIndex !== null && readings[activeReadingIndex] && (
          <React.Suspense fallback={<LoadingScreen message="Loading reading…" />}>
            <ReaderScreen
              key="reader-screen"
              readings={readings}
              index={activeReadingIndex}
              onNavigate={navigateReader}
              onClose={closeReader}
            />
          </React.Suspense>
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
              <React.Suspense fallback={<LoadingScreen message="Loading debug tools..." />}>
                <DebugWindow />
              </React.Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
