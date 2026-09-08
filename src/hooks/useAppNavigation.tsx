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
  const {
    lastActivity, setLastActivity,
    activeTab, setActiveTab: _setActiveTab,
    activeActivity, setActiveActivity: _setActiveActivity,
    activeBookId,
    selectedLessons: legacySelectedLessons, setSelectedLessons,
    selectedLessonParts, setSelectedLessonParts,
    selectedBooks, setSelectedBooks,
  } = useAppStore();

  const selectedLessons = useMemo(() => {
    const keyedSelections = getSelectedLessonIds(selectedLessonParts, activeBookId);
    return keyedSelections.length > 0 || Object.keys(selectedLessonParts).length > 0
      ? keyedSelections
      : legacySelectedLessons;
  }, [activeBookId, legacySelectedLessons, selectedLessonParts]);

  const handleSetActiveActivity = useCallback((activity: ActivityType) => {
    _setActiveActivity(activity);
    if (activity && activity !== 'flashcards-library' && activity !== 'create-card' && activity !== 'flashcards-review') {
      setLastActivity(activity);
    }
  }, [_setActiveActivity, setLastActivity]);

  const clearReviewContext = useCallback(() => {
    useAppStore.getState().setIsReviewMode(false);
    useAppStore.getState().setActiveReviewSessionCards(null);
  }, []);

  const handleSetActiveTab = useCallback((tab: TabType) => {
    useAppStore.getState().setIsSearchOpen(false);
    _setActiveTab(tab);
  }, [_setActiveTab]);

  const startPathPractice = useCallback(() => {
    clearReviewContext();
    const fallbackActivity = lastActivity === 'flashcards-review'
      || (lastActivity as string) === 'flashcards-library'
      ? 'flashcards'
      : (lastActivity || 'flashcards');
    handleSetActiveActivity(fallbackActivity as ActivityType);
  }, [clearReviewContext, handleSetActiveActivity, lastActivity]);

  const withLegacySelections = useCallback(() => {
    if (Object.keys(selectedLessonParts).length > 0 || legacySelectedLessons.length === 0) {
      return { ...selectedLessonParts };
    }

    return Object.fromEntries(
      legacySelectedLessons.map((lessonId) => [getLessonSelectionKey(activeBookId, lessonId), [1]]),
    );
  }, [activeBookId, legacySelectedLessons, selectedLessonParts]);

  const toggleLesson = useCallback((id: number, availablePartIds: number[] = [1]) => {
    const next = withLegacySelections();
    const key = getLessonSelectionKey(activeBookId, id);
    if (next[key]) delete next[key];
    else next[key] = [availablePartIds[0] ?? 1];
    setSelectedLessonParts(next);
    if (legacySelectedLessons.length > 0) setSelectedLessons([]);
  }, [activeBookId, legacySelectedLessons.length, setSelectedLessonParts, setSelectedLessons, withLegacySelections]);

  const toggleLessonPart = useCallback((lessonId: number, partId: number, availablePartIds: number[]) => {
    const next = withLegacySelections();
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
    if (legacySelectedLessons.length > 0) setSelectedLessons([]);
  }, [activeBookId, legacySelectedLessons.length, setSelectedLessonParts, setSelectedLessons, withLegacySelections]);

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
