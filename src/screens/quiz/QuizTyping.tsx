import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete, BreakdownExpandPanel } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { MemoryHookCharacter } from '../../features/character-memory-hooks';
import { useQuizTyping } from './hooks/useQuiz';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { isHanziChar } from '../../utils/hanzi';
import { AppIcon } from '../../lib/widgets';
import { numberToToneMarks } from '../../utils/pinyin';

interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  activeBookId: number;
  sessionKey: string;
}

interface QuizTypingCardProps {
  currentCard: Flashcard;
  input: string;
  status: 'idle' | 'correct' | 'wrong';
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  onOpenBreakdown: (index: number) => void;
}

const QuizTypingCard: React.FC<QuizTypingCardProps> = ({
  currentCard, input, status, onInputChange, onSubmit, onOpenBreakdown
}) => {
  const frontLength = currentCard?.front?.length || 1;
  const getFrontFontSize = (len: number) => {
    if (len === 1) return 'text-[90px] sm:text-[120px]';
    if (len === 2) return 'text-[70px] sm:text-[96px]';
    if (len === 3) return 'text-[54px] sm:text-[72px]';
    if (len === 4) return 'text-[44px] sm:text-[60px]';
    if (len <= 6) return 'text-[36px] sm:text-[48px]';
    return 'text-[28px] sm:text-[36px]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col will-change-transform"
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-x-1 pb-7 pt-8 px-4">
        {Array.from(currentCard.front).map((char, i) =>
          isHanziChar(char) ? (
            <MemoryHookCharacter
              key={i}
              char={char}
              label={`Open character breakdown for ${char}`}
              onOpen={() => onOpenBreakdown(i)}
              glyphClassName={`${getFrontFontSize(frontLength)} leading-tight text-ui-ink text-center`}
              className="px-1.5 py-1"
            />
          ) : (
            <span key={i} className={`${getFrontFontSize(frontLength)} font-chinese leading-tight text-ui-ink`}>
              {char}
            </span>
          ),
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full px-2"
      >
        <label htmlFor="quiz-pinyin-answer" className="mb-2 block text-sm font-extrabold text-ui-muted-strong">
          Pinyin
        </label>
        <div className="relative">
          <AppIcon
            name="keyboard"
            size={22}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ui-muted"
          />
          <input
            id="quiz-pinyin-answer"
            type="text"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.repeat || event.nativeEvent.isComposing) return;
              event.preventDefault();
              onSubmit();
            }}
            disabled={status !== 'idle'}
            className={`w-full rounded-control border-b-[length:var(--depth-md)] bg-ui-surface py-5 pl-14 pr-5 text-left text-[21px] font-extrabold text-ui-ink outline-none transition-[border-color,background-color] placeholder:text-ui-muted focus-ring disabled:bg-ui-hover ${
              status === 'correct'
                ? 'border-feedback-success'
                : status === 'wrong'
                  ? 'border-feedback-danger'
                  : 'border-ui-border focus:border-brand-primary'
            }`}
            placeholder="Type the pronunciation"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </div>
      </form>
    </motion.div>
  );
};

export const QuizTyping: React.FC<QuizModeProps> = ({ cards, onEnd, activeBookId, sessionKey }) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const {
    activeCards,
    currentIndex,
    currentCard,
    input,
    handleInputChange,
    status,
    handleCheck,
    retryAnswer,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle,
  } = useQuizTyping(cards, sessionKey);
  const autoAdvanceCorrect = usePracticePreferencesStore((state) => state.autoAdvanceCorrect);
  const autoAdvance = status === 'correct' ? autoAdvanceCorrect : false;

  // The inline breakdown panel is per-card; close it when the card changes.
  React.useEffect(() => {
    setBreakdownOpen(false);
  }, [currentCard?.id]);

  const handleTypingSubmit = () => {
    if (status === 'wrong') {
      retryAnswer();
      return;
    }
    handleCheck();
  };

  usePracticeAnswerAutomation({
    status,
    onAdvance: handleCheck,
    advanceWrong: false,
    blocked: Boolean(activeBreakdown),
  });
  const partSegments = useMemo(
    () => (isShuffled ? [] : buildPracticePartSegments(activeCards)),
    [activeCards, isShuffled],
  );
  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: activeCards.length,
    showLightbulb: false,
    partSegments,
    onShuffleClick: toggleShuffle,
    onRestartClick: resetAll,
    isShuffled,
  });

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onEnd}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard) return null;

  return (
    <div className="relative flex-1 flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 sm:px-6 pb-[200px] overscroll-none overflow-y-auto">
        <div className="mt-4 flex w-full items-center justify-start px-2">
          <h2 className="text-[24px] font-extrabold text-ui-ink sm:text-[26px]">
            Type the pinyin
          </h2>
        </div>

        <QuizTypingCard
          key={`${currentIndex}:${currentCard.id}`}
          currentCard={currentCard}
          input={input}
          status={status}
          onInputChange={handleInputChange}
          onSubmit={handleTypingSubmit}
          onOpenBreakdown={(index) => {
            setBreakdownIndex(index);
            setBreakdownOpen(false);
            setActiveBreakdown(currentCard.front);
          }}
        />
      </div>

      <FeedbackBottomBar
        status={status}
        correctAnswer={numberToToneMarks(currentCard.pinyin || '')}
        onContinue={status === 'correct' ? () => handleCheck() : retryAnswer}
        showCheck={false}
        isCheckDisabled={!input.trim()}
        hideWhenAutoAdvance={autoAdvance && status !== 'idle'}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={() => setBreakdownOpen((open) => !open)}
        breakdownOpen={breakdownOpen}
        breakdownPanel={
          <BreakdownExpandPanel
            front={currentCard.front}
            pinyin={currentCard.pinyin}
            meaning={currentCard.back}
          />
        }
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={breakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />

    </div>
  );
}
