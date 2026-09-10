import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  getLessonSelectionKey,
  getSelectedLessonIds,
  normalizePartSelection,
} from '../utils/lessonPartSelection';
import type { ActivityType } from '../types/models';

export type TabType = 'path' | 'search' | 'library' | 'profile';
export type { ActivityType } from '../types/models';

export function useAppNavigation() {
  // Per-slice selectors: a whole-store destructure would re-render every
  // consumer on any unrelated store change.
  const lastActivity = useAppStore((state) => state.lastActivity);
  const setLastActivity = useAppStore((state) => state.setLastActivity);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeActivity = useAppStore((state) => state.activeActivity);
  const setActiveActivity = useAppStore((state) => state.setActiveActivity);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const setSelectedLessonParts = useAppStore((state) => state.setSelectedLessonParts);
  const selectedBooks = useAppStore((state) => state.selectedBooks);
  const setSelectedBooks = useAppStore((state) => state.setSelectedBooks);

  const selectedLessons = useMemo(
    () => getSelectedLessonIds(selectedLessonParts, activeBookId),
    [activeBookId, selectedLessonParts],
  );

  const handleSetActiveActivity = useCallback((activity: ActivityType) => {
    setActiveActivity(activity);
    if (activity && activity !== 'flashcards-library' && activity !== 'create-card' && activity !== 'flashcards-review') {
      setLastActivity(activity);
    }
  }, [setActiveActivity, setLastActivity]);

  const clearReviewContext = useCallback(() => {
    useAppStore.getState().setIsReviewMode(false);
    useAppStore.getState().setActiveReviewSessionCards(null);
  }, []);

  const handleSetActiveTab = useCallback((tab: TabType) => {
    useAppStore.getState().setIsSearchOpen(false);
    setActiveTab(tab);
  }, [setActiveTab]);

  const startPathPractice = useCallback(() => {
    clearReviewContext();
    const fallbackActivity = lastActivity === 'flashcards-review'
      || (lastActivity as string) === 'flashcards-library'
      ? 'flashcards'
      : (lastActivity || 'flashcards');
    handleSetActiveActivity(fallbackActivity as ActivityType);
  }, [clearReviewContext, handleSetActiveActivity, lastActivity]);

  const toggleLesson = useCallback((id: number, availablePartIds: number[] = [1]) => {
    const next = { ...selectedLessonParts };
    const key = getLessonSelectionKey(activeBookId, id);
    if (next[key]) delete next[key];
    else next[key] = [availablePartIds[0] ?? 1];
    setSelectedLessonParts(next);
  }, [activeBookId, selectedLessonParts, setSelectedLessonParts]);

  const toggleLessonPart = useCallback((lessonId: number, partId: number, availablePartIds: number[]) => {
    const next = { ...selectedLessonParts };
    const key = getLessonSelectionKey(activeBookId, lessonId);
    const current = next[key];
    const currentPartIds = current === 'all'
      ? availablePartIds
      : current ?? [];
    const toggledPartIds = currentPartIds.includes(partId)
      ? currentPartIds.filter((id) => id !== partId)
      : [...currentPartIds, partId];
    if (toggledPartIds.length === 0) return;
    const normalized = normalizePartSelection(toggledPartIds, availablePartIds);

    if (normalized) next[key] = normalized;

    setSelectedLessonParts(next);
  }, [activeBookId, selectedLessonParts, setSelectedLessonParts]);

  const toggleBook = (id: number) => {
    setSelectedBooks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return {
    activeTab,
    setActiveTab: handleSetActiveTab,
    activeActivity,
    setActiveActivity: handleSetActiveActivity,
    selectedLessons,
    toggleLesson,
    toggleLessonPart,
    selectedBooks,
    toggleBook,
    startPathPractice
  };
}
