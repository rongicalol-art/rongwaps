import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActivityModalWrapper, LoadingScreen } from '../../lib/widgets';
import { useAppStore, selectIsActivityOverlayOpen } from '../../store/useAppStore';
import { useActivityDataLoader } from '../../hooks/useActivityDataLoader';
import { getPracticeLoadingMessage, preloadPracticeChunks, preloadRemainingPracticeChunks } from '../../utils/practiceLoader';
import { AddCardScreen } from '../add-card';
import type { ActivityType } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { getDeckIdentityKey } from '../../utils/lessonPartSelection';
import { PracticeModeDock, PRACTICE_ACTIVITIES } from './components/PracticeModeDock';
import { AnimatedActivityScreen } from './components/AnimatedActivityScreen';
import { ActivityPracticeHeader } from './components/ActivityPracticeHeader';
import { useActivityStudyParts } from './hooks';
import type { FlashcardViewMode } from '../flashcard';

const FlashcardScreen = lazy(() => (
  import('../flashcard').then((module) => ({ default: module.FlashcardScreen }))
));
const ListeningScreen = lazy(() => (
  import('../listening').then((module) => ({ default: module.ListeningScreen }))
));
const QuizScreen = lazy(() => (
  import('../quiz').then((module) => ({ default: module.QuizScreen }))
));
const WritingScreen = lazy(() => (
  import('../writing').then((module) => ({ default: module.WritingScreen }))
));

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
    resolvedActivity !== 'writing' &&
    !isOverlayOpen &&
    !isInteractionActive &&
    !isSessionLoading,
  );

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const [prevTask, setPrevTask] = useState<ActivityType>(null);
  const activeQuizMode = useAppStore(state => state.activeQuizMode);
  const setActiveQuizMode = useAppStore(state => state.setActiveQuizMode);

  // Cards vs List view for the flashcards deck. Resets to Cards on close so
  // the next session opens in the default study view.
  const [flashcardMode, setFlashcardMode] = useState<FlashcardViewMode>('cards');
  useEffect(() => {
    if (!activeActivity) setFlashcardMode('cards');
  }, [activeActivity]);

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
                  className="relative flex flex-1 flex-col overflow-hidden"
                >
                  <ActivityPracticeHeader
                    resolvedActivity={resolvedActivity}
                    activeActivity={activeActivity}
                    isOverlayOpen={isOverlayOpen}
                    accentBgClassName={activeBook.accentBg}
                    studyParts={visibleStudyParts}
                    onSelectStudyPart={selectStudyPart}
                    onToggleStudyPart={toggleStudyPart}
                    onClose={handleClose}
                    onWritingClose={handleWritingClose}
                    flashcardMode={flashcardMode}
                  />

                  <AnimatePresence custom={direction} mode="popLayout">
                    {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && (
                      <AnimatedActivityScreen activityKey="flashcards" direction={direction}>
                        <Suspense fallback={null}>
                          <FlashcardScreen
                            activeBookId={activeBookId}
                            selectedLessons={selectedLessons}
                            isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
                            isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
                            mode={flashcardMode}
                            onClose={handleClose}
                            onContinue={onPartContinue}
                            continueLabel={partContinueLabel}
                            onNavigateToPractice={onNavigateToPractice}
                          />
                        </Suspense>
                      </AnimatedActivityScreen>
                    )}

                    {activeActivity === 'listening' && (
                      <AnimatedActivityScreen activityKey="listening" direction={direction}>
                        <Suspense fallback={null}>
                          <ListeningScreen
                            activeBookId={activeBookId}
                            selectedLessons={selectedLessons}
                            isReviewDeck={isReviewMode}
                            isLibraryDeck={isLibraryMode}
                            onClose={handleClose}
                            onContinue={onPartContinue}
                            continueLabel={partContinueLabel}
                          />
                        </Suspense>
                      </AnimatedActivityScreen>
                    )}

                    {activeActivity === 'quiz' && (
                      <AnimatedActivityScreen activityKey="quiz" direction={direction}>
                        <Suspense fallback={null}>
                          <QuizScreen
                            activeBookId={activeBookId}
                            selectedLessons={selectedLessons}
                            isReviewDeck={isReviewMode}
                            isLibraryDeck={isLibraryMode}
                            mode={activeQuizMode ?? 'choices'}
                            onClose={handleClose}
                            onContinue={onPartContinue}
                            continueLabel={partContinueLabel}
                          />
                        </Suspense>
                      </AnimatedActivityScreen>
                    )}

                    {activeActivity === 'writing' && (
                      <AnimatedActivityScreen activityKey="writing" direction={direction}>
                        <Suspense fallback={null}>
                          <WritingScreen
                            activeBookId={activeBookId}
                            selectedLessons={selectedLessons}
                            isReviewDeck={isReviewMode}
                            isLibraryDeck={isLibraryMode}
                            onClose={handleWritingClose}
                            onContinue={onPartContinue}
                            continueLabel={partContinueLabel}
                          />
                        </Suspense>
                      </AnimatedActivityScreen>
                    )}

                    {activeActivity === 'create-card' && (
                      <AnimatedActivityScreen activityKey="create-card" direction={direction} useSlide={false}>
                        <AddCardScreen onClose={() => setActiveActivity(null)} />
                      </AnimatedActivityScreen>
                    )}
                  </AnimatePresence>

                  {/* Floating Pill Dock for Modes */}
                  <AnimatePresence>
                    {showDock && (
                      <PracticeModeDock
                        value={resolvedActivity as (typeof PRACTICE_ACTIVITIES)[number]['id']}
                        quizMode={activeQuizMode}
                        flashcardMode={flashcardMode}
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
                </motion.div>
              )}
            </AnimatePresence>
          </ActivityModalWrapper>
        )}
      </AnimatePresence>
    </>
  );
}
