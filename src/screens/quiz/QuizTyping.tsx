import React from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { useQuizTyping } from './hooks/useQuiz';
import { QuizHanziPrompt, QuizShell, type QuizModeProps } from './QuizShell';
import { useAppStore, type TypingPromptType } from '../../store/useAppStore';
import { AppIcon } from '../../lib/widgets';
import { numberToToneMarks } from '../../utils/pinyin';

interface QuizTypingCardProps {
  currentCard: Flashcard;
  input: string;
  status: 'idle' | 'correct' | 'wrong';
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  onOpenBreakdown: (index: number) => void;
  promptType: TypingPromptType;
}

const QuizTypingCard: React.FC<QuizTypingCardProps> = ({
  currentCard, input, status, onInputChange, onSubmit, onOpenBreakdown, promptType
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.14, ease: 'easeOut' }}
    className="flex w-full flex-col will-change-transform"
  >
    {promptType === 'meaning' ? (
      <div className="flex w-full items-center justify-center pb-7 pt-8 px-4">
        <span className="text-2xl sm:text-3xl font-extrabold text-ui-ink text-center leading-snug">
          {currentCard.back}
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

export const QuizTyping: React.FC<QuizModeProps> = ({ cards, sessionKey, ...shell }) => {
  const session = useQuizTyping(cards, sessionKey);
  const { currentCard, input, handleInputChange, status, handleCheck, retryAnswer } = session;
  const typingPromptType = useAppStore((state) => state.typingPromptType);

  return (
    <QuizShell
      {...shell}
      sessionKey={sessionKey}
      session={session}
      mode="quiz-typing"
      title="Type the pinyin"
      status={status}
      correctAnswer={numberToToneMarks(currentCard?.pinyin || '')}
      isCheckDisabled={!input.trim()}
    >
      {({ openBreakdown }) => (
        <QuizTypingCard
          currentCard={currentCard}
          input={input}
          status={status}
          onInputChange={handleInputChange}
          onSubmit={status === 'wrong' ? retryAnswer : handleCheck}
          onOpenBreakdown={openBreakdown}
          promptType={typingPromptType}
        />
      )}
    </QuizShell>
  );
};
