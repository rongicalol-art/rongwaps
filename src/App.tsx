import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import { getInteractiveGrammarPart } from './data/interactiveGrammarPages';

import {
  GlobalDictionaryModal,
  LayoutShell,
  ErrorBoundary,
  AppSettingsDrawer,
  AppIcon,
  IconActionButton,
  LoadingScreen
} from './lib/widgets';

import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { useResetProgress } from './hooks/useResetProgress';

// Route-level code splitting: only the active screen's code is fetched (AGENTS.md perf).
const CurriculumLibrary = React.lazy(() => import('./screens/curriculum').then((m) => ({ default: m.CurriculumLibrary })));
const ProfileScreen = React.lazy(() => import('./screens/profile').then((m) => ({ default: m.ProfileScreen })));
const SearchScreen = React.lazy(() => import('./screens/search').then((m) => ({ default: m.SearchScreen })));
const LibraryScreen = React.lazy(() => import('./screens/library').then((m) => ({ default: m.LibraryScreen })));
const ActivityModals = React.lazy(() => import('./screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));
const GrammarLessonScreen = React.lazy(() => import('./screens/grammar-lesson').then((m) => ({ default: m.GrammarLessonScreen })));

const DebugWindow = React.lazy(() => (
  import('./screens/debug/DebugWindow').then((module) => ({ default: module.DebugWindow }))
));

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
  const activeGrammarPart = activeGrammarPartId
    ? getInteractiveGrammarPart(activeGrammarPartId)
    : undefined;

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

  const actualActiveBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const isLibraryOrSearch = activeTab === 'library' || activeTab === 'search';
  const activeBook = isLibraryOrSearch ? SAMPLE_BOOKS[0] : actualActiveBook;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ui-canvas">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1CB0F6]"></div>
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
                setActiveActivity(null);
                setActiveGrammarPartId(partId);
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

      <GlobalDictionaryModal />
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
