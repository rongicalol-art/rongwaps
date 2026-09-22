import { useState } from 'react';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useCharacterFont } from './hooks/useCharacterFont';
import { LoadingScreen } from './lib/widgets';
import { AppWorkspace } from './app/components/AppWorkspace';
import { AppOverlays } from './app/components/AppOverlays';
import { useResponsiveNav } from './app/hooks/useResponsiveNav';
import { useReaderLauncher } from './app/hooks/useReaderLauncher';
import { useGrammarLauncher } from './app/hooks/useGrammarLauncher';
import { useOverlayUrlSync } from './app/hooks/useOverlayUrlSync';
import { useWorkspaceRouting } from './app/hooks/useWorkspaceRouting';
import { useFocusModeSidebar } from './app/hooks/useFocusModeSidebar';
import { useReaderStepNavigation } from './app/hooks/useReaderStepNavigation';
import { useAppShellActions } from './app/hooks/useAppShellActions';
import { useAppShellState } from './app/hooks/useAppShellState';
import { useActiveBook } from './app/hooks/useActiveBook';
import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { useResetProgress } from './hooks/useResetProgress';

export default function App() {
  useAudioUnlock();
  useCloudSync();
  useCharacterFont();

  const {
    activeBookId,
    setActiveBookId,
    characterPreference,
    setCharacterPreference,
    isSettingsOpen,
    setIsSettingsOpen,
    isLibraryFolderView,
    dictionaryWord,
    setDictionaryWord,
  } = useAppShellState();
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
  const { readings, activeReadingIndex, isOpeningReader, openReader, openReaderForPart, closeReader, navigateReader } = useReaderLauncher({
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

  const activeBook = useActiveBook(activeBookId, activeTab);

  const {
    handleSetActiveActivity,
    handleStartPathPractice,
    handleOpenReading,
    handleOpenGrammarPart,
    handleCloseGrammar,
    handleCloseReader,
    handleProceedToReading,
    handleNavigateToPractice,
    handleSettingsClick,
  } = useAppShellActions({
    activeBookId: activeBook.id,
    collapseNav,
    setActiveActivity,
    startPathPractice,
    openReader,
    openReaderForPart,
    closeReader,
    setActiveGrammarPartId,
    setActiveGrammarPageId,
    setIsSettingsOpen,
    setIsNavOpen,
    isDesktop,
  });

  const { handleReaderNext, handleReaderPrevious } = useReaderStepNavigation({
    activeReadingIndex,
    readings,
    closeReader: handleCloseReader,
    openGrammarPart: handleOpenGrammarPart,
  });

  const isReaderOpen = isOpeningReader || activeReadingIndex !== null;
  const isGrammarOpen = Boolean(activeGrammarPartId);
  const isOverlayActive = isReaderOpen || isGrammarOpen || Boolean(dictionaryWord);
  const isFocusMode = Boolean(activeActivity || isOverlayActive);
  const showSidebarCollapse = Boolean(
    activeActivity || isReaderOpen || isGrammarOpen || (activeTab === 'library' && isLibraryFolderView)
  );

  useFocusModeSidebar({
    isReaderOpen,
    activeReadingIndex,
    isGrammarOpen,
    activeGrammarPartId,
    dictionaryWord,
    activeActivity,
    isOverlayActive,
    collapseNav,
    restoreBaseNavPreference,
  });

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

  if (isLoading) {
    return <LoadingScreen message="Loading RongWaps…" fullScreen tone="canvas" />;
  }

  return (
    <>
      <AppWorkspace
        shell={{
          activeTab,
          activeActivity: isOverlayActive ? null : activeActivity,
          practiceCanvasOpen: Boolean(dictionaryWord),
          activeBook,
          isNavOpen,
          isCollapsed,
          isDesktopOrTablet,
          onToggleCollapse: toggleCollapse,
          setIsNavOpen: setResponsiveNavOpen,
          isOverlayActive,
          showSidebarCollapse,
          onSettingsClick: handleSettingsClick,
          onTabChange: handleTabChange,
        }}
        activityModals={{
          activeActivity,
          setActiveActivity: handleSetActiveActivity,
          activeBookId: activeBook.id,
          selectedLessons,
          isLibraryMode: activeTab === 'library',
          isShellOverlayOpen: isOverlayActive,
          onNavigateToPractice: handleNavigateToPractice,
          onOpenGrammarPart: handleOpenGrammarPart,
          onOpenReading: handleOpenReading,
        }}
        routes={{
          activeTab,
          activeBookId,
          setActiveBookId,
          selectedLessons,
          toggleLesson,
          startPathPractice: handleStartPathPractice,
          setActiveTab: handleTabChange,
          setActiveActivity: handleSetActiveActivity,
          onOpenGrammarPart: handleOpenGrammarPart,
          onToggleNav: handleNavToggle,
        }}
      />

      <AppOverlays
        isGrammarOpen={isGrammarOpen}
        grammarPart={activeGrammarPart ?? null}
        grammarPageId={activeGrammarPageId ?? undefined}
        onCloseGrammar={handleCloseGrammar}
        onProceedToReading={handleProceedToReading}
        onNavigateGrammarPart={handleOpenGrammarPart}
        isReaderOpen={isReaderOpen}
        readings={readings}
        readingIndex={activeReadingIndex}
        onReaderNext={handleReaderNext}
        onReaderPrevious={handleReaderPrevious}
        onCloseReader={handleCloseReader}
        onOpenGrammarPart={handleOpenGrammarPart}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        characterPreference={characterPreference}
        onCharacterPreferenceChange={setCharacterPreference}
        onResetProgress={handleResetProgress}
        isAuthOpen={!currentUser && isInitialAuthOpen}
        onCloseAuth={() => setIsInitialAuthOpen(false)}
      />
    </>
  );
}
