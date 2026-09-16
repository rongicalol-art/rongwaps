import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAppNavigation, type ActivityType } from './hooks/useAppNavigation.tsx';
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
    collapseNav,
    restoreBaseNavPreference,
    toggleCollapse,
  } = useResponsiveNav();
  const [isInitialAuthOpen, setIsInitialAuthOpen] = useState(true);

  const { activeGrammarPartId, setActiveGrammarPartId, activeGrammarPageId, setActiveGrammarPageId, activeGrammarPart } = useGrammarLauncher({
    onOpen: collapseNav,
  });
  const { readings, activeReadingIndex, openReader, openReaderForPart, closeReader, navigateReader } = useReaderLauncher({
    selectedLessons,
    activeBookId,
    activeGrammarPartId,
    onOpen: collapseNav,
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

  const handleSetActiveActivity = useCallback((activity: ActivityType) => {
    if (activity) {
      collapseNav();
    }
    setActiveActivity(activity);
  }, [collapseNav, setActiveActivity]);

  const handleStartPathPractice = useCallback(() => {
    collapseNav();
    startPathPractice();
  }, [collapseNav, startPathPractice]);

  const handleOpenReading = useCallback(() => {
    collapseNav();
    void openReader(activeBook.id);
  }, [collapseNav, openReader, activeBook.id]);

  const handleOpenGrammarPart = useCallback((partId: string, pageId?: string | null) => {
    collapseNav();
    setActiveGrammarPageId(pageId ?? null);
    setActiveGrammarPartId(partId);
  }, [collapseNav, setActiveGrammarPageId, setActiveGrammarPartId]);

  const isReaderOpen = activeReadingIndex !== null;
  const isGrammarOpen = Boolean(activeGrammarPartId);
  const dictionaryWord = useAppStore((state) => state.dictionaryWord);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const isOverlayActive = isReaderOpen || isGrammarOpen || Boolean(dictionaryWord);
  const isFocusMode = Boolean(activeActivity || isOverlayActive);
  const showSidebarCollapse = Boolean(
    activeActivity || isReaderOpen || isGrammarOpen || (activeTab === 'library' && isLibraryFolderView)
  );

  // Clear any open dictionary word before closing the reader to avoid
  // isOverlayActive staying true (dictionaryWord truthy) and hiding the
  // main workspace after the reader unmounts.
  const handleCloseReader = useCallback(() => {
    useAppStore.getState().setDictionaryWord(null);
    closeReader();
  }, [closeReader]);

  const activeFocusModeKey = isReaderOpen
    ? `reader:${activeReadingIndex}`
    : isGrammarOpen
      ? `grammar:${activeGrammarPartId}`
      : dictionaryWord
        ? `dictionary:${dictionaryWord}`
        : activeActivity
          ? `activity:${activeActivity}`
          : null;

  const prevFocusModeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prevKey = prevFocusModeKeyRef.current;
    prevFocusModeKeyRef.current = activeFocusModeKey;

    if (activeFocusModeKey !== null) {
      // 1. Entering a focus mode (from null)
      // 2. OR switching between focus modes (e.g. flashcards -> quiz, reader -> grammar)
      // Automatically collapse sidebar so study content has maximum space
      collapseNav();
    } else if (prevKey !== null && activeFocusModeKey === null) {
      // Exiting focus mode back to main browsing hub:
      // Restore user's preferred desktop browsing layout
      restoreBaseNavPreference();
    }
  }, [activeFocusModeKey, collapseNav, restoreBaseNavPreference]);

  // Defensive: when every overlay is closed, ensure no element stays inert.
  // This acts as a safety net in case the isolating effects in Reader/Grammar
  // fail to restore state (e.g. due to concurrent mount/unmount ordering).
  useEffect(() => {
    if (!isOverlayActive) {
      const targets = document.querySelectorAll<HTMLElement>('[data-workspace-content]');
      targets.forEach((el) => {
        el.removeAttribute('inert');
        if (el.getAttribute('aria-hidden') === 'true') el.removeAttribute('aria-hidden');
      });
    }
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
    collapseNav,
    isFocusMode,
  });

  const handleNavigateToPractice = useCallback(() => {
    navigate(TAB_ROUTES.path);
    setActiveActivity(null);
  }, [navigate, setActiveActivity]);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
    if (!isDesktop()) setIsNavOpen(false);
  }, [setIsSettingsOpen, isDesktop, setIsNavOpen]);

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
        onSettingsClick={handleSettingsClick}
        onTabChange={handleTabChange}
        activityModals={
          <Suspense fallback={null}>
            <ActivityModals
              activeActivity={activeActivity}
              setActiveActivity={handleSetActiveActivity}
              activeBookId={activeBook.id}
              selectedLessons={selectedLessons}
              isLibraryMode={activeTab === 'library'}
              isShellOverlayOpen={isOverlayActive}
              onNavigateToPractice={handleNavigateToPractice}
              onOpenGrammarPart={handleOpenGrammarPart}
              onOpenReading={handleOpenReading}
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
          startPathPractice={handleStartPathPractice}
          setActiveTab={handleTabChange}
          setActiveActivity={handleSetActiveActivity}
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
          collapseNav();
          setActiveGrammarPartId(null);
          setActiveGrammarPageId(null);
          void openReaderForPart(targetPart.bookId, targetPart.lessonId, targetPart.partId);
        }}
      />

      <ReaderWindow
        readings={readings}
        index={activeReadingIndex}
        onNavigate={navigateReader}
        onClose={handleCloseReader}
        onOpenGrammarPart={handleOpenGrammarPart}
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
