import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { PracticeResult, PracticeScript, PracticeStatus } from '../practiceTypes';
import { textIn } from '../practiceTypes';

interface PracticeDockProps {
  /** The window's non-scrolling column; the dock sits at its bottom. */
  host: HTMLElement | null;
  status: PracticeStatus;
  ready: boolean;
  /** Check pressed, result not in yet: no Skip. */
  checking: boolean;
  result: PracticeResult | null;
  script: PracticeScript;
  shortcutsDisabled: boolean;
  /** The bank area the exercise portals its word tiles into. */
  onTrayRef: (element: HTMLDivElement | null) => void;
  onCheck: () => void;
  onSkip: () => void;
  onContinue: () => void;
}

/**
 * The exercise dock, one surface in three states: the word bank with Skip, the
 * word bank with Check once the answer is complete, and the result (green or
 * red) with Continue / Try again. Space or Enter presses its action.
 */
export function PracticeDock({
  host, status, ready, checking, result, script, shortcutsDisabled, onTrayRef, onCheck, onSkip, onContinue,
}: PracticeDockProps) {
  const checked = status !== 'idle';
  const correct = status === 'correct';
  const action = checked ? onContinue : ready ? onCheck : checking ? null : onSkip;

  useEffect(() => {
    if (!action || shortcutsDisabled) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
      if (!checked && !ready) return; // Skip never fires from the keyboard.
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, checked, ready, shortcutsDisabled]);

  if (!host) return null;
  return createPortal(
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 md:px-6 md:pb-6">
      <p role="status" aria-live="polite" className="sr-only">{checked ? (correct ? 'Correct' : 'Not quite') : ''}</p>
      <div
        className={cn(
          'pointer-events-auto mx-auto w-full max-w-2xl border-t-2 px-3 pt-3 pb-sheet-safe transition-colors',
          'md:rounded-feature md:border-2 md:border-b-[length:var(--depth-lg)] md:p-3',
          !checked && 'border-ui-border bg-ui-surface',
          correct && 'border-feedback-success bg-feedback-success-surface',
          status === 'wrong' && 'border-feedback-danger bg-feedback-danger-surface',
        )}
      >
        {/* The bank stays mounted (hidden) through the result so the exercise's tiles keep their place. */}
        {/* With no words in the bank (all placed, or none to place) the dock is just its button. */}
        <div className={cn('flex flex-col gap-3 md:flex-row md:items-center md:[&:has(>[data-bank]:empty)>[data-action]]:w-full', checked && 'hidden')}>
          <div ref={onTrayRef} data-bank="" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 px-1 empty:hidden" />
          <div data-action="" className="shrink-0 md:w-36">
            {ready ? (
              <ActionButton variant="success" size="md" fullWidth onClick={onCheck}>
                Check
              </ActionButton>
            ) : !checking && (
              <ActionButton variant="secondary" size="md" fullWidth onClick={onSkip}>Skip</ActionButton>
            )}
          </div>
        </div>

        {checked && (
          <div className="flex flex-col gap-3 px-1 md:flex-row md:items-center md:gap-5 md:px-2">
            <div className="min-w-0 flex-1">
              <div className={cn('flex items-center gap-2 text-lg font-extrabold', correct ? 'text-feedback-success-edge' : 'text-feedback-danger-edge')}>
                <AppIcon name={correct ? 'check' : 'close'} size={24} />
                {result?.title ?? (correct ? 'Correct' : 'Not quite')}
              </div>
              {result?.sentence && (
                <>
                  <p className="mt-1 font-chinese text-xl font-bold text-ui-ink-strong">{textIn(result.sentence, script)}</p>
                  <p className="text-sm font-bold text-ui-muted-strong">{result.sentence.pinyin} · {result.sentence.english}</p>
                </>
              )}
              {result?.note && <p className="mt-1 text-base font-extrabold leading-snug text-ui-ink">{result.note}</p>}
            </div>
            <div className="shrink-0 md:min-w-44">
              <ActionButton variant={correct ? 'success' : 'danger'} size="md" fullWidth onClick={onContinue}>
                {correct ? 'Continue' : 'Try again'}
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>,
    host,
  );
}
