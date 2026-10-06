import { useState } from 'react';
import { useAppNavigation } from '../../hooks/useAppNavigation.tsx';
import { useAudioUnlock } from '../../hooks/useAudioUnlock';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { useCloudSync } from '../../hooks/useCloudSync';
import { useAuth } from '../../hooks/useAuth';
import { useResetProgress } from '../../hooks/useResetProgress';
import { useActiveBook } from './useActiveBook';
import { useAppShellActions } from './useAppShellActions';
import { useAppShellState } from './useAppShellState';
import { useFocusModeSidebar } from './useFocusModeSidebar';
import { useGrammarLauncher } from './useGrammarLauncher';
import { useOverlayUrlSync } from './useOverlayUrlSync';
import { useReaderLauncher } from './useReaderLauncher';
import { useReaderStepNavigation } from './useReaderStepNavigation';
import { useResponsiveNav } from './useResponsiveNav';
import { useWorkspaceRouting } from './useWorkspaceRouting';
import { readBoolean, writeBoolean } from '../../utils/localStorage';

const AUTH_PROMPT_DISMISSED_KEY = 'rongwaps:auth-prompt-dismissed';

/**
 * AppShell composition root: every hook App.tsx used to call and thread by
 * hand, returned as named groups (nav, reader, grammar, activity, settings,
 * sync, overlays). Pure wiring — no state of its own beyond the first-run
 * sign-in flag.
 */
