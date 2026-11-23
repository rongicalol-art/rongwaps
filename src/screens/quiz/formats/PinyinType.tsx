import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { AppIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { isPinyinAnswerAccepted } from '../../../utils/pinyin/pinyinAnswer';
import { QuizHanziPrompt } from '../QuizShell';

const NO_NUMBER_OPTIONS: readonly number[] = [];
const ignoreNumberSelection = () => {};

interface PinyinTypeProps {
  card: Flashcard;
  status: 'idle' | 'correct' | 'wrong';
  onAnswer: (correct: boolean) => void;
  onOpenBreakdown: (index: number) => void;
  breakdownOpen: boolean;
  onReadyChange: (ready: boolean) => void;
  checkRef: React.MutableRefObject<(() => void) | null>;
}

/** Type the pinyin for a word (hanzi or meaning prompt). Fast mode: right answers move on at once. */
export const PinyinType: React.FC<PinyinTypeProps> = ({
  card, status, onAnswer, onOpenBreakdown, breakdownOpen, onReadyChange, checkRef,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const promptType = useAppStore((state) => state.typingPromptType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const isChecked = status !== 'idle';

  const submit = useCallback((value = input) => {
    if (isChecked || breakdownOpen || !value.trim()) return;
    onAnswer(isPinyinAnswerAccepted(value, card.pinyin));
  }, [breakdownOpen, card.pinyin, input, isChecked, onAnswer]);

  useEffect(() => {
    onReadyChange(Boolean(input.trim()) && !isChecked);
  }, [input, isChecked, onReadyChange]);

  useEffect(() => {
    checkRef.current = !isChecked && input.trim() ? () => submit() : null;
    return () => { checkRef.current = null; };
  }, [checkRef, input, isChecked, submit]);

  useEffect(() => {
    if (!isChecked && !breakdownOpen) inputRef.current?.focus();
  }, [breakdownOpen, card.id, isChecked]);

  useNumberKeySelection({
    items: NO_NUMBER_OPTIONS,
    onSelect: ignoreNumberSelection,
    disabled: isChecked || breakdownOpen,
    onDebugAnswer: () => {
      if (!card.pinyin) return;
      setInput(card.pinyin);
      submit(card.pinyin);
    },
  });

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col"
    >
      {promptType === 'meaning' ? (
        <div className="flex w-full items-center justify-center px-4 pb-7 pt-8">
          <span className="text-center text-2xl font-extrabold leading-snug text-ui-ink sm:text-3xl">
            {(simpleDefinitions && card.simple) ? card.simple : card.back}
          </span>
        </div>
      ) : (
        <QuizHanziPrompt front={card.front} onOpenBreakdown={onOpenBreakdown} className="pb-7 pt-8" />
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
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
            ref={inputRef}
            id="quiz-pinyin-answer"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (!event.repeat) submit();
            }}
            disabled={isChecked}
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
          />
        </div>
      </form>
    </motion.div>
  );
};
