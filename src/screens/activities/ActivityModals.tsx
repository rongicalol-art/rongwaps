import React, { useState, useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PiHeadphonesFill, PiBrainFill, PiLayoutFill, PiKeyboardFill } from 'react-icons/pi';
import { ActivityModalWrapper, PracticeHeader } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { FlashcardScreen } from '../flashcard';
import { ListeningScreen } from '../listening';
import { QuizScreen } from '../quiz';
import { WritingScreen } from '../writing';
import { AddCardScreen } from '../add-card';
import type { ActivityType } from '../../hooks/useAppNavigation.tsx';
import { SAMPLE_BOOKS } from '../../data/books';

const ACTIVITIES = [
  { id: 'flashcards', icon: PiLayoutFill },
  { id: 'quiz', icon: PiBrainFill },
  { id: 'listening', icon: PiHeadphonesFill },
  { id: 'writing', icon: PiKeyboardFill }
] as const;

/** Slide animation variants used by all activity screens. */
const SLIDE_VARIANTS = {
  initial: (dir: number) => ({
    x: dir > 0 ? '100%' : '-30%',
    opacity: dir > 0 ? 1 : 0.4,
    zIndex: dir > 0 ? 10 : 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    zIndex: 5,
    transition: { type: 'spring' as const, stiffness: 400, damping: 40 }
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-30%' : '100%',
    opacity: dir > 0 ? 0.4 : 1,
    zIndex: dir > 0 ? 0 : 10,
    transition: { type: 'spring' as const, stiffness: 400, damping: 40 }
  })
};

/** Fade-scale variant for the create-card modal (no slide). */
const FADE_VARIANTS = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};

/**
 * Reusable animated wrapper — slides in/out for activity screens,
 * fades for the create-card modal.
 */
