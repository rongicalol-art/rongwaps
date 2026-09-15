import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import { AppSettingsDrawer, LayoutShell } from './app/index';
import { AppRoutes } from './app/components/AppRoutes';
import { DebugToolsOverlay } from './app/components/DebugToolsOverlay';
import { GrammarWindow } from './app/components/GrammarWindow';
import { ReaderWindow } from './app/components/ReaderWindow';
import { useResponsiveNav } from './app/hooks/useResponsiveNav';
import { useReaderLauncher } from './app/hooks/useReaderLauncher';
import { useGrammarLauncher } from './app/hooks/useGrammarLauncher';
import { useOverlayUrlSync } from './app/hooks/useOverlayUrlSync';
import { useWorkspaceRouting } from './app/hooks/useWorkspaceRouting';
import { TAB_ROUTES } from './app/routes';
import { DictionaryDetailOverlay } from './features/dictionary';
import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { useResetProgress } from './hooks/useResetProgress';
import { useBookTheme } from './hooks/useBookTheme';
import { SignInWindow } from './screens/auth';

// Activity screens stay lazy: the practice modal wrapper opens first and each
// activity streams in under its ScreenSkeleton. Grammar + Reader are eager
// WINDOW SHELLS (their heavy content chunks load inside, under a spinner).
const ActivityModals = lazy(() => import('./screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));

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
  const isLibraryFolderView = useAppStore((state) => state.libraryActiveView === 'folder');
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

  const {
    isNavOpen,
    setIsNavOpen,
    setResponsiveNavOpen,
    isDesktop,
    isDesktopOrTablet,
    isCollapsed,
    toggleCollapse,
  } = useResponsiveNav();
  const [isInitialAuthOpen, setIsInitialAuthOpen] = useState(true);

  const { activeGrammarPartId, setActiveGrammarPartId, activeGrammarPageId, setActiveGrammarPageId, activeGrammarPart } = useGrammarLauncher();
  const { readings, activeReadingIndex, openReader, openReaderForPart, closeReader, navigateReader } = useReaderLauncher({
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
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const isOverlayActive = isReaderOpen || isGrammarOpen || Boolean(dictionaryWord);
  const showSidebarCollapse = Boolean(
    activeActivity || isReaderOpen || isGrammarOpen || (activeTab === 'library' && isLibraryFolderView)
  );

  useEffect(() => {
    useAppStore.getState().setIsOverlayOpen(isOverlayActive);
  }, [isOverlayActive]);

  const navigate = useNavigate();

  useOverlayUrlSync({
    reader: {
      activeReadingIndex,
      readingsLength: readings.length,
      activeBookId: activeBook.id,
      openReader,
      navigateReader,
      closeReader,
    },
    grammar: {
      activeGrammarPartId,
      setActiveGrammarPartId,
    },
    dictionary: {
      dictionaryWord,
      setDictionaryWord,
    },
    activity: {
      activeActivity,
      setActiveActivity,
    },
  });

  const { handleTabChange, handleNavToggle } = useWorkspaceRouting({
    activeTab,
    setActiveTab,
    setActiveActivity,
    closeReader,
    setActiveGrammarPartId,
    isDesktop,
    isDesktopOrTablet,
    toggleCollapse,
    setIsNavOpen,
  });

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
        isCollapsed={isCollapsed}
        isDesktopOrTablet={isDesktopOrTablet}
        onToggleCollapse={toggleCollapse}
        setIsNavOpen={setResponsiveNavOpen}
        isOverlayActive={isOverlayActive}
        showSidebarCollapse={showSidebarCollapse}
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
              onOpenGrammarPart={(partId, pageId) => {
                setActiveGrammarPageId(pageId ?? null);
                setActiveGrammarPartId(partId);
              }}
              onOpenReading={() => void openReader(activeBook.id)}
            />
          </Suspense>
        }
      >
        <AppRoutes
          activeTab={activeTab}
          activeBookId={activeBookId}
          setActiveBookId={setActiveBookId}
          selectedLessons={selectedLessons}
          toggleLesson={toggleLesson}
          startPathPractice={startPathPractice}
          setActiveTab={handleTabChange}
          setActiveActivity={setActiveActivity}
          onToggleNav={handleNavToggle}
        />
      </LayoutShell>

      <GrammarWindow
        part={activeGrammarPart ?? null}
        initialPageId={activeGrammarPageId ?? undefined}
        onClose={() => {
          setActiveGrammarPartId(null);
          setActiveGrammarPageId(null);
        }}
        onProceedToReading={(targetPart) => {
          setActiveGrammarPartId(null);
          setActiveGrammarPageId(null);
          void openReaderForPart(targetPart.bookId, targetPart.lessonId, targetPart.partId);
        }}
      />

      <ReaderWindow
        readings={readings}
        index={activeReadingIndex}
        onNavigate={navigateReader}
        onClose={closeReader}
        onOpenGrammarPart={(partId, pageId) => {
          setActiveGrammarPageId(pageId ?? null);
          setActiveGrammarPartId(partId);
        }}
      />

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

      <DebugToolsOverlay />
    </>
  );
}
