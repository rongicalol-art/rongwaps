import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { useAppStore } from '../../../store/useAppStore';
import { ActionButton, AppIcon, IconActionButton, KeyChip } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface FeedbackBottomBarProps {
  status: 'idle' | 'correct' | 'wrong';
  correctAnswer?: string;
  pinyin?: string;
  /** The word just practised: shown on a tile after every answer, right or wrong (replaces `correctAnswer`). */
  word?: { hanzi: string; pinyin?: string; meaning: string; simple?: string };
  onContinue: () => void;
  /** Continue is queued until the answer's pronunciation finishes. */
  continueLoading?: boolean;
  onCheck?: () => void;
  isCheckDisabled?: boolean;
  showCheck?: boolean;
  hideWhenAutoAdvance?: boolean;
  showContinueOnWrong?: boolean;
  keyboardShortcutDisabled?: boolean;
  onSkip?: () => void;
  onBreakdown?: () => void;
  onRetry?: () => void;
  activeBook?: {
    accent: string;
    bg: string;
    accentBg: string;
    buttonEdge: string;
    accentHex: string;
  };
}

export function FeedbackBottomBar({ 
  status, 
  correctAnswer, 
  pinyin,
  word,
  onContinue, 
  continueLoading = false,
  onCheck, 
  isCheckDisabled = true,
  showCheck = true,
  hideWhenAutoAdvance = false,
  showContinueOnWrong = true,
  keyboardShortcutDisabled = false,
  onSkip,
  onBreakdown,
  onRetry
}: FeedbackBottomBarProps) {
  
  const reduceMotion = useReducedMotion();
  const isChecked = status !== 'idle';
  const isCorrect = status === 'correct';
  // WCAG 4.1.3: the checked feedback block mounts with the bar, which screen
  // readers do not announce on their own, so it is mirrored into a live region.
  const feedbackAnnouncement = !isChecked
    ? ''
    : isCorrect
      ? 'Correct'
      : correctAnswer
        ? `Incorrect. Correct solution: ${correctAnswer}`
        : 'Incorrect';
  const showSkipAction = !isChecked && isCheckDisabled && Boolean(onSkip);
  const showContinueAction = isChecked && (isCorrect || showContinueOnWrong);
  const showCheckAction = !isChecked && !showSkipAction && showCheck && Boolean(onCheck);
  const showRetryAction = isChecked && Boolean(onRetry);
  
  const shouldShowIdleBar = !isChecked && ((showCheck && !isCheckDisabled) || showSkipAction);
  const shouldShowCheckedBar = isChecked && !hideWhenAutoAdvance;
  const isInteractionActive = shouldShowCheckedBar || shouldShowIdleBar;
  const setIsInteractionActive = useAppStore(state => state.setIsInteractionActive);

  // Sync interaction state to hide mode dock when we are interacting
  useEffect(() => {
    setIsInteractionActive(isInteractionActive);
    return () => setIsInteractionActive(false);
  }, [isInteractionActive, setIsInteractionActive]);

  useEffect(() => {
    if (!isInteractionActive || keyboardShortcutDisabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // A focused button activates itself on Space / Enter; don't fire the bar's action twice.
      if (event.target instanceof HTMLButtonElement && !event.target.disabled) return;
      if (
        (event.key !== ' ' && event.key !== 'Enter') ||
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const primaryAction =
        (showContinueAction && onContinue) ||
        (showCheckAction && !isCheckDisabled && onCheck) ||
        (showSkipAction && onSkip);

      if (!primaryAction) return;
      event.preventDefault();
      primaryAction();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCheckDisabled,
    isInteractionActive,
    keyboardShortcutDisabled,
    onCheck,
    onContinue,
    onSkip,
    showCheckAction,
    showContinueAction,
    showSkipAction,
  ]);

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {feedbackAnnouncement}
      </p>
      <AnimatePresence>
        {isInteractionActive && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", stiffness: 350, damping: 28, mass: 1 }}
            className={cn(
              'absolute bottom-0 left-0 right-0 z-40 transition-colors',
              // Mobile: edge-to-edge docked sheet
              'border-t-2 border-ui-border bg-ui-surface pb-sheet-safe',
              // Desktop: transparent outer wrapper so inner card floats cleanly above the bottom canvas
              'md:border-0 md:bg-transparent md:shadow-none md:p-6 md:pb-8 md:pointer-events-none md:flex md:justify-center'
            )}
          >
            <div
              className={cn(
                'mx-auto flex w-full flex-col gap-3.5 px-4 pt-4 sm:gap-4 sm:pt-5 md:gap-5',
                // Desktop: floating rounded tactile island card
                'md:pointer-events-auto md:max-w-xl md:rounded-feature md:border-2 md:border-b-[length:var(--depth-lg)] md:border-ui-border md:bg-ui-surface md:p-6',
                // Wide screens: one compact row (result + answer, then the action) instead of a tall card
                isChecked && 'lg:max-w-3xl lg:flex-row lg:items-center lg:gap-6 lg:py-4 lg:pl-6 lg:pr-4',
              )}
            >
              {isChecked && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex w-full flex-col px-2 origin-bottom md:px-0 lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-5"
                >
                  <div className={`flex shrink-0 items-center gap-2 text-[18px] font-extrabold sm:text-[20px] ${isCorrect ? 'text-feedback-success-text' : 'text-feedback-danger-text'}`}>
                    <motion.span
                      initial={reduceMotion ? false : { scale: 0.4, rotate: isCorrect ? -12 : 12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                      className="flex shrink-0"
                    >
                      <AppIcon name={isCorrect ? 'check' : 'close'} size={28} />
                    </motion.span>
                    {isCorrect ? 'Correct' : 'Not quite'}
                  </div>
                  {word ? (
                    // Tap the word to open its breakdown and memory hook.
                    <button
                      type="button"
                      onClick={onBreakdown}
                      disabled={!onBreakdown}
                      aria-label={`Open breakdown and memory hook for ${word.hanzi}`}
                      title={onBreakdown ? 'Breakdown and memory hook' : undefined}
                      className="-mx-2 mt-2 flex items-center gap-3.5 rounded-control px-2 py-1.5 text-left transition-colors enabled:hover:bg-ui-hover focus-ring lg:mx-0 lg:mt-0 lg:min-w-0 lg:flex-1 lg:rounded-none lg:border-l-2 lg:border-ui-divider lg:py-0 lg:pl-5 lg:enabled:hover:bg-transparent"
                    >
                      <span className="font-chinese text-3xl font-bold leading-none text-ui-ink-strong sm:text-4xl">{word.hanzi}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        {word.pinyin && <span className="text-lg font-extrabold leading-tight text-ui-ink-strong">{numberToToneMarks(word.pinyin)}</span>}
                        <span className="text-base font-bold leading-snug text-ui-muted-strong">{word.simple ?? word.meaning}</span>
                      </span>
                    </button>
                  ) : !isCorrect && correctAnswer && (
                    // The answer sits on a tile like the app's cards: the thing to remember.
                    <div className="mt-2 flex flex-col gap-0.5 lg:mt-0 lg:min-w-0 lg:flex-1">
                      <div className="text-lg font-extrabold leading-snug text-ui-ink-strong">{correctAnswer}</div>
                      {pinyin && <div className="text-base font-bold text-ui-muted-strong">{numberToToneMarks(pinyin)}</div>}
                    </div>
                  )}
                </motion.div>
              )}


              {(showSkipAction || showContinueAction || showCheckAction || showRetryAction) && (
                <div className={cn('flex w-full items-center gap-3', isChecked && 'lg:w-72 lg:shrink-0')}>
                {showSkipAction ? (
                  <ActionButton
                    onClick={onSkip}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    className="uppercase tracking-widest text-base font-extrabold btn-touch-primary md:text-[17px]"
                    aria-label="Skip question"
                  >
                    Skip
                  </ActionButton>
                ) : showContinueAction ? (
                  <ActionButton
                    onClick={onContinue}
                    variant={isCorrect ? 'success' : 'danger'}
                    size="lg"
                    fullWidth
                    loading={continueLoading}
                    loadingLabel="Playing audio"
                    className="uppercase tracking-wider text-base font-black btn-touch-primary md:text-[17px]"
                  >
                    <span className="relative">
                      {isCorrect ? 'Continue' : 'Got it'}
                      <KeyChip className="border-ui-on-solid/40 text-ui-on-solid/80">Space</KeyChip>
                    </span>
                  </ActionButton>
                ) : showCheckAction ? (
                  <ActionButton
                    disabled={isCheckDisabled}
                    onClick={onCheck}
                    variant="success"
                    size="lg"
                    fullWidth
                    className="uppercase tracking-wider text-base font-black btn-touch-primary md:text-[17px]"
                  >
                    <span className="relative">
                      Check
                      <KeyChip className="border-ui-on-solid/40 text-ui-on-solid/80">Space</KeyChip>
                    </span>
                  </ActionButton>
                ) : null}

                {showRetryAction && onRetry && (
                  <IconActionButton
                    onClick={onRetry}
                    label="Retry"
                    icon={<AppIcon name="restart" size={24} />}
                    size="lg"
                    variant="surface"
                    className={cn(
                      'h-auto btn-touch-primary w-13 sm:w-14 self-stretch rounded-control',
                    )}
                  />
                )}
                {isChecked && onBreakdown && !word && (
                  <IconActionButton
                    onClick={onBreakdown}
                    label="Character breakdown"
                    icon={<AppIcon name="breakdown" size={24} />}
                    size="lg"
                    variant="surface"
                    className={cn(
                      'h-auto btn-touch-primary w-13 sm:w-14 self-stretch rounded-control',
                    )}
                  />
                )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
