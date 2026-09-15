import React, { lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary, LoadingScreen } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityType } from '../../types/models';

// Single source for tab chunks: React.lazy consumes the same loaders that
// prefetchTabScreen calls on navigation, so the browser dedupes the import
// and warm tabs open instantly (no loading fallback at all).
const TAB_LOADERS = {
  path: () => import('../../screens/curriculum'),
  search: () => import('../../screens/search'),
  library: () => import('../../screens/library'),
  profile: () => import('../../screens/profile'),
};

export function prefetchTabScreen(tab: string) {
  const loader = TAB_LOADERS[tab as keyof typeof TAB_LOADERS];
  if (loader) void loader();
}

const CurriculumLibrary = lazy(() => TAB_LOADERS.path().then((m) => ({ default: m.CurriculumLibrary })));
const ProfileScreen = lazy(() => TAB_LOADERS.profile().then((m) => ({ default: m.ProfileScreen })));
const SearchScreen = lazy(() => TAB_LOADERS.search().then((m) => ({ default: m.SearchScreen })));
const LibraryScreen = lazy(() => TAB_LOADERS.library().then((m) => ({ default: m.LibraryScreen })));

interface TabScreensProps {
  activeTab: string;
  activeBookId: number;
  setActiveBookId: (id: number) => void;
  selectedLessons: number[];
  toggleLesson: (lessonId: number) => void;
  startPathPractice: () => void;
  setActiveTab: (tab: string) => void;
  setActiveActivity: (activity: ActivityType) => void;
  onToggleNav: () => void;
}

export const TabScreens: React.FC<TabScreensProps> = memo(function TabScreens({
  activeTab,
  activeBookId,
  setActiveBookId,
  selectedLessons,
  toggleLesson,
  startPathPractice,
  setActiveTab,
  setActiveActivity,
  onToggleNav,
}) {
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
  return (
    <AnimatePresence mode="wait">
      {activeTab === 'path' && (
        <motion.div
          key="path"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex w-full shrink-0 flex-col"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading lessons…" />}>
              <CurriculumLibrary
                activeBookId={activeBookId}
                onActiveBookChange={setActiveBookId}
                selectedLessons={selectedLessons}
                onToggleLesson={toggleLesson}
                onStartPractice={startPathPractice}
                onProfileClick={handleProfileClick}
                menuToggle={menuToggle}
              />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      )}

      {activeTab === 'library' && (
        <motion.div
          key="library"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col w-full"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading library…" />}>
              <LibraryScreen
                onAddCard={handleAddCard}
                onPlayFlashcards={handlePlayFlashcards}
                menuToggle={menuToggle}
              />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      )}

      {activeTab === 'search' && (
        <motion.div
          key="search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col w-full"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading dictionary…" />}>
              <SearchScreen menuToggle={menuToggle} />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      )}

      {activeTab === 'profile' && (
        <motion.div
          key="profile"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col w-full"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading profile…" />}>
              <ProfileScreen
                onStartReview={handleStartReview}
                menuToggle={menuToggle}
                onNavigateToFavorites={handleNavigateToFavorites}
                onCreateCustomCard={handleAddCard}
              />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
