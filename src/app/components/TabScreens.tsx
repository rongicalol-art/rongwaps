import React, { lazy, Suspense } from 'react';
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
  isNavOpen: boolean;
  setIsNavOpen: (open: boolean) => void;
}

export const TabScreens: React.FC<TabScreensProps> = ({
  activeTab,
  activeBookId,
  setActiveBookId,
  selectedLessons,
  toggleLesson,
  startPathPractice,
  setActiveTab,
  setActiveActivity,
  isNavOpen,
  setIsNavOpen,
}) => {
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
                onProfileClick={() => setActiveTab('profile')}
                menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }}
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
                onAddCard={() => setActiveActivity('create-card')}
                onPlayFlashcards={() => setActiveActivity('flashcards-library')}
                menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }}
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
              <SearchScreen menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }} />
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
                onStartReview={() => {
                  const store = useAppStore.getState();
                  store.setIsReviewMode(true);
                  store.setActiveReviewSessionCards(null);
                  setActiveActivity('flashcards-review');
                }}
                menuToggle={{ onClick: () => setIsNavOpen(!isNavOpen), label: 'Menu' }}
              />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
