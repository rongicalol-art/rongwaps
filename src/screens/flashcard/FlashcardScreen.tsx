import React, { useMemo, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ScreenSkeleton, ScreenLayout } from '../../lib/widgets';
import { EmptyReviewState, LessonComplete } from '../../features/practice';
import { SAMPLE_BOOKS } from '../../data/books';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { useFlashcards } from './hooks/useFlashcards';
import { useFlashcardSwipe } from './hooks/useFlashcardSwipe';
import { DraggableFlashcard } from './components/DraggableFlashcard';
import { FlashcardList } from './components/FlashcardList';
import { useAppStore } from '../../store/useAppStore';
import { audioService } from '../../services/audioService';
import { useCardFlow } from '../../hooks/useCardFlow';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { useDeckExclusionActions } from '../../hooks/useDeckExclusionActions';

export type FlashcardViewMode = 'cards' | 'list';

interface FlashcardScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
  mode?: FlashcardViewMode;
  onClose?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  onNavigateToPractice?: () => void;
}

export function FlashcardScreen({
  activeBookId,
  selectedLessons = [],
  isReviewDeck = false,
  isLibraryDeck = false,
  mode = 'cards',
  onClose,
  onContinue,
  continueLabel,
}: FlashcardScreenProps) {
  const activeBook = useMemo(() =>
    SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0]
  , [activeBookId]);

  const {
    cards,
    deckCards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    handleNavigate,
    handleNext,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle,
    deckExclusionKey,
    excludedIds,
    isLoading,
    error
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const { toggleCard } = useDeckExclusionActions(deckExclusionKey);

  const setSwipeFeedback = useAppStore((state) => state.setSwipeFeedback);
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualRevealAudioRef = useRef(false);

  const showFeedback = React.useCallback((level: number) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    
    setSwipeFeedback({
      text: level === 3 || level === 4 ? 'Learned' : 'Review',
      type: level === 3 || level === 4 ? 'learned' : 'review'
    });

    feedbackTimeoutRef.current = setTimeout(() => {
      setSwipeFeedback(null);
    }, 450);
  }, [setSwipeFeedback]);

  const wrappedHandleNext = React.useCallback((level: number) => {
    showFeedback(level);
    handleNext(level);
  }, [handleNext, showFeedback]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      useAppStore.getState().setSwipeFeedback(null);
    };
  }, []);

  const {
    direction,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  } = useFlashcardSwipe(wrappedHandleNext, handleNavigate);

  const handleFinishSetInFlow = React.useCallback(() => {
    if (onContinue) {
      if (continueLabel) {
        const cleaned = continueLabel.replace(/^Continue\s*\(?/, '').replace(/\)?$/, '').trim();
        if (cleaned) {
          setSwipeFeedback({ text: cleaned, type: 'learned' });
          setTimeout(() => {
            setSwipeFeedback(null);
          }, 800);
        }
      }
      onContinue();
    } else {
      setSwipeFeedback({ text: 'Replaying Deck', type: 'learned' });
      setTimeout(() => {
        setSwipeFeedback(null);
      }, 800);
      resetAll();
    }
  }, [continueLabel, onContinue, resetAll, setSwipeFeedback]);

  const { flowStatus, pauseFlow, stopFlow, toggleFlow } = useCardFlow({
    currentCard,
    currentIndex,
    totalCount: cards.length,
    setIsFlipped,
    onAdvance: () => handleNavigate(1),
    onReplay: resetAll,
    onFinishSet: handleFinishSetInFlow,
  });

  useEffect(() => {
    if (flowStatus !== 'idle' || !isFlipped || !currentCard) return;
    if (!autoPlayAudio && !manualRevealAudioRef.current) return;
    manualRevealAudioRef.current = false;
    audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
  }, [autoPlayAudio, currentCard, flowStatus, isFlipped, pronunciationRate]);

  useEffect(() => {
    manualRevealAudioRef.current = false;
  }, [currentCard?.id]);


  const restartSession = React.useCallback(() => {
    stopFlow();
    resetAll();
  }, [resetAll, stopFlow]);
  const partSegments = useMemo(
    () => (isShuffled || isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(cards)),
    [cards, isLibraryDeck, isReviewDeck, isShuffled],
  );

  // Header semantics: cards mode reports live session position (1 / N);
  // list mode reports curation as included / total (20 / 20 → 19 / 20 when a
  // word is excluded), so the progress bar reads "how much of the deck is on".
  const headerCurrentIndex = mode === 'list'
    ? Math.max(cards.length - 1, -1)
    : currentIndex;
  const headerTotalCount = mode === 'list'
    ? deckCards.length
    : cards.length;

  usePracticeHeaderRegistration({
    currentIndex: headerCurrentIndex,
    totalCount: headerTotalCount,
    showLightbulb: false,
    partSegments,
    // No onSettingsClick: opening study settings must not stop the flow —
    // the flow keeps running behind the settings modal.
    onShuffleClick: toggleShuffle,
    onFlowClick: toggleFlow,
    onRestartClick: restartSession,
    isShuffled,
    flowStatus,
  });

  useEffect(() => {
    if (activeBreakdown) pauseFlow();
  }, [activeBreakdown, pauseFlow]);

  // Flow (auto-advance) only makes sense in cards mode — entering the list
  // stops it so it can never advance a card while the user is curating.
  useEffect(() => {
    if (mode === 'list') pauseFlow();
  }, [mode, pauseFlow]);

  // Refs so the keyboard handler always reads the latest values without re-registering
  const currentIndexRef = useRef(currentIndex);
  const cardsLengthRef = useRef(cards.length);
  const maxVisitedIndexRef = useRef(maxVisitedIndex);
  const currentCardRef = useRef(currentCard);
  const isReviewDeckRef = useRef(isReviewDeck);
  const completedRef = useRef(completed);
  const modeRef = useRef(mode);

  currentIndexRef.current = currentIndex;
  cardsLengthRef.current = cards.length;
  maxVisitedIndexRef.current = maxVisitedIndex;
  currentCardRef.current = currentCard;
  isReviewDeckRef.current = isReviewDeck;
  completedRef.current = completed;
  modeRef.current = mode;

  // The session summary replaces all practice interactions; cut any audio
  // that is still ringing from the final card.
  useEffect(() => {
    if (!completed) return;
    audioService.stop();
  }, [completed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completedRef.current || modeRef.current === 'list') return;
      if (document.querySelector('[role="dialog"][aria-label^="Lesson "]')) return;
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      if (activeBreakdown) return;
      if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (['ArrowLeft', 'ArrowRight', ' ', 'm', 'M', 'n', 'N'].includes(e.key)) pauseFlow();

      const idx = currentIndexRef.current;
      const maxIdx = maxVisitedIndexRef.current;
      const card = currentCardRef.current;
      const reviewDeck = isReviewDeckRef.current;

      if (e.key === 'ArrowLeft') {
        if (idx > 0) triggerNav(-1);
      } else if (e.key === 'ArrowRight') {
        const canGoNext = (!reviewDeck || idx < maxIdx) && idx < cardsLengthRef.current;
        if (canGoNext) triggerNav(1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev: boolean) => {
          const next = !prev;
          if (next && card && !autoPlayAudio) manualRevealAudioRef.current = true;
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        // m rates learned immediately; no flip-first step.
        if (!card) return;
        triggerKeyboardRate(3, -1);
      } else if (e.key === 'n' || e.key === 'N') {
        // n rates review immediately; no flip-first step.
        if (!card) return;
        triggerKeyboardRate(1, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBreakdown, autoPlayAudio, isFlipped, pauseFlow, pronunciationRate, triggerNav, triggerKeyboardRate, setIsFlipped]);

  if (isLoading && cards.length === 0) return <ScreenSkeleton type="flashcard" />;

  if (error) {
    return (
      <EmptyReviewState
        onClose={onClose}
        accentBg={activeBook.accentBg}
        buttonEdge={activeBook.buttonEdge}
        title="Something went wrong"
        message={error}
      />
    );
  }

  if (!error && cards.length === 0 && !completed && mode === 'cards') {
    return (
      <EmptyReviewState
        onClose={onClose}
        accentBg={activeBook.accentBg}
        buttonEdge={activeBook.buttonEdge}
        title="Nothing to study yet"
        message="We couldn't find any flashcards for this selection. Try choosing different lessons or adding cards to your library."
      />
    );
  }

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onContinue ?? onClose}
        continueLabel={onContinue ? continueLabel : undefined}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard && !isLoading && mode === 'cards') {
    if (isReviewDeck) {
      return (
        <EmptyReviewState
          onClose={onClose}
          accentBg={activeBook.accentBg}
          buttonEdge={activeBook.buttonEdge}
          title="You're all caught up!"
          message="No cards are due for review right now."
        />
      );
    } else {
      return (
        <EmptyReviewState
          onClose={onClose}
          accentBg={activeBook.accentBg}
          buttonEdge={activeBook.buttonEdge}
          title="Folder is Empty!"
          message="There are no flashcards here yet."
        />
      );
    }
  }

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext = (
    (!isReviewDeck || currentIndex < maxVisitedIndex) && currentIndex < cards.length
  );

  if (mode === 'list') {
    return (
      <FlashcardList
        cards={deckCards}
        excludedIds={excludedIds}
        onToggleCard={toggleCard}
        accentColor={activeBook.accent}
        edgeHex={activeBook.edgeHex}
      />
    );
  }

  const handleCardTap = () => {
    if (!isFlipped && currentCard && !autoPlayAudio) manualRevealAudioRef.current = true;
    setIsFlipped(prev => !prev);
  };

  return (
    <div
      id="flashcards-screen-root"
      className="absolute inset-0 w-full h-full bg-transparent flex flex-col overflow-hidden overscroll-none pt-[72px]"
      onPointerDownCapture={pauseFlow}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Previous flashcard"
        disabled={!canNavigatePrevious}
        onClick={() => triggerNav(-1)}
        className="absolute bottom-0 left-0 top-[72px] z-0 w-1/2 bg-transparent outline-none disabled:pointer-events-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Next flashcard"
        disabled={!canNavigateNext}
        onClick={() => triggerNav(1)}
        className="absolute bottom-0 right-0 top-[72px] z-0 w-1/2 bg-transparent outline-none disabled:pointer-events-none"
      />

      <ScreenLayout maxWidth="none" className="relative flex h-full max-w-[760px] flex-col pb-[112px] pt-2 pointer-events-none md:pb-[120px]">
        <div className="flex-1 flex flex-col justify-center pointer-events-none">
          <div
            className="relative z-10 mx-auto flex h-[clamp(420px,68vh,660px)] max-h-[calc(100dvh-180px)] w-full max-w-[720px] flex-col items-center justify-center pointer-events-none"
          >
            <AnimatePresence mode="popLayout" custom={direction}>
              {currentCard && (
                <DraggableFlashcard
                  key={currentCard.id}
                  card={currentCard}
                  direction={direction}
                  isFlipped={isFlipped}
                  setActiveBreakdown={setActiveBreakdown}
                  triggerSwipeRate={triggerSwipeRate}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                  onCardTap={handleCardTap}
                />
              )}
            </AnimatePresence>

          </div>
        </div>
      </ScreenLayout>

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={activeBreakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />

    </div>
  );
}
