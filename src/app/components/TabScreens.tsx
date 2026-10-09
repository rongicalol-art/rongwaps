import React, { memo, useMemo, useCallback } from 'react';
import { ErrorBoundary, LoadingScreen } from '../../lib/widgets';
import { useOpenPhase } from '../../hooks/useOpenPhase';
import { getTabScreen, useTabScreenReady } from './tabScreenRegistry';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityType } from '../../types/models';
import type { TabRoute } from '../routes';
import type { GrammarReadingTarget } from '../hooks/useAppShellActions';

const TAB_LOADING_MESSAGE: Record<string, string> = {
  path: 'Loading lessons…',
  library: 'Loading library…',
  search: 'Loading dictionary…',
  profile: 'Loading profile…',
};

interface TabScreensProps {
  activeTab: string;
  activeBookId: number;
  setActiveBookId: (id: number) => void;
  startPartPractice: (lessonId: number, partId: number, activity: ActivityType) => void;
  startPathPractice: () => void;
  setActiveTab: (tab: TabRoute) => void;
  setActiveActivity: (activity: ActivityType) => void;
  onOpenGrammarPart: (partId: string, pageId?: string | null) => void;
  onOpenReadingPart: (target: GrammarReadingTarget) => void;
  onToggleNav: () => void;
}

export const TabScreens: React.FC<TabScreensProps> = memo(function TabScreens({
  activeTab,
  activeBookId,
  setActiveBookId,
  startPartPractice,
  startPathPractice,
  setActiveTab,
  setActiveActivity,
  onOpenGrammarPart,
  onOpenReadingPart,
  onToggleNav,
}) {
  // One open rule for every tab: hold, then one loader >= 450ms, then the screen (chunk already loaded).
  const phase = useOpenPhase(useTabScreenReady(activeTab), undefined, activeTab);
  const CurriculumLibrary = getTabScreen('path');
  const SearchScreen = getTabScreen('search');
  const LibraryScreen = getTabScreen('library');
  const ProfileScreen = getTabScreen('profile');

  const menuToggle = useMemo(
    () => ({ onClick: onToggleNav, label: 'Menu' }),
    [onToggleNav],
  );

  const handleStartReview = useCallback(() => {
    const store = useAppStore.getState();
    store.setIsReviewMode(true);
    store.setActiveReviewSessionCards(null);
    setActiveActivity('flashcards-review');
  }, [setActiveActivity]);

  const handleAddCard = useCallback(() => {
    setActiveActivity('create-card');
  }, [setActiveActivity]);

  const handlePlayFlashcards = useCallback(() => {
    setActiveActivity('flashcards-library');
  }, [setActiveActivity]);

  const handleProfileClick = useCallback(() => {
    setActiveTab('profile');
  }, [setActiveTab]);

  const handleNavigateToFavorites = useCallback(() => {
    useAppStore.getState().setLibraryActiveFolder('favorites');
    setActiveTab('library');
  }, [setActiveTab]);
  if (phase === 'hold') return null;
  if (phase === 'loading') return <LoadingScreen message={TAB_LOADING_MESSAGE[activeTab] ?? 'Loading…'} />;

  return (
    <div
      key={activeTab}
      className={`flex w-full flex-col animate-in fade-in duration-150 ${activeTab === 'path' ? 'shrink-0' : 'flex-1'}`}
    >
      <ErrorBoundary>
        {activeTab === 'path' && CurriculumLibrary && (
          <CurriculumLibrary
            activeBookId={activeBookId}
            onActiveBookChange={setActiveBookId}
            onStartPartPractice={startPartPractice}
            onStartPathPractice={startPathPractice}
            onOpenGrammarPart={onOpenGrammarPart}
            onOpenReadingPart={onOpenReadingPart}
            onProfileClick={handleProfileClick}
            menuToggle={menuToggle}
          />
        )}
        {activeTab === 'library' && LibraryScreen && (
          <LibraryScreen
            onAddCard={handleAddCard}
            onPlayFlashcards={handlePlayFlashcards}
            menuToggle={menuToggle}
            onProfileClick={handleProfileClick}
          />
        )}
        {activeTab === 'search' && SearchScreen && (
          <SearchScreen menuToggle={menuToggle} onProfileClick={handleProfileClick} />
        )}
        {activeTab === 'profile' && ProfileScreen && (
          <ProfileScreen
            onStartReview={handleStartReview}
            menuToggle={menuToggle}
            onNavigateToFavorites={handleNavigateToFavorites}
            onCreateCustomCard={handleAddCard}
          />
        )}
      </ErrorBoundary>
    </div>
  );
});
