import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PiXBold } from 'react-icons/pi';
import { useAppNavigation } from './hooks/useAppNavigation.tsx';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useAppStore } from './store/useAppStore';
import { SAMPLE_BOOKS } from './data/books';
import { prefetchLocalDictionary } from './services/dictionaryService';

import {
  GlobalDictionaryModal,
  LayoutShell,
  ErrorBoundary
} from './lib/widgets';

import { CurriculumLibrary } from './screens/curriculum';
import { ProfileScreen } from './screens/profile';
import { SearchScreen } from './screens/search';
import { LibraryScreen } from './screens/library';
import { ActivityModals } from './screens/activities/ActivityModals';
import { DebugWindow } from './screens/debug/DebugWindow';
import { useCloudSync } from './hooks/useCloudSync';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './screens/auth/AuthScreen';

export default function App() {
  // Initialize global audio
  useAudioUnlock();
  
  // Sync user progress automatically
  useCloudSync();

  // Prewarm the dictionary trie
  useEffect(() => {
    prefetchLocalDictionary();
  }, []);

  const { activeBookId, setActiveBookId } = useAppStore();
  const { currentUser, isLoading } = useAuth();
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  
  const {
    activeTab,
    setActiveTab,
    activeActivity,
    setActiveActivity,
    selectedLessons,
    toggleLesson,
    selectedBooks,
    toggleBook,
    headerProps
  } = useAppNavigation();

  const [isNavOpen, setIsNavOpen] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [showDebugWindow, setShowDebugWindow] = useState(false);

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

  // Global handler to open auth drawer from any child component
  const openAuthDrawer = () => setIsAuthDrawerOpen(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F7F7]">
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
        setIsNavOpen={setIsNavOpen}
        headerProps={headerProps}
        onProfileClick={() => setActiveTab('profile')}
        onSignInClick={openAuthDrawer}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveActivity(null);
          const store = useAppStore.getState();
          store.setIsReviewMode(false);
          store.setActiveReviewSessionCards(null);
          store.setIsSearchOpen(false);
          if (window.innerWidth < 768) setIsNavOpen(false);
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
              className="flex-1 flex flex-col w-full"
            >
              <ErrorBoundary>
                <CurriculumLibrary
                  activeBookId={activeBookId}
                  onActiveBookChange={setActiveBookId}
                  selectedLessons={selectedLessons}
                  onToggleLesson={toggleLesson}
                  selectedBooks={selectedBooks}
                  onToggleBook={toggleBook}
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
              <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-3 pb-2 md:pb-6 flex flex-col gap-6 flex-1 overflow-hidden h-full">
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
                  onSignInClick={openAuthDrawer}
                />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutShell>

      {/* Auth Drawer (global overlay, accessible from anywhere) */}
      {!currentUser && (
        <AuthScreen isOpen={isAuthDrawerOpen} onClose={() => setIsAuthDrawerOpen(false)} />
      )}

      <GlobalDictionaryModal />
      
      <AnimatePresence>
        {showDebugWindow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] bg-white flex flex-col overflow-auto overscroll-none"
          >
            <div className="sticky top-0 right-0 p-4 shrink-0 flex justify-end bg-white/90 backdrop-blur-sm shadow-sm z-10">
              <button 
                onClick={() => setShowDebugWindow(false)}
                className="w-12 h-12 bg-[#F7F7F7] text-[#4B4B4B] rounded-full flex items-center justify-center hover:bg-[#E5E5E5] transition-colors"
              >
                <PiXBold size={24} />
              </button>
            </div>
            <DebugWindow />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
