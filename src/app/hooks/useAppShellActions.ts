import { useCallback, useRef } from 'react';
import type { ActivityType } from '../../hooks/useAppNavigation.tsx';
import { useAppStore } from '../../store/useAppStore';

interface UseAppShellActionsOptions {
  activeBookId: number;
  collapseNav: () => void;
  setActiveActivity: (activity: ActivityType) => void;
  startPartPractice: (lessonId: number, partId: number | number[], activity: ActivityType) => void;
  startPathPractice: () => void;
  openReader: (bookId: number) => Promise<void> | void;
  openReaderForPart: (bookId: number, lessonId: number, partId: number | number[]) => Promise<void> | void;
  closeReader: () => void;
  openGrammarParts: (partIds: string[]) => void;
  setActiveGrammarPartId: (partId: string | null) => void;
  setActiveGrammarPageId: (pageId: string | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsNavOpen: (open: boolean) => void;
  isDesktop: () => boolean;
}

export interface GrammarReadingTarget {
  bookId: number;
  lessonId: number;
  partId: number | number[];
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
  startPartPractice,
  startPathPractice,
  openReader,
  openReaderForPart,
  closeReader,
  openGrammarParts,
  setActiveGrammarPartId,
  setActiveGrammarPageId,
  setIsSettingsOpen,
  setIsNavOpen,
  isDesktop,
}: UseAppShellActionsOptions) {
  const grammarCompletion = useRef<(() => void) | null>(null);
  const handleSetActiveActivity = useCallback((activity: ActivityType) => {
    if (activity) {
      collapseNav();
    }
    setActiveActivity(activity);
  }, [collapseNav, setActiveActivity]);

  const handleStartPartPractice = useCallback((lessonId: number, partId: number | number[], activity: ActivityType) => {
    collapseNav();
    startPartPractice(lessonId, partId, activity);
  }, [collapseNav, startPartPractice]);

  const handleStartPathPractice = useCallback(() => {
    collapseNav();
    startPathPractice();
  }, [collapseNav, startPathPractice]);

  const handleOpenReading = useCallback(() => {
    collapseNav();
    void openReader(activeBookId);
  }, [collapseNav, openReader, activeBookId]);

  const handleOpenGrammarPart = useCallback((partId: string | string[], pageId?: string | null, onComplete?: () => void) => {
    const requested = Array.isArray(partId) ? partId : partId.split(',');
    const partIds = [...new Set(requested.filter(Boolean))];
    if (partIds.length === 0) return;
    grammarCompletion.current = onComplete ?? null;
    collapseNav();
    setActiveGrammarPageId(pageId ?? null);
    openGrammarParts(partIds);
  }, [collapseNav, openGrammarParts, setActiveGrammarPageId]);

  const handleCloseGrammar = useCallback(() => {
    grammarCompletion.current = null;
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
    handleCloseGrammar();
    void openReaderForPart(target.bookId, target.lessonId, target.partId);
  }, [collapseNav, handleCloseGrammar, openReaderForPart]);

  const handleFinishGrammar = useCallback(() => {
    const onComplete = grammarCompletion.current;
    handleCloseGrammar();
    onComplete?.();
  }, [handleCloseGrammar]);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
    if (!isDesktop()) setIsNavOpen(false);
  }, [setIsSettingsOpen, isDesktop, setIsNavOpen]);

  return {
    handleSetActiveActivity,
    handleStartPartPractice,
    handleStartPathPractice,
    handleOpenReading,
    handleOpenGrammarPart,
    handleCloseGrammar,
    handleCloseReader,
    handleProceedToReading,
    handleFinishGrammar,
    handleSettingsClick,
  };
}
