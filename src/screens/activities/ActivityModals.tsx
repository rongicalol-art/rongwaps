import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActivityModalWrapper, AppIcon, type AppIconName, LoadingScreen } from '../../lib/widgets';
import { useAppStore, selectIsActivityOverlayOpen } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { useActivityDataLoader } from '../../hooks/useActivityDataLoader';
import { getPracticeLoadingMessage, preloadPracticeChunks, preloadRemainingPracticeChunks } from '../../utils/practiceLoader';
import type { ActivityType } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { getDeckIdentityKey } from '../../utils/lessonPartSelection';
import { PracticeModeDock, PRACTICE_ACTIVITIES } from './components/PracticeModeDock';
import { ActivityPracticeHeader } from './components/ActivityPracticeHeader';
import { PracticeDockSlotProvider } from '../../features/practice';
import { ActivityScreens } from './components/ActivityScreens';
import { usePracticeDockLayout } from './components/practiceDockLayout';
import { useActivityStudyParts } from './hooks';
import type { FlashcardViewMode } from '../flashcard';

interface ActivityModalsProps {
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;
  activeBookId: number;
  selectedLessons: number[];
  isLibraryMode?: boolean;
  /**
   * True while the app shell paints an overlay window (Reading Mode, grammar
   * lesson, dictionary word detail) over this modal. Owned by `App.tsx` — the
   * shell's overlays are not activity state and do not belong in the store.
   */
  isShellOverlayOpen: boolean;
  onNavigateToPractice?: () => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  onOpenReading?: () => void;
}

