import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { PracticeResult, PracticeScript, PracticeStatus } from '../practiceTypes';
import { textIn } from '../practiceTypes';
import { DOCK_IN, DOCK_SWAP } from '../practiceMotion';
import { SentencePlayButton } from './SentencePlayButton';

/** Skip and Back are quiet: neutral ink, not the book's blue. */
const NEUTRAL = '!text-ui-muted-strong';

interface PracticeDockProps {
  /** The window's non-scrolling column; the dock sits at its bottom. */
  host: HTMLElement | null;
  status: PracticeStatus;
  ready: boolean;
  /** The exercise has a Check step (the tap-to-answer ones do not): Check shows, inactive until the answer is complete. */
  hasCheck: boolean;
  /** Check pressed, result not in yet: no Skip. */
  checking: boolean;
  result: PracticeResult | null;
  script: PracticeScript;
  shortcutsDisabled: boolean;
  /** The bank area the exercise portals its word tiles into. */
  onTrayRef?: (element: HTMLDivElement | null) => void;
  onCheck: () => void;
  onSkip: () => void;
  /** Previous item; absent on the first one (the action is removed, not disabled). */
  onBack?: () => void;
  onContinue: () => void;
}

/**
 * The exercise dock, one surface in three states: the word bank with Skip, the
 * word bank with Check once the answer is complete, and the result (green or
 * red) with Continue / Try again. Space or Enter presses its action.
 */
export function PracticeDock({
  host, status, ready, hasCheck, checking, result, script, shortcutsDisabled, onTrayRef, onCheck, onSkip, onBack, onContinue,
}: PracticeDockProps) {
  const reduceMotion = useReducedMotion();
  const checked = status !== 'idle';
  const correct = status === 'correct';
  const action = checked ? onContinue : ready ? onCheck : checking ? null : onSkip;

  useEffect(() => {
    if (!action || shortcutsDisabled) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      // A focused word tile must not swallow Enter; only the dock's own buttons (and inputs) keep their native press.
      if (event.target instanceof HTMLInputElement || (event.target instanceof HTMLElement && event.target.closest('[data-action]'))) return;
      if (!checked && !ready) return; // Skip never fires from the keyboard.
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, checked, ready, shortcutsDisabled]);

  // Arrow keys: Right skips to next, Left goes back.
  useEffect(() => {
    if (checked || checking || shortcutsDisabled) return;
    const onArrow = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSkip();
      } else if (event.key === 'ArrowLeft' && onBack) {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [checked, checking, shortcutsDisabled, onSkip, onBack]);

  if (!host) return null;
  return createPortal(
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0, transition: DOCK_IN }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
    >
      <p role="status" aria-live="polite" className="sr-only">{checked ? (result?.title ?? (correct ? 'Correct' : 'Not quite')) : ''}</p>
      <div
        className={cn(
          'pointer-events-auto w-full border-t-2 px-3 pt-3 pb-sheet-safe transition-colors md:px-6 md:py-4',
          !checked && 'border-ui-divider bg-ui-canvas',
          correct && 'border-feedback-success bg-feedback-success-surface',
          status === 'wrong' && 'border-feedback-danger bg-feedback-danger-surface',
        )}
      >
        <div className="mx-auto w-full max-w-2xl">
        {/* The bank stays mounted (hidden) through the result so the exercise's tiles keep their place. */}
        {/* With no words in the bank (all placed, or none to place) the dock is just its button. */}
        <motion.div
          initial={false}
          animate={{ opacity: checked ? 0 : 1, transition: reduceMotion ? { duration: 0 } : DOCK_SWAP }}
          className={cn('flex flex-col gap-3', checked && 'hidden')}
        >
          {onTrayRef && <div ref={onTrayRef} data-bank="" className="flex min-w-0 flex-wrap items-center justify-center gap-2 px-1 empty:hidden" />}
          <div data-action="" className="flex w-full items-center gap-2">
            {onBack && !checking && (
              <ActionButton variant="quiet" size="md" className={cn(NEUTRAL, '!px-3')} onClick={onBack} aria-label="Back" title="Back">
                <AppIcon name="back" size={22} />
              </ActionButton>
            )}
            {!checking && (
              <div className="ml-auto flex items-center gap-2">
                <ActionButton variant="quiet" size="md" className={NEUTRAL} onClick={onSkip}>Skip</ActionButton>
                {hasCheck && (
                  <div className="min-w-32 md:min-w-44">
                    <ActionButton variant="success" size="md" fullWidth disabled={!ready} onClick={onCheck}>Check</ActionButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {checked && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: DOCK_SWAP }}
            className="flex flex-col gap-3 px-1 md:flex-row md:items-center md:gap-5 md:px-2"
          >
            <div className="min-w-0 flex-1">
              <div className={cn('flex items-center gap-2 text-lg font-extrabold', correct ? 'text-feedback-success-edge' : 'text-feedback-danger-edge')}>
                <AppIcon name={correct ? 'check' : 'close'} size={24} />
                {result?.title ?? (correct ? 'Correct' : 'Not quite')}
              </div>
              {result?.sentence && (
                <>
                  <div className="mt-1 flex items-center gap-1">
                    <p className="font-chinese text-xl font-bold text-ui-ink-strong">{textIn(result.sentence, script)}</p>
                    {correct && <SentencePlayButton sentence={result.sentence} script={script} />}
                  </div>
                  <p className="text-sm font-extrabold text-ui-muted-strong">{result.sentence.pinyin} · {result.sentence.english}</p>
                </>
              )}
              {result?.note && <p className="mt-1 text-base font-extrabold leading-snug text-ui-ink">{result.note}</p>}
            </div>
            <div className="shrink-0 md:min-w-44">
              <ActionButton variant={correct ? 'success' : 'danger'} size="md" fullWidth onClick={onContinue}>
                {correct ? 'Continue' : 'Try again'}
              </ActionButton>
            </div>
          </motion.div>
        )}
        </div>
      </div>
    </motion.div>,
    host,
  );
}
