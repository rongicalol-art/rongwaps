import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../lib/widgets';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';

export interface QuizPopWord {
  hanzi: string;
  pinyin?: string;
  meaning: string;
  simple?: string;
}

/** How long a right answer's word stays up; the next question is already live underneath. */
const POP_MS = 1600;

/**
 * A right answer that auto-advances skips the feedback bar, so its word pops up where the bar lives
 * (word, pinyin, meaning, no button) and slides away on its own. It never holds the next question.
 */
export const QuizWordPop: React.FC<{ word: QuizPopWord | null; nonce: string; clear: boolean }> = ({ word, nonce, clear }) => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState<{ word: QuizPopWord; nonce: string } | null>(null);
  // Each answer pops once, even if it is still on screen after the pop has gone.
  const [poppedNonce, setPoppedNonce] = useState<string | null>(null);
  if (word && poppedNonce !== nonce) {
    setPoppedNonce(nonce);
    setShown({ word, nonce });
  }
  // A visible feedback bar or Check button takes the same space.
  if (clear && shown) setShown(null);

  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(null), POP_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-sheet-safe md:p-6 md:pb-8">
      <AnimatePresence mode="popLayout">
        {shown && (
          <motion.div
            key={shown.nonce}
            initial={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="mb-4 flex w-full max-w-md items-center gap-3.5 rounded-feature border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface px-5 py-3.5 md:mb-0"
          >
            <AppIcon name="check" size={24} className="shrink-0 text-feedback-success-text" />
            <span className="font-chinese text-3xl font-bold leading-none text-ui-ink-strong">{shown.word.hanzi}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              {shown.word.pinyin && (
                <span className="text-lg font-extrabold leading-tight text-ui-ink-strong">{numberToToneMarks(shown.word.pinyin)}</span>
              )}
              <span className="line-clamp-2 text-base font-bold leading-snug text-ui-muted-strong">{shown.word.simple ?? shown.word.meaning}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