export function ActivityModals({
  activeActivity,
  setActiveActivity,
  activeBookId,
  selectedLessons,
  isLibraryMode = false,
  isShellOverlayOpen,
  onNavigateToPractice,
  onOpenGrammarPart,
  onOpenReading,
}: ActivityModalsProps) {
  const activities = PRACTICE_ACTIVITIES;

  const validModes = activities.map(a => a.id);
  const isActivityOverlayOpen = useAppStore(selectIsActivityOverlayOpen);
  const isOverlayOpen = isShellOverlayOpen || isActivityOverlayOpen;
  const isInteractionActive = useAppStore(state => state.isInteractionActive);
  const feedbackToast = useAppStore(state => state.feedbackToast);
  const swipeFeedback = useAppStore(state => state.swipeFeedback);
  const activeToast = feedbackToast || swipeFeedback;

  const resolvedActivity = activeActivity === 'flashcards-library' ? 'flashcards' : activeActivity === 'flashcards-review' ? 'flashcards' : activeActivity;
  const isReviewMode = useAppStore(state => state.isReviewMode);

  const isPracticeSession = Boolean(activeActivity && activeActivity !== 'create-card');
  const { cards: deckCards, isLoading: isLoadingDeck } = useActivityDataLoader(
    activeBookId,
    selectedLessons,
    isReviewMode || activeActivity === 'flashcards-review',
    isLibraryMode || activeActivity === 'flashcards-library',
  );

  const [loadedChunks, setLoadedChunks] = useState<Set<ActivityType>>(() => new Set());

  useEffect(() => {
    if (!resolvedActivity || resolvedActivity === 'create-card') return;
    if (loadedChunks.has(resolvedActivity)) return;

    let cancelled = false;
    void preloadPracticeChunks(resolvedActivity).then(() => {
      if (!cancelled) {
        setLoadedChunks((prev) => new Set(prev).add(resolvedActivity));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedActivity, loadedChunks]);

  const isChunkReady = Boolean(resolvedActivity && loadedChunks.has(resolvedActivity));
  const isDeckReady = !isLoadingDeck && (
    isReviewMode || activeActivity === 'flashcards-review' || deckCards.length > 0
  );
  const isSessionLoading = isPracticeSession && (!isChunkReady || !isDeckReady);

  useEffect(() => {
    if (isPracticeSession && !isLoadingDeck) {
      preloadRemainingPracticeChunks();
    }
  }, [isPracticeSession, isLoadingDeck]);

  const showDock = Boolean(
    resolvedActivity &&
    validModes.some((mode) => mode === resolvedActivity) &&
    !isOverlayOpen &&
    !isInteractionActive &&
    !isSessionLoading,
  );

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const [prevTask, setPrevTask] = useState<ActivityType>(null);
  const dockAutoHide = useAppStore(state => state.dockAutoHide);
  const dockLayout = usePracticeDockLayout(useAppStore(state => state.dockStyle));
  const activeQuizMode = useAppStore(state => state.activeQuizMode);
  const setActiveQuizMode = useAppStore(state => state.setActiveQuizMode);

  // Cards vs List view for the flashcards deck. Resets to Cards on close so
  // the next session opens in the default study view.
  const [flashcardMode, setFlashcardMode] = useState<FlashcardViewMode>('cards');
  const [isDockScrollVisible, setIsDockScrollVisible] = useState(true);

  useEffect(() => {
    if (!activeActivity) setFlashcardMode('cards');
    setIsDockScrollVisible(true);
  }, [activeActivity, flashcardMode]);

  const previousActivityRef = useRef<ActivityType>(null);
  useEffect(() => {
    if (activeActivity) {
      setPrevTask(activeActivity);
      if (activeActivity !== 'writing') {
        previousActivityRef.current = activeActivity;
      }
    }
  }, [activeActivity]);

  const currentIdx = activities.findIndex(a => a.id === resolvedActivity);
  const prevTaskResolved = prevTask === 'flashcards-library' ? 'flashcards' : prevTask;
  const prevIdx = activities.findIndex(a => a.id === prevTaskResolved);
  const direction = currentIdx >= prevIdx ? 1 : -1;


  const {
    visibleStudyParts,
    practiceGrammarPart,
    selectStudyPart,
    toggleStudyPart,
    onPartContinue,
    partContinueLabel,
  } = useActivityStudyParts({
    activeBookId,
    selectedLessons,
    isLibraryMode,
    isReviewMode,
    activeActivity,
    onOpenGrammarPart,
  });

  const activityLabel = activeActivity === 'create-card'
    ? 'Create a card'
    : `${activities.find((activity) => activity.id === resolvedActivity)?.label ?? 'Study'} practice`;

  const handleClose = () => {
    previousActivityRef.current = null;
    setActiveActivity(null);
    if (isReviewMode) {
      useAppStore.getState().setIsReviewMode(false);
    }
    if (activeActivity === 'create-card') {
      useAppStore.getState().setActiveReviewSessionCards(null);
      return;
    }
    const sharedKey = getDeckIdentityKey({
      activeBookId,
      selectedLessons,
      selectedLessonParts: useAppStore.getState().selectedLessonParts,
      libraryActiveFolder: useAppStore.getState().libraryActiveFolder,
      isReviewDeck: isReviewMode || activeActivity === 'flashcards-review',
      isLibraryDeck: isLibraryMode || activeActivity === 'flashcards-library',
    });
    useAppStore.getState().clearSessionProgressIndex(sharedKey);
    useAppStore.getState().setActiveReviewSessionCards(null);
  };

  const handleWritingClose = useCallback(() => {
    const defaultStudyCards: ActivityType = isLibraryMode
      ? 'flashcards-library'
      : isReviewMode
      ? 'flashcards-review'
      : 'flashcards';
    const targetActivity = previousActivityRef.current || defaultStudyCards;
    setActiveActivity(targetActivity);
  }, [isLibraryMode, isReviewMode, setActiveActivity]);

  return (
    <>
      <AnimatePresence>
        {activeActivity && (
          <ActivityModalWrapper id="global-activity-modal" ariaLabel={activityLabel} onClose={handleClose}>
            <AnimatePresence mode="wait">
              {isSessionLoading ? (
                <motion.div
                  key="lesson-loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute inset-0 z-activity flex flex-col items-center justify-center bg-ui-practice-canvas"
                >
                  <LoadingScreen
                    message={getPracticeLoadingMessage(activeActivity, isReviewMode, isLibraryMode)}
                    tone="practice"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="lesson-loaded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={cn('relative flex flex-1 flex-col overflow-hidden', dockLayout.insetClassName)}
                >
                  <PracticeDockSlotProvider isVertical={dockLayout.isVertical}>
                    <ActivityPracticeHeader
                      resolvedActivity={resolvedActivity}
                      activeActivity={activeActivity}
                      isOverlayOpen={isOverlayOpen}
                      accentBgClassName={activeBook.accentBg}
                      activeBookId={activeBookId}
                      studyParts={visibleStudyParts}
                      onSelectStudyPart={selectStudyPart}
                      onToggleStudyPart={toggleStudyPart}
                      onClose={handleClose}
                      onWritingClose={handleWritingClose}
                      flashcardMode={flashcardMode}
                      insetClassName={dockLayout.edgeInsetClassName}
                    />

                    <ActivityScreens
                      activeActivity={activeActivity}
                      activeBookId={activeBookId}
                      selectedLessons={selectedLessons}
                      isReviewMode={isReviewMode}
                      isLibraryMode={isLibraryMode}
                      activeQuizMode={activeQuizMode}
                      flashcardMode={flashcardMode}
                      direction={direction}
                      onClose={handleClose}
                      onWritingClose={handleWritingClose}
                      onCreateCardClose={() => setActiveActivity(null)}
                      onContinue={onPartContinue}
                      continueLabel={partContinueLabel}
                      onNavigateToPractice={onNavigateToPractice}
                      onScrollDockVisibility={flashcardMode === 'list' ? setIsDockScrollVisible : undefined}
                      edgeInsetClassName={dockLayout.edgeInsetClassName}
                    />

                    {/* Floating Pill Dock for Modes */}
                    <AnimatePresence>
                      {showDock && !isDockScrollVisible && (
                        <div
                          key="dock-reveal-zone"
                          aria-hidden
                          onMouseEnter={() => setIsDockScrollVisible(true)}
                          className={cn('absolute z-dock', dockLayout.revealZoneClassName)}
                        />
                      )}
                      {showDock && (
                        <PracticeModeDock
                          value={resolvedActivity as (typeof PRACTICE_ACTIVITIES)[number]['id']}
                          quizMode={activeQuizMode}
                          flashcardMode={flashcardMode}
                          visible={isDockScrollVisible}
                          layout={dockLayout}
                          autoHide={dockAutoHide}
                          onSelectFlashcardMode={(mode) => {
                            if (isLibraryMode) {
                              setActiveActivity('flashcards-library');
                            } else if (isReviewMode) {
                              setActiveActivity('flashcards-review');
                            } else {
                              setActiveActivity('flashcards');
                            }
                            setFlashcardMode(mode);
                          }}
                          onOpenGrammar={practiceGrammarPart && onOpenGrammarPart
                            ? () => onOpenGrammarPart(practiceGrammarPart.id)
                            : undefined}
                          onOpenReading={onOpenReading}
                          onSelectQuizMode={(mode) => {
                            setActiveQuizMode(mode);
                            setActiveActivity('quiz');
                          }}
                          onChange={(nextActivity) => {
                            if (isLibraryMode && nextActivity === 'flashcards') {
                              setActiveActivity('flashcards-library');
                            } else if (isReviewMode && nextActivity === 'flashcards') {
                              setActiveActivity('flashcards-review');
                            } else {
                              setActiveActivity(nextActivity);
                            }
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </PracticeDockSlotProvider>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simple, non-distracting confirmation toast matching RongWaps tactile tokens */}
            <AnimatePresence>
              {activeToast && (() => {
                const isLearned = activeToast.type === 'learned' || activeToast.text.toLowerCase() === 'learned';
                const isReview = activeToast.type === 'review' || activeToast.text.toLowerCase() === 'review';
                const isShuffle = activeToast.text.toLowerCase().includes('shuffle');
                const isRestart = activeToast.text.toLowerCase().includes('restart');

                const iconName: AppIconName = isLearned
                  ? 'statusCheck'
                  : isReview
                    ? 'statusCross'
                    : isShuffle
                      ? (activeToast.text.toLowerCase().includes('unshuffled') ? 'statusUnshuffled' : 'statusShuffle')
                      : isRestart
                        ? 'statusRestart'
                        : 'statusCheck';
                const textColor = isLearned ? 'text-feedback-success-edge' : isReview ? 'text-feedback-danger-edge' : 'text-ui-ink-strong';

                return (
                  <motion.div
                    key={`${activeToast.text}-${activeToast.type || ''}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    role="status"
                    className="pointer-events-none absolute top-15 right-8 sm:right-10 lg:right-14 z-popover flex items-center gap-2.5 rounded-control border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface px-3.5 py-2"
                  >
                    <AppIcon
                      name={iconName}
                      size={20}
                      className="shrink-0"
                    />
                    <span className={cn('text-xs font-black uppercase tracking-wider', textColor)}>
                      {activeToast.text}
                    </span>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </ActivityModalWrapper>
        )}
      </AnimatePresence>
    </>
  );
}
