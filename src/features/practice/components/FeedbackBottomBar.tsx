import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { numberToToneMarks } from '../../../utils/pinyin';
import { useAppStore } from '../../../store/useAppStore';
import { ActionButton, AppIcon, IconActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface FeedbackBottomBarProps {
  status: 'idle' | 'correct' | 'wrong';
  correctAnswer?: string;
  pinyin?: string;
  onContinue: () => void;
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
  onContinue, 
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
  
  const isChecked = status !== 'idle';
  const isCorrect = status === 'correct';
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
      if (
        event.key !== 'Enter' ||
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
            'border-t-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
            !isChecked
              ? 'border-ui-border bg-ui-surface'
              : isCorrect
                ? 'border-feedback-success-edge/25 bg-feedback-success-surface'
                : 'border-feedback-danger-edge/30 bg-feedback-danger-surface',
            // Desktop: transparent outer wrapper so inner card floats cleanly above the bottom canvas
            'md:border-0 md:bg-transparent md:shadow-none md:p-6 md:pb-8 md:pointer-events-none md:flex md:justify-center'
          )}
        >
          <div
            className={cn(
              'mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-5 md:gap-5',
              // Desktop: floating rounded tactile island card
              'md:pointer-events-auto md:max-w-xl md:rounded-feature md:border-2 md:border-b-[length:var(--depth-lg)] md:shadow-ambient-lg md:p-6',
              !isChecked
                ? 'md:border-ui-border md:bg-ui-surface'
                : isCorrect
                  ? 'md:border-feedback-success-edge/35 md:border-b-feedback-success-edge/70 md:bg-feedback-success-surface'
                  : 'md:border-feedback-danger-edge/40 md:border-b-feedback-danger-edge/70 md:bg-feedback-danger-surface'
            )}
          >
            {isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex w-full flex-col px-2 origin-bottom md:px-0"
              >
                <div className="flex w-full items-center pb-2">
                  <div className={`flex items-center gap-3 text-[18px] font-extrabold sm:text-[22px] ${isCorrect ? 'text-feedback-success-edge' : 'text-feedback-danger-edge'}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ui-surface md:h-10 md:w-10 ${isCorrect ? 'bg-feedback-success-edge' : 'bg-feedback-danger-edge'}`}>
                      <AppIcon name={isCorrect ? 'check' : 'error'} size={24} />
                    </div>
                    {isCorrect ? 'Awesome!' : 'Correct solution:'}
                  </div>
                </div>
                {!isCorrect && correctAnswer && (
                  <div className="ml-1 mt-1 flex flex-col gap-1 text-feedback-danger-edge">
                    <div className="text-[19px] font-bold">{correctAnswer}</div>
                    {pinyin && <div className="text-[17px] font-medium opacity-80">{numberToToneMarks(pinyin)}</div>}
                  </div>
                )}
              </motion.div>
            )}


            {(showSkipAction || showContinueAction || showCheckAction || showRetryAction) && (
              <div className="flex w-full items-center gap-3">
              {showSkipAction ? (
                <ActionButton
                  onClick={onSkip}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="uppercase tracking-widest text-[15px] md:text-[17px]"
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
                  className="uppercase tracking-widest text-[15px] md:text-[17px]"
                >
                  {isCorrect ? 'Continue' : 'Got it'}
                </ActionButton>
              ) : showCheckAction ? (
                <ActionButton
                  disabled={isCheckDisabled}
                  onClick={onCheck}
                  variant="success"
                  size="lg"
                  fullWidth
                  className="uppercase tracking-widest text-[15px] md:text-[17px]"
                >
                  Check
                </ActionButton>
              ) : null}

              {showRetryAction && onRetry && (
                <IconActionButton
                  onClick={onRetry}
                  label="Retry"
                  icon={<AppIcon name="restart" size={24} />}
                  size="lg"
                  className={cn(
                    'h-auto min-h-13 w-14 self-stretch shrink-0 rounded-feature border-2 border-b-[length:var(--depth-lg)] active:translate-y-[length:var(--depth-lg)] active:border-b-2 transition-[transform,filter,background-color,border-color]',
                    isCorrect
                      ? 'border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge hover:bg-feedback-success-surface hover:text-feedback-success-edge hover:brightness-95 active:bg-feedback-success-surface active:text-feedback-success-edge active:brightness-90'
                      : 'border-feedback-danger-edge bg-feedback-danger-surface text-feedback-danger-edge hover:bg-feedback-danger-surface hover:text-feedback-danger-edge hover:brightness-95 active:bg-feedback-danger-surface active:text-feedback-danger-edge active:brightness-90',
                  )}
                />
              )}
              {isChecked && onBreakdown && (
                <IconActionButton
                  onClick={onBreakdown}
                  label="Character breakdown"
                  icon={<AppIcon name="breakdown" size={24} />}
                  size="lg"
                  className={cn(
                    'h-auto min-h-13 w-14 self-stretch shrink-0 rounded-feature border-2 border-b-[length:var(--depth-lg)] active:translate-y-[length:var(--depth-lg)] active:border-b-2 transition-[transform,filter,background-color,border-color]',
                    isCorrect
                      ? 'border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge hover:bg-feedback-success-surface hover:text-feedback-success-edge hover:brightness-95 active:bg-feedback-success-surface active:text-feedback-success-edge active:brightness-90'
                      : 'border-feedback-danger-edge bg-feedback-danger-surface text-feedback-danger-edge hover:bg-feedback-danger-surface hover:text-feedback-danger-edge hover:brightness-95 active:bg-feedback-danger-surface active:text-feedback-danger-edge active:brightness-90',
                  )}
                />
              )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
