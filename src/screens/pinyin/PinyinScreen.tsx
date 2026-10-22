import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, AppIcon, EmptyState, PlayfulNavIcon, ScreenLayout } from '../../lib/widgets';
import { MemoryHookCharacter } from '../../features/character-memory-hooks';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { useAppStore } from '../../store/useAppStore';
import { buildPracticePartSegments } from '../../utils/lesson/practicePartSegments';
import { isHanziChar } from '../../utils/characters/hanzi';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';
import { usePinyin } from './hooks/usePinyin';

function pinyinPromptSize(length: number) {
  if (length === 1) return 'text-7xl sm:text-8xl';
  if (length === 2) return 'text-6xl sm:text-7xl';
  if (length === 3) return 'text-5xl sm:text-6xl';
  if (length === 4) return 'text-4xl sm:text-5xl';
  if (length <= 6) return 'text-3xl sm:text-4xl';
  return 'text-2xl sm:text-3xl';
}

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
    check, next, previous, completed, accuracy, restartRound, isShuffled, toggleShuffle, progressInfo,
  } = pinyin;
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptChars = useMemo(() => Array.from(currentCard?.front ?? ''), [currentCard?.front]);
  const promptClassName = pinyinPromptSize(promptChars.length);
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

  const autoAdvanceCorrect = useAppStore((state) => state.autoAdvanceCorrect);
  const autoAdvance = status === 'correct' && autoAdvanceCorrect;

  usePracticeAnswerAutomation({
    status,
    onAdvance: next,
    advanceWrong: false,
    blocked: Boolean(breakdown),
  });

  useEffect(() => {
    if (status === 'idle' && currentCard) inputRef.current?.focus();
  }, [currentCard, currentIndex, status]);

  const handleScreenTap = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button, [role="button"], [role="switch"], [role="dialog"], [role="menu"], [role="note"], [data-no-screen-nav], input, textarea, select, form, [contenteditable="true"]')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width;
    if (position <= 0.4 && currentIndex > 0) previous();
    else if (position >= 0.6 && currentIndex < playlist.length - 1) next();
  }, [currentIndex, next, playlist.length, previous]);

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
      <ScreenLayout maxWidth="none" onClick={handleScreenTap} className="flex flex-1 flex-col items-center justify-center px-4 pb-[180px] md:pb-[160px]">
        <div className="flex w-full max-w-lg flex-col items-center gap-5">
          <h2 className="text-balance text-center text-2xl font-black leading-tight text-ui-ink-strong md:text-3xl">Type the pinyin</h2>
          <div className="flex w-full flex-wrap items-center justify-center gap-x-1 px-4 pb-2 pt-3">
            {promptChars.map((char, index) => isHanziChar(char) ? (
              <MemoryHookCharacter
                key={`${char}-${index}`}
                char={char}
                label={`Open character breakdown for ${char}`}
                onOpen={() => {
                  setBreakdownIndex(index);
                  setBreakdown(currentCard.front);
                }}
                glyphClassName={`${promptClassName} leading-tight text-ui-ink text-center`}
                className="px-1.5 py-1"
              />
            ) : (
              <span key={`${char}-${index}`} className={`font-chinese ${promptClassName} leading-tight text-ui-ink text-center`}>{char}</span>
            ))}
          </div>
          <form
            onSubmit={(event) => { event.preventDefault(); check(); }}
            className="w-full px-2"
          >
            <label htmlFor="pinyin-practice-answer" className="mb-2 block text-sm font-extrabold text-ui-muted-strong">Pinyin</label>
            <div className="relative">
              <AppIcon
                name="keyboard"
                size={22}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ui-muted"
              />
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
                className={`w-full rounded-control border-b-[length:var(--depth-md)] bg-ui-surface py-5 pl-14 pr-5 text-left text-[21px] font-extrabold text-ui-ink outline-none transition-[border-color,background-color] placeholder:text-ui-muted focus-ring disabled:bg-ui-hover ${
                  status === 'correct'
                    ? 'border-feedback-success'
                    : status === 'wrong'
                      ? 'border-feedback-danger'
                      : 'border-ui-border focus:border-brand-primary'
                }`}
              />
            </div>
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
        hideWhenAutoAdvance={autoAdvance}
        keyboardShortcutDisabled={Boolean(breakdown)}
        onBreakdown={() => setBreakdown(currentCard.front)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={breakdown} initialCharIndex={breakdownIndex} onClose={() => setBreakdown(null)} activeBook={activeBook} />
    </div>
  );
}
