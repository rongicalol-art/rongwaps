import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';
import {
  getLessonSelectionKey,
  getSelectedLessonIds,
  normalizePartSelection,
} from '../utils/lessonPartSelection';
import type { ActivityType } from '../types/models';
import type { User } from '@supabase/supabase-js';
import { AppIcon, IconActionButton } from '../lib/widgets';

export type TabType = 'path' | 'search' | 'library' | 'profile';
export type { ActivityType } from '../types/models';

function ProfileAvatar({ user }: { user: User | null }) {
  const avatarValue = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const avatarUrl = typeof avatarValue === 'string' ? avatarValue : null;
  if (avatarUrl) {
    return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-surface text-ui-ink transition-opacity hover:opacity-80">
        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ui-surface text-ui-muted transition-colors hover:text-brand-primary">
      <AppIcon name="profile" size={22} />
    </div>
  );
}

function SettingsButton() {
  return (
    <IconActionButton
      onClick={() => useAppStore.getState().setIsSettingsOpen(true)}
      label="Open settings"
      size="lg"
      icon={<AppIcon name="appSettings" size={22} />}
    />
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
    selectedBooks, setSelectedBooks,
    libraryActiveView,
    libraryActiveFolder,
    customFolders,
    setLibraryActiveView,
    setLibraryActiveFolder,
    setLibrarySearchQuery,
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

  const headerProps = useMemo(() => {
    if (activeTab === 'library' && libraryActiveView === 'folder') {
      // Resolve the folder title from well-known ids or custom folders
      let folderTitle = 'Folder';
      if (libraryActiveFolder === 'starred') folderTitle = 'Starred Words';
      else if (libraryActiveFolder === 'custom') folderTitle = 'Custom Cards';
      else {
        const cf = customFolders.find(f => f.id === libraryActiveFolder);
        if (cf) folderTitle = cf.name;
      }

      const handleBack = () => {
        setLibrarySearchQuery('');
        setLibraryActiveView('home');
        setLibraryActiveFolder('all');
      };

      return {
        title: folderTitle,
        leftIcon: null,
        extraLeftContent: (
          <button
            type="button"
            onClick={handleBack}
            className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ui-muted transition-colors hover:bg-ui-canvas hover:text-ui-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
            aria-label="Back to Library"
          >
            <AppIcon name="back" size={22} />
          </button>
        ),
      };
    }

    switch (activeTab) {
      case 'search':
        return {
          title: 'Dictionary',
          leftIcon: null,
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
          title: 'Library',
          leftIcon: null,
          rightContent: <span />,
        };
      case 'path':
      default:
        return {
          title: 'Books',
          leftIcon: <ProfileAvatar user={currentUser} />,
          rightContent: <span />,
        };
    }
  }, [activeTab, currentUser, libraryActiveView, libraryActiveFolder, customFolders, setLibraryActiveView, setLibraryActiveFolder, setLibrarySearchQuery]);

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
