import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { useQuizTyping } from './hooks/useQuiz';
import { QuizHanziPrompt, QuizShell, type QuizModeProps } from './QuizShell';
import { useAppStore, type TypingPromptType } from '../../store/useAppStore';
import { AppIcon } from '../../lib/widgets';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';

const NO_NUMBER_OPTIONS: readonly number[] = [];
const ignoreNumberSelection = () => {};

interface QuizTypingCardProps {
  currentCard: Flashcard;
  input: string;
  status: 'idle' | 'correct' | 'wrong';
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  onOpenBreakdown: (index: number) => void;
  promptType: TypingPromptType;
  /** The word just answered: shown on the card and kept through the next one, so its meaning is readable without a pause. */
  previous: Flashcard | null;
}

const QuizTypingCard: React.FC<QuizTypingCardProps> = ({
  currentCard, input, status, onInputChange, onSubmit, onOpenBreakdown, promptType, previous
}) => {
  const reduceMotion = useReducedMotion();
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const meaningOf = (card: Flashcard) => (simpleDefinitions && card.simple) ? card.simple : card.back;
  return (
  <motion.div
    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.14, ease: 'easeOut' }}
    className="flex w-full flex-col"
  >
    {promptType === 'meaning' ? (
      <div className="flex w-full items-center justify-center pb-7 pt-8 px-4">
        <span className="text-2xl sm:text-3xl font-extrabold text-ui-ink text-center leading-snug">
          {meaningOf(currentCard)}
        </span>
      </div>
    ) : (
      <QuizHanziPrompt front={currentCard.front} onOpenBreakdown={onOpenBreakdown} className="pb-7 pt-8" />
    )}

    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full px-2"
    >
      {/* The last word rides in the label's line, so the input never moves. */}
      <div className="mb-2 flex min-h-5 items-baseline justify-center gap-2 text-sm">
        <label htmlFor="quiz-pinyin-answer" className={previous ? 'sr-only' : 'mr-auto font-extrabold text-ui-muted-strong'}>
          Pinyin
        </label>
        {previous && (
          <motion.p
            key={previous.id}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="min-w-0 truncate text-center text-ui-muted-strong"
          >
            <span className="font-chinese text-base text-ui-ink">{previous.front}</span>
            {previous.pinyin && <span className="ml-2 font-extrabold text-ui-ink">{numberToToneMarks(previous.pinyin)}</span>}
            <span className="ml-2 font-bold">{meaningOf(previous)}</span>
          </motion.p>
        )}
      </div>
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

export const QuizTyping: React.FC<QuizModeProps> = ({ cards, sessionKey, ...shell }) => {
  const session = useQuizTyping(cards, sessionKey);
  const { currentCard, input, handleInputChange, status, handleCheck } = session;
  // Remember each answered word; once the next card is up it becomes the "previous" line.
  const [answered, setAnswered] = useState<Flashcard | null>(null);
  if (status !== 'idle' && currentCard && answered?.id !== currentCard.id) setAnswered(currentCard);
  // A right answer shows its own word there at once (no wait), and it stays while the next card is typed.
  const previous = status === 'correct' ? currentCard : answered && answered.id !== currentCard?.id ? answered : null;
  const typingPromptType = useAppStore((state) => state.typingPromptType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  useNumberKeySelection({
    items: NO_NUMBER_OPTIONS,
    onSelect: ignoreNumberSelection,
    disabled: status !== 'idle',
    onDebugAnswer: () => {
      const answer = currentCard.pinyin;
      if (!answer) return;
      handleInputChange(answer);
      handleCheck(answer);
    },
  });

  return (
    <QuizShell
      {...shell}
      session={session}
      mode="quiz-typing"
      title="Type the pinyin"
      status={status}
      correctAnswer={numberToToneMarks(currentCard?.pinyin || '')}
      word={currentCard ? { hanzi: currentCard.front, pinyin: currentCard.pinyin, meaning: currentCard.back, simple: simpleDefinitions ? currentCard.simple : undefined } : undefined}
      isCheckDisabled={!input.trim()}
    >
      {({ openBreakdown }) => (
        <QuizTypingCard
          currentCard={currentCard}
          input={input}
          status={status}
          onInputChange={handleInputChange}
          onSubmit={handleCheck}
          onOpenBreakdown={openBreakdown}
          promptType={typingPromptType}
          previous={previous}
        />
      )}
    </QuizShell>
  );
};
