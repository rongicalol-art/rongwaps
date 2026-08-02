import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import { prefetchLocalDictionary } from './services/dictionaryService';
import { getInteractiveGrammarPart } from './data/interactiveGrammarPages';

import {
  GlobalDictionaryModal,
  LayoutShell,
  ErrorBoundary,
  AppSettingsDrawer,
  AppIcon,
  IconActionButton,
  LoadingScreen
} from './lib/widgets';

import { CurriculumLibrary } from './screens/curriculum';
import { ProfileScreen } from './screens/profile';
import { SearchScreen } from './screens/search';
import { LibraryScreen } from './screens/library';
import { ActivityModals } from './screens/activities/ActivityModals';
import { GrammarLessonScreen } from './screens/grammar-lesson';
import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { userService } from './services/userService';
import { useGrammarLessonStore } from './store/useGrammarLessonStore';
import { useReadingLessonStore } from './store/useReadingLessonStore';

const DebugWindow = React.lazy(() => (
  import('./screens/debug/DebugWindow').then((module) => ({ default: module.DebugWindow }))
));

const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
);

export default function App() {
  // Initialize global audio
  useAudioUnlock();
  
  // Sync user progress automatically
  useCloudSync();

  // Prewarm the dictionary trie
  useEffect(() => {
    prefetchLocalDictionary();
  }, []);

  const {
    activeBookId,
    setActiveBookId,
    characterPreference,
    setCharacterPreference,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useAppStore();
  const { currentUser, isLoading } = useAuth();
  
  const {
    activeTab,
    setActiveTab,
    activeActivity,
    setActiveActivity,
    selectedLessons,
    toggleLesson,
    headerProps,
    startPathPractice
  } = useAppNavigation();

  const [isNavOpen, setIsNavOpen] = React.useState(() => isDesktopViewport());
  const [showDebugWindow, setShowDebugWindow] = useState(false);
  const [activeGrammarPartId, setActiveGrammarPartId] = useState<string | null>(null);
  const activeGrammarPart = activeGrammarPartId
    ? getInteractiveGrammarPart(activeGrammarPartId)
    : undefined;

  const handleResetProgress = React.useCallback(async () => {
    const appState = useAppStore.getState();
    const grammarState = useGrammarLessonStore.getState();
    const readingState = useReadingLessonStore.getState();
    const appSnapshot = {
      srsData: appState.srsData,
      learnedCards: appState.learnedCards,
      sessionProgress: appState.sessionProgress,
      currentStreak: appState.currentStreak,
      longestStreak: appState.longestStreak,
      totalXp: appState.totalXp,
      totalCardsReviewed: appState.totalCardsReviewed,
      totalCardsLearned: appState.totalCardsLearned,
      lastStudyDate: appState.lastStudyDate,
      sessionProgressIndex: appState.sessionProgressIndex,
      lastActivity: appState.lastActivity,
      isReviewMode: appState.isReviewMode,
      activeReviewSessionCards: appState.activeReviewSessionCards,
      swipeFeedback: appState.swipeFeedback,
    };
    const grammarSnapshot = {
      startedPartIds: grammarState.startedPartIds,
      completedPageIds: grammarState.completedPageIds,
      completedPartIds: grammarState.completedPartIds,
    };
    const readingSnapshot = {
      startedPartIds: readingState.startedPartIds,
      completedPartIds: readingState.completedPartIds,
      savedIntroductions: readingState.savedIntroductions,
    };

    if (currentUser && appState.syncStatus === 'syncing') {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          unsubscribe();
          reject(new Error('Cloud sync did not become idle before reset.'));
        }, 10_000);
        const unsubscribe = useAppStore.subscribe((state) => {
          if (state.syncStatus === 'syncing') return;
          window.clearTimeout(timeout);
          unsubscribe();
          resolve();
        });
      });
    }

    appState.resetProgress();
    grammarState.resetProgress();
    readingState.resetProgress();

    try {
      if (currentUser) await userService.resetLearningProgress();
      setActiveActivity(null);
      setActiveGrammarPartId(null);
    } catch (error) {
      useAppStore.setState(appSnapshot);
      useGrammarLessonStore.setState(grammarSnapshot);
      useReadingLessonStore.setState(readingSnapshot);
      throw error;
    }
  }, [currentUser, setActiveActivity]);

  const setResponsiveNavOpen = React.useCallback((open: boolean) => {
    setIsNavOpen(isDesktopViewport() ? true : open);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncNavToViewport = () => {
      setIsNavOpen(desktopQuery.matches);
    };

    syncNavToViewport();
    desktopQuery.addEventListener('change', syncNavToViewport);
    window.addEventListener('resize', syncNavToViewport);

    return () => {
      desktopQuery.removeEventListener('change', syncNavToViewport);
      window.removeEventListener('resize', syncNavToViewport);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === '0' && e.ctrlKey && e.shiftKey) {
        setShowDebugWindow(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actualActiveBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const isLibraryOrSearch = activeTab === 'library' || activeTab === 'search';
  const activeBook = isLibraryOrSearch ? SAMPLE_BOOKS[0] : actualActiveBook;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ui-canvas">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1CB0F6]"></div>
      </div>
    );
  }

  return (
    <>
      <LayoutShell
        activeTab={activeTab}
        activeActivity={activeActivity}
        activeBook={activeBook}
        isNavOpen={isNavOpen}
        setIsNavOpen={setResponsiveNavOpen}
        headerProps={headerProps}
        onProfileClick={() => setActiveTab('profile')}
        onSettingsClick={() => {
          setIsSettingsOpen(true);
          if (!isDesktopViewport()) setIsNavOpen(false);
        }}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveActivity(null);
          setActiveGrammarPartId(null);
          const store = useAppStore.getState();
          store.setIsReviewMode(false);
          store.setActiveReviewSessionCards(null);
          store.setIsSearchOpen(false);
          if (!isDesktopViewport()) setIsNavOpen(false);
        }}
        activityModals={
          <ActivityModals 
            activeActivity={activeActivity}
            setActiveActivity={setActiveActivity}
            activeBookId={activeBook.id}
            selectedLessons={selectedLessons}
            isLibraryMode={activeTab === 'library'}
            onNavigateToPractice={() => {
              setActiveTab('path');
              setActiveActivity(null);
            }}
          />
        }
      >
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
                <CurriculumLibrary
                  activeBookId={activeBookId}
                  onActiveBookChange={setActiveBookId}
                  selectedLessons={selectedLessons}
                  onToggleLesson={toggleLesson}
                  onStartPractice={startPathPractice}
                />
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
                <LibraryScreen
                  onAddCard={() => setActiveActivity('create-card')}
                  onPlayFlashcards={() => setActiveActivity('flashcards-library')}
                />
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
              className="flex-1 flex flex-col w-full h-full overflow-hidden"
            >
              <div className="mx-auto flex h-full w-full max-w-[1240px] flex-1 flex-col gap-6 overflow-hidden px-4 pb-2 pt-3 md:px-8 md:pb-6">
                <ErrorBoundary>
                  <SearchScreen />
                </ErrorBoundary>
              </div>
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
                <ProfileScreen
                  onStartReview={() => {
                    const store = useAppStore.getState();
                    store.setIsReviewMode(true);
                    store.setActiveReviewSessionCards(null);
                    setActiveActivity('flashcards-review');
                  }}
                />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutShell>

      <AnimatePresence>
        {activeGrammarPart && (
          <GrammarLessonScreen
            key={activeGrammarPart.id}
            part={activeGrammarPart}
            onClose={() => setActiveGrammarPartId(null)}
          />
        )}
      </AnimatePresence>

      <GlobalDictionaryModal />
      <AppSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterPreference={characterPreference}
        onCharacterPreferenceChange={setCharacterPreference}
        onResetProgress={handleResetProgress}
      />
      
      <AnimatePresence>
        {showDebugWindow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="workspace-window absolute inset-0 z-[1000] bg-white flex flex-col overflow-auto overscroll-none"
          >
            <div className="sticky top-0 right-0 p-4 shrink-0 flex justify-end bg-white/90 backdrop-blur-sm shadow-sm z-10">
              <IconActionButton
                onClick={() => setShowDebugWindow(false)}
                label="Close debug tools"
                icon={<AppIcon name="close" size={24} />}
                className="h-12 w-12 rounded-full"
              />
            </div>
            <div className="relative isolate flex min-h-0 flex-1">
              <React.Suspense fallback={<LoadingScreen message="Loading debug tools..." />}>
                <DebugWindow />
              </React.Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