export function useAppShell() {
  useAudioUnlock();
  const cloudSync = useCloudSync();
  useCharacterFont();

  const shellState = useAppShellState();
  const { currentUser, isLoading } = useAuth();
  const navigation = useAppNavigation();
  const responsiveNav = useResponsiveNav();
  const [isInitialAuthOpen, setIsInitialAuthOpen] = useState(() => !readBoolean(AUTH_PROMPT_DISMISSED_KEY, false));

  const grammar = useGrammarLauncher({ onOpen: responsiveNav.collapseNav });
  const reader = useReaderLauncher({
    selectedLessons: navigation.selectedLessons,
    activeBookId: shellState.activeBookId,
    activeGrammarPartId: grammar.activeGrammarPartId,
    onOpen: responsiveNav.collapseNav,
  });

  const handleResetProgress = useResetProgress({
    currentUser,
    onActivityCleared: () => navigation.setActiveActivity(null),
    onGrammarCleared: () => grammar.setActiveGrammarPartId(null),
  });

  const activeBook = useActiveBook(shellState.activeBookId, navigation.activeTab);

  const actions = useAppShellActions({
    activeBookId: activeBook.id,
    collapseNav: responsiveNav.collapseNav,
    setActiveActivity: navigation.setActiveActivity,
    startPathPractice: navigation.startPathPractice,
    openReader: reader.openReader,
    openReaderForPart: reader.openReaderForPart,
    closeReader: reader.closeReader,
    setActiveGrammarPartId: grammar.setActiveGrammarPartId,
    setActiveGrammarPageId: grammar.setActiveGrammarPageId,
    setIsSettingsOpen: shellState.setIsSettingsOpen,
    setIsNavOpen: responsiveNav.setIsNavOpen,
    isDesktop: responsiveNav.isDesktop,
  });

  const readerSteps = useReaderStepNavigation({
    activeReadingIndex: reader.activeReadingIndex,
    readings: reader.readings,
    closeReader: actions.handleCloseReader,
    openGrammarPart: actions.handleOpenGrammarPart,
  });

  const isReaderOpen = reader.isOpeningReader || reader.activeReadingIndex !== null;
  const isGrammarOpen = Boolean(grammar.activeGrammarPartId);
  const isOverlayActive = isReaderOpen || isGrammarOpen || Boolean(shellState.dictionaryWord);
  const isFocusMode = Boolean(navigation.activeActivity || isOverlayActive);
  const showSidebarCollapse = Boolean(
    navigation.activeActivity || isReaderOpen || isGrammarOpen || (navigation.activeTab === 'library' && shellState.isLibraryFolderView)
  );

  useFocusModeSidebar({
    isReaderOpen,
    activeReadingIndex: reader.activeReadingIndex,
    isGrammarOpen,
    activeGrammarPartId: grammar.activeGrammarPartId,
    dictionaryWord: shellState.dictionaryWord,
    activeActivity: navigation.activeActivity,
    isOverlayActive,
    collapseNav: responsiveNav.collapseNav,
    restoreBaseNavPreference: responsiveNav.restoreBaseNavPreference,
  });

  useOverlayUrlSync({
    reader: {
      activeReadingIndex: reader.activeReadingIndex,
      readingsLength: reader.readings.length,
      activeBookId: activeBook.id,
      openReader: reader.openReader,
      navigateReader: reader.navigateReader,
      closeReader: reader.closeReader,
    },
    grammar: {
      activeGrammarPartId: grammar.activeGrammarPartId,
      setActiveGrammarPartId: grammar.setActiveGrammarPartId,
    },
    dictionary: {
      dictionaryWord: shellState.dictionaryWord,
      setDictionaryWord: shellState.setDictionaryWord,
    },
    activity: {
      activeActivity: navigation.activeActivity,
      setActiveActivity: navigation.setActiveActivity,
    },
  });

  const { handleTabChange, handleNavToggle } = useWorkspaceRouting({
    activeTab: navigation.activeTab,
    setActiveTab: navigation.setActiveTab,
    setActiveActivity: navigation.setActiveActivity,
    closeReader: reader.closeReader,
    setActiveGrammarPartId: grammar.setActiveGrammarPartId,
    isDesktop: responsiveNav.isDesktop,
    isDesktopOrTablet: responsiveNav.isDesktopOrTablet,
    toggleCollapse: responsiveNav.toggleCollapse,
    setIsNavOpen: responsiveNav.setIsNavOpen,
    collapseNav: responsiveNav.collapseNav,
    isFocusMode,
  });

  return {
    isLoading,
    nav: {
      activeTab: navigation.activeTab,
      activeBookId: shellState.activeBookId,
      setActiveBookId: shellState.setActiveBookId,
      isNavOpen: responsiveNav.isNavOpen,
      setIsNavOpen: responsiveNav.setIsNavOpen,
      setResponsiveNavOpen: responsiveNav.setResponsiveNavOpen,
      isCollapsed: responsiveNav.isCollapsed,
      isDesktopOrTablet: responsiveNav.isDesktopOrTablet,
      toggleCollapse: responsiveNav.toggleCollapse,
      handleTabChange,
      handleNavToggle,
      isFocusMode,
      showSidebarCollapse,
    },
    reader: {
      isOpen: isReaderOpen,
      readings: reader.readings,
      index: reader.activeReadingIndex,
      onNext: readerSteps.handleReaderNext,
      onPrevious: readerSteps.handleReaderPrevious,
      onClose: actions.handleCloseReader,
    },
    grammar: {
      isOpen: isGrammarOpen,
      part: grammar.activeGrammarPart,
      pageId: grammar.activeGrammarPageId,
      onOpenPart: actions.handleOpenGrammarPart,
      onClose: actions.handleCloseGrammar,
      onProceedToReading: actions.handleProceedToReading,
    },
    activity: {
      activeActivity: navigation.activeActivity,
      activeBook,
      selectedLessons: navigation.selectedLessons,
      toggleLesson: navigation.toggleLesson,
      onSetActiveActivity: actions.handleSetActiveActivity,
      onStartPathPractice: actions.handleStartPathPractice,
      onNavigateToPractice: actions.handleNavigateToPractice,
      onOpenReading: actions.handleOpenReading,
    },
    settings: {
      isOpen: shellState.isSettingsOpen,
      onOpen: actions.handleSettingsClick,
      onClose: () => shellState.setIsSettingsOpen(false),
      characterPreference: shellState.characterPreference,
      setCharacterPreference: shellState.setCharacterPreference,
      onResetProgress: handleResetProgress,
    },
    sync: cloudSync,
    overlays: {
      dictionaryWord: shellState.dictionaryWord,
      isOverlayActive,
      isAuthOpen: !currentUser && isInitialAuthOpen,
      closeAuth: () => {
        writeBoolean(AUTH_PROMPT_DISMISSED_KEY, true);
        setIsInitialAuthOpen(false);
      },
    },
  };
}
