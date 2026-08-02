import { useCallback, useMemo } from 'react';
import { PiGearBold, PiUserFill } from 'react-icons/pi';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';
import {
  getLessonSelectionKey,
  getSelectedLessonIds,
  normalizePartSelection,
} from '../utils/lessonPartSelection';
import type { ActivityType } from '../types/models';
import type { User } from '@supabase/supabase-js';

export type TabType = 'path' | 'search' | 'library' | 'profile';
export type { ActivityType } from '../types/models';

function ProfileAvatar({ user }: { user: User | null }) {
  const avatarValue = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const avatarUrl = typeof avatarValue === 'string' ? avatarValue : null;
  if (avatarUrl) {
    return (
    <div className="rounded-full flex items-center justify-center shrink-0 transition-all duration-300 h-10 w-10 overflow-hidden bg-white border-b-2 border-ui-border active:border-b-0 active:translate-y-[2px] text-ui-ink">
        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 transition-all duration-300 h-10 w-10 bg-ui-canvas border-b-2 border-ui-border text-ui-muted hover:text-brand-primary">
      <PiUserFill size={22} />
    </div>
  );
}

function SettingsButton() {
  return (
    <button
      type="button"
      onClick={() => useAppStore.getState().setIsSettingsOpen(true)}
      className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border-b-4 border-ui-border text-ui-muted hover:text-ui-ink hover:border-brand-primary hover:bg-ui-canvas active:border-b-0 active:translate-y-1 transition-all cursor-pointer"
      title="Settings"
      aria-label="Open settings"
    >
      <PiGearBold size={22} />
    </button>
  );
}

export function useAppNavigation() {
  const {
    lastActivity, setLastActivity,
    activeTab, setActiveTab: _setActiveTab,
    activeActivity, setActiveActivity: _setActiveActivity,
    activeBookId,
    selectedLessons: legacySelectedLessons, setSelectedLessons,
    selectedLessonParts, setSelectedLessonParts,
    selectedBooks, setSelectedBooks
  } = useAppStore();
  const { currentUser } = useAuth();

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

  const headerProps = useMemo(() => {
    switch (activeTab) {
      case 'search':
        return {
          title: 'Dictionary',
          leftIcon: <ProfileAvatar user={currentUser} />,
          rightContent: <span />,
        };
      case 'profile':
        return {
          title: 'Profile',
          leftIcon: null,
          rightContent: <SettingsButton />,
        };
      case 'library':
        return {
          title: 'My Library',
          leftIcon: <ProfileAvatar user={currentUser} />,
          showPlayButton: true,
          onPlayClick: () => {
            clearReviewContext();
            handleSetActiveActivity('flashcards-library');
          },
        };
      case 'path':
      default:
        return {
          title: 'Books',
          leftIcon: <ProfileAvatar user={currentUser} />,
          rightContent: <span />,
        };
    }
  }, [activeTab, clearReviewContext, currentUser, handleSetActiveActivity]);

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
    headerProps,
    startPathPractice
  };
}