function AnimatedScreen({
  children,
  activityKey,
  direction,
  useSlide = true
}: {
  children: ReactNode;
  activityKey: string;
  direction: number;
  useSlide?: boolean;
}) {
  return (
    <motion.div
      key={activityKey}
      custom={useSlide ? direction : undefined}
      variants={useSlide ? SLIDE_VARIANTS : FADE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={useSlide ? undefined : { duration: 0.2 }}
      className="absolute inset-0 w-full h-full"
    >
      {children}
    </motion.div>
  );
}

interface ActivityModalsProps {
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;
  activeBookId: number;
  selectedLessons: number[];
  isLibraryMode?: boolean;
  onNavigateToPractice?: () => void;
}

export function ActivityModals({
  activeActivity,
  setActiveActivity,
  activeBookId,
  selectedLessons,
  isLibraryMode = false,
  onNavigateToPractice
}: ActivityModalsProps) {
  const activities = ACTIVITIES;

  const validModes = activities.map(a => a.id);
  const isOverlayOpen = useAppStore(state => state.isOverlayOpen);
  const isInteractionActive = useAppStore(state => state.isInteractionActive);
  const swipeFeedback = useAppStore(state => state.swipeFeedback);

  const resolvedActivity = activeActivity === 'flashcards-library' ? 'flashcards' : activeActivity === 'flashcards-review' ? 'flashcards' : activeActivity;
  const showDock = resolvedActivity && validModes.includes(resolvedActivity as any) && !isOverlayOpen && (!isInteractionActive || !!swipeFeedback);

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const [prevTask, setPrevTask] = useState<ActivityType>(null);

  useEffect(() => {
    if (activeActivity) {
      setPrevTask(activeActivity);
    }
  }, [activeActivity]);

  const currentIdx = activities.findIndex(a => a.id === resolvedActivity);
  const prevTaskResolved = prevTask === 'flashcards-library' ? 'flashcards' : prevTask;
  const prevIdx = activities.findIndex(a => a.id === prevTaskResolved);
  const direction = currentIdx >= prevIdx ? 1 : -1;

  const { practiceHeader, practiceHeaderActions } = useAppStore();
  const isReviewMode = useAppStore(state => state.isReviewMode);

  const handleClose = () => {
    setActiveActivity(null);
    if (isReviewMode) {
      useAppStore.getState().setIsReviewMode(false);
    }
    if (activeActivity === 'create-card') {
      useAppStore.getState().setActiveReviewSessionCards(null);
      return;
    }
    const currentLibraryFolder = useAppStore.getState().libraryActiveFolder;
    const sharedKey = (isReviewMode || activeActivity === 'flashcards-review') ? `shared_deck_review_${activeBookId}` :
      (isLibraryMode || activeActivity === 'flashcards-library') ? `shared_deck_library_${currentLibraryFolder}` :
      `shared_deck_${activeBookId}_${selectedLessons?.slice().sort().join(',') || 'all'}`;
    useAppStore.getState().clearSessionProgressIndex(sharedKey);
    useAppStore.getState().setActiveReviewSessionCards(null);
  };

  return (
    <>
      <AnimatePresence>
        {activeActivity && (
          <ActivityModalWrapper id="global-activity-modal">
            {activeActivity !== 'create-card' && (
               <div className="absolute top-0 left-0 right-0 z-[150]">
                 <PracticeHeader
                    maxWidth="xl"
                    onClose={handleClose}
                    progress={practiceHeader.totalCount > 0 ? (practiceHeader.currentIndex / practiceHeader.totalCount) * 100 : 0}
                    currentIndex={practiceHeader.currentIndex}
                    totalCount={practiceHeader.totalCount}
                    accentBgClassName={activeBook.accentBg}
                    showLightbulb={practiceHeader.showLightbulb}
                    onLightbulbClick={practiceHeaderActions.onLightbulbClick}
                    onSettingsClick={practiceHeaderActions.onSettingsClick}
                 />
               </div>
            )}

            <AnimatePresence custom={direction} mode="popLayout">
              {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && (
                <AnimatedScreen activityKey="flashcards" direction={direction}>
                  <FlashcardScreen
                    activeBookId={activeBookId}
                    selectedLessons={selectedLessons}
                    isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
                    isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
                    onClose={handleClose}
                    onNavigateToPractice={onNavigateToPractice}
                  />
                </AnimatedScreen>
              )}

              {activeActivity === 'listening' && (
                <AnimatedScreen activityKey="listening" direction={direction}>
                  <ListeningScreen
                    activeBookId={activeBookId}
                    selectedLessons={selectedLessons}
                    isReviewDeck={isReviewMode}
                    isLibraryDeck={isLibraryMode}
                    onClose={handleClose}
                  />
                </AnimatedScreen>
              )}

              {activeActivity === 'quiz' && (
                <AnimatedScreen activityKey="quiz" direction={direction}>
                  <QuizScreen
                    activeBookId={activeBookId}
                    selectedLessons={selectedLessons}
                    isReviewDeck={isReviewMode}
                    isLibraryDeck={isLibraryMode}
                    onClose={handleClose}
                  />
                </AnimatedScreen>
              )}

              {activeActivity === 'writing' && (
                <AnimatedScreen activityKey="writing" direction={direction}>
                  <WritingScreen
                    activeBookId={activeBookId}
                    selectedLessons={selectedLessons}
                    isReviewDeck={isReviewMode}
                    isLibraryDeck={isLibraryMode}
                    onClose={handleClose}
                  />
                </AnimatedScreen>
              )}

              {activeActivity === 'create-card' && (
                <AnimatedScreen activityKey="create-card" direction={direction} useSlide={false}>
                  <AddCardScreen onClose={() => setActiveActivity(null)} />
                </AnimatedScreen>
              )}
            </AnimatePresence>
          </ActivityModalWrapper>
        )}
      </AnimatePresence>

      {/* Floating Pill Dock for Modes */}
      <AnimatePresence>
        {showDock && (
          <>
            {/* Bottom Fade Gradient Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-[200]"
              style={{
                background: `linear-gradient(to top, ${activeBook.neutralBg || '#F7F7F7'} 0%, ${activeBook.neutralBg || '#F7F7F7'}d0 40%, transparent 100%)`
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              className="absolute bottom-0 left-0 right-0 z-[250] pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 px-4 flex justify-center pointer-events-none mb-4 md:mb-6"
            >
            <div className="w-full max-w-[280px] bg-white border-[3px] border-[#E5E5E5] border-b-[6px] rounded-[24px] p-2 flex items-center justify-center pointer-events-auto shadow-md relative overflow-hidden">
              <AnimatePresence mode="popLayout">
                {swipeFeedback ? (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="flex items-center justify-center gap-2.5 w-full h-[48px]"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${swipeFeedback.type === 'learned' ? 'bg-[#58CC02]' : 'bg-[#FF4B4B]'}`} />
                    <span className={`text-[15px] font-extrabold tracking-widest uppercase ${swipeFeedback.type === 'learned' ? 'text-[#46A302]' : 'text-[#D63030]'}`}>
                      {swipeFeedback.text}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dock-icons"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="flex items-center justify-center w-full"
                  >
                    {activities.map(act => {
                      const isSelected = resolvedActivity === act.id;
                      const DockIcon = act.icon;
                      return (
                        <button
                          key={act.id}
                          onClick={() => {
                            if (isLibraryMode && act.id === 'flashcards') {
                              setActiveActivity('flashcards-library');
                            } else if (isReviewMode && act.id === 'flashcards') {
                              setActiveActivity('flashcards-review');
                            } else {
                              setActiveActivity(act.id as ActivityType);
                            }
                          }}
                          className={`relative flex-1 h-[48px] flex items-center justify-center rounded-[18px] transition-colors z-10 outline-none cursor-pointer
                          ${isSelected ? 'text-white' : 'text-[#AFB6BB] hover:text-[#4B4B4B]'}`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="global-mode-tab-indicator"
                              className={`absolute inset-0 z-[-1] rounded-[16px] ${activeBook.accentBg || 'bg-[#1CB0F6]'} shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)]`}
                              transition={{ type: "spring", stiffness: 450, damping: 30 }}
                            />
                          )}
                          <DockIcon size={26} className="relative z-10" />
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
