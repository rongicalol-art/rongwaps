import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { ActivityType } from '../../hooks/useAppNavigation.tsx';
import { useAppStore } from '../../store/useAppStore';
import { TAB_ROUTES } from '../routes';

interface UseAppShellActionsOptions {
  activeBookId: number;
  collapseNav: () => void;
  setActiveActivity: (activity: ActivityType) => void;
  startPathPractice: () => void;
  openReader: (bookId: number) => Promise<void> | void;
  openReaderForPart: (bookId: number, lessonId: number, partId: number) => Promise<void> | void;
  closeReader: () => void;
  setActiveGrammarPartId: (partId: string | null) => void;
  setActiveGrammarPageId: (pageId: string | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsNavOpen: (open: boolean) => void;
  isDesktop: () => boolean;
}

export interface GrammarReadingTarget {
  bookId: number;
  lessonId: number;
  partId: number;
}

/**
 * The shell's cross-workspace gestures: opening/closing study windows and
 * activities, stepping between them, and the settings shortcut. Every
 * handler collapses the sidebar first so study content gets maximum space.
 */
export function useAppShellActions({
  activeBookId,
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
}: UseAppShellActionsOptions) {
  const navigate = useNavigate();

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
    void openReader(activeBookId);
  }, [collapseNav, openReader, activeBookId]);

  const handleOpenGrammarPart = useCallback((partId: string, pageId?: string | null) => {
    collapseNav();
    setActiveGrammarPageId(pageId ?? null);
    setActiveGrammarPartId(partId);
  }, [collapseNav, setActiveGrammarPageId, setActiveGrammarPartId]);

  const handleCloseGrammar = useCallback(() => {
    setActiveGrammarPartId(null);
    setActiveGrammarPageId(null);
  }, [setActiveGrammarPartId, setActiveGrammarPageId]);

  // Clear any open dictionary word before closing the reader to avoid
  // isOverlayActive staying true (dictionaryWord truthy) and hiding the
  // main workspace after the reader unmounts.
  const handleCloseReader = useCallback(() => {
    useAppStore.getState().setDictionaryWord(null);
    closeReader();
  }, [closeReader]);

  const handleProceedToReading = useCallback((target: GrammarReadingTarget) => {
    collapseNav();
    setActiveGrammarPartId(null);
    setActiveGrammarPageId(null);
    void openReaderForPart(target.bookId, target.lessonId, target.partId);
  }, [collapseNav, openReaderForPart, setActiveGrammarPartId, setActiveGrammarPageId]);

  const handleNavigateToPractice = useCallback(() => {
    navigate(TAB_ROUTES.path);
    setActiveActivity(null);
  }, [navigate, setActiveActivity]);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
    if (!isDesktop()) setIsNavOpen(false);
  }, [setIsSettingsOpen, isDesktop, setIsNavOpen]);

  return {
    handleSetActiveActivity,
    handleStartPathPractice,
    handleOpenReading,
    handleOpenGrammarPart,
    handleCloseGrammar,
    handleCloseReader,
    handleProceedToReading,
    handleNavigateToPractice,
    handleSettingsClick,
  };
}
