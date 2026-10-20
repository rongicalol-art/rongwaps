import { useEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, EmptyState, PlayfulNavIcon, ScreenLayout } from '../../lib/widgets';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { buildPracticePartSegments } from '../../utils/lesson/practicePartSegments';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';
import { usePinyin } from './hooks/usePinyin';

interface PinyinScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export function PinyinScreen({
  activeBookId,
  selectedLessons = [],
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
  onContinue,
  continueLabel,
}: PinyinScreenProps) {
  const pinyin = usePinyin(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);
  const {
    isLoading, loadError, playlist, currentCard, currentIndex, input, setInput, status,
    check, next, completed, accuracy, restartRound, isShuffled, toggleShuffle, progressInfo,
  } = pinyin;
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const partSegments = useMemo(
    () => (isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(playlist)),
    [isLibraryDeck, isReviewDeck, playlist],
  );

  usePracticeHeaderRegistration({
    currentIndex: progressInfo.displayIndex,
    totalCount: progressInfo.totalCount,
    showLightbulb: false,
    partSegments,
    isRetry: progressInfo.isRetry,
    cleanupPhase: progressInfo.cleanupPhase,
    onShuffleClick: toggleShuffle,
    onRestartClick: restartRound,
    isShuffled,
  });

  useEffect(() => {
    if (status === 'idle' && currentCard) inputRef.current?.focus();
  }, [currentCard, currentIndex, status]);

  if (isLoading) return null;
  const activeBook = SAMPLE_BOOKS.find((book) => book.id === activeBookId) ?? SAMPLE_BOOKS[0];

  if (loadError || playlist.length === 0 || !currentCard) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        <EmptyState
          icon={<PlayfulNavIcon name="pinyinPractice" className="h-12 w-12" />}
          iconBg={loadError ? 'bg-feedback-danger-surface' : 'bg-ui-surface'}
          iconColor={loadError ? 'text-feedback-danger' : activeBook.accent}
          title={loadError ? 'Something went wrong' : 'No pinyin to practise yet'}
          description={loadError
            ? "We couldn't load these words. Please try again."
            : 'There are no words with pinyin in this selection. Try another lesson or add cards to your library.'}
          action={(
            <ActionButton variant="primary" size="lg" onClick={onClose} className="uppercase tracking-wider">
              Go back
            </ActionButton>
          )}
        />
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        accuracy={accuracy}
        onContinue={onContinue ?? onClose}
        continueLabel={onContinue ? continueLabel : undefined}
        onResetAll={restartRound}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-content flex flex-col overflow-hidden pt-[72px] font-sans text-ui-ink">
      <ScreenLayout maxWidth="xl" className="flex flex-1 flex-col items-center justify-center px-4 pb-[180px] md:pb-[160px]">
        <div className="flex w-full max-w-lg flex-col items-center">
          <h2 className="mb-6 text-xl font-black text-ui-ink-strong md:mb-8 md:text-2xl">Type the pinyin</h2>
          <button
            type="button"
            onClick={() => setBreakdown(currentCard.front)}
            aria-label={`Open character breakdown for ${currentCard.front}`}
            className="flex h-44 w-full items-center justify-center rounded-feature border-2 border-ui-divider border-b-[length:var(--depth-md)] bg-ui-surface text-ui-ink-strong transition-colors hover:bg-ui-hover focus-ring sm:h-56"
          >
            <span className="font-chinese text-6xl font-bold leading-none sm:text-7xl">{currentCard.front}</span>
          </button>
          <form
            onSubmit={(event) => { event.preventDefault(); check(); }}
            className="mt-5 w-full"
          >
            <label htmlFor="pinyin-practice-answer" className="mb-2 block text-sm font-extrabold text-ui-muted-strong">Pinyin</label>
            <input
              ref={inputRef}
              id="pinyin-practice-answer"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.repeat || event.nativeEvent.isComposing) return;
                event.preventDefault();
                check();
              }}
              disabled={status !== 'idle'}
              placeholder="Type the pronunciation"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-control border-b-[length:var(--depth-md)] bg-ui-surface px-5 py-5 text-[21px] font-extrabold text-ui-ink outline-none transition-colors placeholder:text-ui-muted focus-ring disabled:bg-ui-hover ${
                status === 'correct'
                  ? 'border-feedback-success'
                  : status === 'wrong'
                    ? 'border-feedback-danger'
                    : 'border-ui-border focus:border-brand-primary'
              }`}
            />
            <p className="mt-2 text-center text-xs font-bold text-ui-muted">Tone marks are optional; tone numbers work too.</p>
          </form>
        </div>
      </ScreenLayout>

      <FeedbackBottomBar
        status={status}
        correctAnswer={currentCard.pinyin ? numberToToneMarks(currentCard.pinyin) : undefined}
        word={{ hanzi: currentCard.front, pinyin: currentCard.pinyin, meaning: currentCard.back, simple: currentCard.simple }}
        onContinue={next}
        onCheck={check}
        isCheckDisabled={!input.trim()}
        keyboardShortcutDisabled={Boolean(breakdown)}
        onBreakdown={() => setBreakdown(currentCard.front)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={breakdown} onClose={() => setBreakdown(null)} activeBook={activeBook} />
    </div>
  );
}
