import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActionButton, ActivityModalWrapper, AppIcon, type AppIconName, EmptyState, LoadingScreen } from '../../lib/widgets';
import { peekQuizTypes, stashQuizTypes } from '../../utils/srs/resumeState';
import { useAppStore, selectIsActivityOverlayOpen } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { useActivityDataLoader } from '../../hooks/useActivityDataLoader';
import { getPracticeLoadingMessage, preloadRemainingPracticeChunks } from '../../utils/practiceLoader';
import { useFontGate, useOpenPhase } from '../../hooks/useOpenPhase';
import type { ActivityType } from '../../types/models';
import type { QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { SAMPLE_BOOKS } from '../../data/books';
import { PracticeModeDock, PRACTICE_ACTIVITIES } from './components/PracticeModeDock';
import { ActivityPracticeHeader } from './components/ActivityPracticeHeader';
import { PracticeDockSlotProvider, type SessionStats } from '../../features/practice';
import { ActivityScreens } from './components/ActivityScreens';
import { usePracticeDockLayout } from './components/practiceDockLayout';
import { useActivityStudyParts, usePracticeScreenReady } from './hooks';
import { usePracticeDataReady } from './hooks/usePracticeDataReady';
import type { Flashcard } from '../../data/flashcards';

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
  onOpenGrammarPart,
  onOpenReading,
}: ActivityModalsProps) {
  const activities = PRACTICE_ACTIVITIES;

  const validModes = activities.map(a => a.id);
  const isActivityOverlayOpen = useAppStore(selectIsActivityOverlayOpen);
  const isOverlayOpen = isShellOverlayOpen || isActivityOverlayOpen;
  const isInteractionActive = useAppStore(state => state.isInteractionActive);
  const isLessonWindowOpen = useAppStore(state => state.isLessonWindowOpen);
  const feedbackToast = useAppStore(state => state.feedbackToast);
  const swipeFeedback = useAppStore(state => state.swipeFeedback);
  const activeToast = feedbackToast || swipeFeedback;

  const resolvedActivity = activeActivity === 'flashcards-library' ? 'flashcards' : activeActivity === 'flashcards-review' ? 'flashcards' : activeActivity;
  const isReviewMode = useAppStore(state => state.isReviewMode);
  const isReviewSession = isReviewMode || activeActivity === 'flashcards-review';
  const effectiveLibraryMode = (isLibraryMode || activeActivity === 'flashcards-library') && !isReviewSession;

  const isPracticeSession = Boolean(activeActivity && activeActivity !== 'create-card');
  const { cards: deckCards, isLoading: isLoadingDeck, error: deckError, retry: retryDeck } = useActivityDataLoader(
    activeBookId,
    selectedLessons,
    isReviewSession,
    effectiveLibraryMode,
    isPracticeSession,
  );
  const sessionDeckRef = useRef<Flashcard[]>([]);
  if (deckCards.length > 0) sessionDeckRef.current = deckCards;

  // ONE readiness owner for opening a practice session: screen chunk + deck (+ future gates such
  // as fonts). Warm or fast opens go straight to content; slow ones show one loader only while waiting.
  const screen = usePracticeScreenReady(resolvedActivity);
  const data = usePracticeDataReady(deckCards, isPracticeSession && !isLoadingDeck);
  // The first cards' characters: their font slices must be loaded so no glyph swaps after reveal.
  const firstCardsText = !isPracticeSession || isLoadingDeck ? '' : deckCards.slice(0, 6).map((card) => card.front).join('');
  const fontGate = useFontGate(firstCardsText);
  const phase = useOpenPhase(
    activeActivity === 'create-card' || (screen.ready && !isLoadingDeck && data.ready && !deckError),
    fontGate,
    activeActivity ? 'open' : 'closed',
  );
  const hasRevealed = useRef(false);
  const hadLoader = useRef(false);
  if (phase === 'loading') hadLoader.current = true;
  if (phase === 'ready') hasRevealed.current = true;
  if (!activeActivity) { hasRevealed.current = false; hadLoader.current = false; }
  // Switching modes inside a session never falls back to a loader or a blank frame.
  const showContent = phase === 'ready' || hasRevealed.current;
  const isSessionLoading = isPracticeSession && !showContent;
  const loadError = deckError || screen.error || data.error;

  // Lesson-part practice hides the mode dock; Writing keeps it for its controls.
  const isLessonPartFocused = isLessonWindowOpen && selectedLessons.length === 1 && !isReviewSession && !effectiveLibraryMode;
  const isIndependentStudy = selectedLessons.length > 1 && !isReviewSession && !effectiveLibraryMode;
  const hasDock = isLessonPartFocused
    ? resolvedActivity === 'writing'
    : isIndependentStudy || (resolvedActivity !== 'flashcards' && resolvedActivity !== 'quiz');
  useEffect(() => {
    if (isPracticeSession && !isLoadingDeck) {
      return preloadRemainingPracticeChunks(resolvedActivity);
    }
  }, [isPracticeSession, isLoadingDeck, resolvedActivity, hasDock]);
  const showDock = Boolean(
    hasDock &&
    resolvedActivity &&
    validModes.some((mode) => mode === resolvedActivity) &&
    !isOverlayOpen &&
    !isInteractionActive &&
    !isSessionLoading,
  );

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const [prevTask, setPrevTask] = useState<ActivityType>(null);
  // Cards done's shuffled top card and the round's stats; live only while the quiz they lead into is the activity.
  const [quizTypes, setQuizTypes] = useState<QuizTypeId[] | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  // Continue on a saved quiz arrives with the types it was left in (skips the picker).
  if (!quizTypes && activeActivity === 'quiz') {
    const resumed = peekQuizTypes();
    if (resumed) setQuizTypes(resumed);
  }
  if (quizTypes && activeActivity !== 'quiz') setQuizTypes(null);
  // The stash is for one launch: gone once the quiz took it (or the window closed).
  useEffect(() => { if (!activeActivity || quizTypes) stashQuizTypes(null); }, [activeActivity, quizTypes]);
  if (sessionStats && activeActivity !== 'quiz') setSessionStats(null);
  const dockAutoHide = useAppStore(state => state.dockAutoHide);
  const dockLayout = usePracticeDockLayout(useAppStore(state => state.dockStyle));
  const activeQuizMode = useAppStore(state => state.activeQuizMode);
  const setActiveQuizMode = useAppStore(state => state.setActiveQuizMode);

  const insetClassName = hasDock ? dockLayout.insetClassName : '';
  const edgeInsetClassName = hasDock ? dockLayout.edgeInsetClassName : '';

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
    isLibraryMode: effectiveLibraryMode,
    isReviewMode: isReviewSession,
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
    useAppStore.getState().setActiveReviewSessionCards(null);
  };

  const handleWritingClose = useCallback(() => {
    const defaultStudyCards: ActivityType = effectiveLibraryMode
      ? 'flashcards-library'
      : isReviewSession
      ? 'flashcards-review'
      : 'flashcards';
    const targetActivity = previousActivityRef.current || (isLessonWindowOpen ? null : defaultStudyCards);
    setActiveActivity(targetActivity);
  }, [effectiveLibraryMode, isLessonWindowOpen, isReviewSession, setActiveActivity]);

  return (
    <>
      <AnimatePresence>
        {activeActivity && (
          <ActivityModalWrapper id="global-activity-modal" ariaLabel={activityLabel} onClose={handleClose}>
            <AnimatePresence>
              {(phase === 'loading' || loadError) && !showContent && (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute inset-0 z-activity bg-ui-practice-canvas"
                >
                  {loadError ? <EmptyState title="Study couldn’t load" description={loadError} action={<div className="flex gap-3"><ActionButton onClick={() => { retryDeck(); screen.retry(); data.retry(); }}>Retry</ActionButton><ActionButton variant="secondary" onClick={handleClose}>Back</ActionButton></div>} />
                    : <><LoadingScreen
                      message={isLoadingDeck ? getPracticeLoadingMessage(activeActivity, isReviewSession, effectiveLibraryMode) : 'Preparing examples and dictionary…'}
                      tone="practice"
                    /><div className="absolute inset-x-0 bottom-8 z-content flex justify-center"><ActionButton variant="secondary" onClick={handleClose}>Cancel</ActionButton></div></>}
                </motion.div>
              )}
            </AnimatePresence>
            {showContent && (
              <div
                data-dock-bottom={isIndependentStudy && !dockLayout.isVertical ? '' : undefined}
                className={cn('relative flex flex-1 flex-col overflow-hidden', hadLoader.current && 'animate-in fade-in duration-200', insetClassName)}
              >
              <PracticeDockSlotProvider isVertical={dockLayout.isVertical}>
                <ActivityPracticeHeader
                  resolvedActivity={resolvedActivity}
                  activeActivity={activeActivity}
                  isOverlayOpen={isOverlayOpen}
                  accentBgClassName={activeBook.accentBg}
                  activeBookId={activeBookId}
                  studyParts={visibleStudyParts}
                  isLessonPartFocused={isLessonPartFocused}
                  onSelectStudyPart={selectStudyPart}
                  onToggleStudyPart={toggleStudyPart}
                  onClose={handleClose}
                  onWritingClose={handleWritingClose}
                  insetClassName={edgeInsetClassName}
                />

                <ActivityScreens
                  activeActivity={activeActivity}
                  activeBookId={activeBookId}
                  selectedLessons={selectedLessons}
                  isReviewMode={isReviewSession}
                  isLibraryMode={effectiveLibraryMode}
                  activeQuizMode={activeQuizMode}
                  direction={direction}
                  onClose={handleClose}
                  onWritingClose={handleWritingClose}
                  onOpenWriting={() => setActiveActivity('writing')}
                  onCreateCardClose={() => setActiveActivity(null)}
                  onContinue={onPartContinue}
                  continueLabel={partContinueLabel}
                  quizFirstId={deckCards[0]?.id}
                  sessionDeck={sessionDeckRef.current}
                  quizTypes={quizTypes}
                  sessionStats={sessionStats}
                  onStartQuiz={(types, stats) => {
                    setQuizTypes(types);
                    setSessionStats(stats);
                    setActiveActivity('quiz');
                  }}
                  edgeInsetClassName={edgeInsetClassName}
                />

                {/* Floating Pill Dock for Modes */}
                <AnimatePresence>
                  {showDock && (
                    <PracticeModeDock
                      value={resolvedActivity as (typeof PRACTICE_ACTIVITIES)[number]['id']}
                      quizMode={activeQuizMode}
                      layout={dockLayout}
                      autoHide={dockAutoHide}
                      onOpenGrammar={practiceGrammarPart && onOpenGrammarPart
                        ? () => onOpenGrammarPart(practiceGrammarPart.id)
                        : undefined}
                      onOpenReading={onOpenReading}
                      onSelectQuizMode={(mode) => {
                        setActiveQuizMode(mode);
                        setActiveActivity('quiz');
                      }}
                      onChange={(nextActivity) => {
                        if (isReviewSession && nextActivity === 'flashcards') {
                          setActiveActivity('flashcards-review');
                        } else if (effectiveLibraryMode && nextActivity === 'flashcards') {
                          setActiveActivity('flashcards-library');
                        } else {
                          setActiveActivity(nextActivity);
                        }
                      }}
                    />
                  )}
                </AnimatePresence>
              </PracticeDockSlotProvider>
              </div>
            )}

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
