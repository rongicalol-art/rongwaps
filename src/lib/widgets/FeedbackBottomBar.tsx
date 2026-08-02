import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { numberToToneMarks } from '../../utils/pinyin';
import { useAppStore } from '../../store/useAppStore';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';

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
          className={`absolute bottom-0 left-0 right-0 z-40 border-t-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] ${
            !isChecked ? 'border-ui-border bg-ui-surface' :
            (isCorrect ? 'border-transparent bg-feedback-success-surface' : 'border-transparent bg-feedback-danger-surface')
          }`}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:pb-10 md:pt-6">
            {isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex w-full flex-col px-2 origin-bottom"
              >
                <div className="flex w-full items-center pb-2">
                  <div className={`flex items-center gap-3 text-[18px] font-extrabold sm:text-[22px] ${isCorrect ? 'text-feedback-success-edge' : 'text-feedback-danger-edge'}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] text-ui-surface md:h-10 md:w-10 ${isCorrect ? 'bg-feedback-success-edge' : 'bg-feedback-danger-edge'}`}>
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
                <button
                  disabled={false}
                  onClick={onSkip}
                  className="flex-1 rounded-[16px] border-2 border-ui-border bg-ui-surface py-4 text-[15px] font-extrabold uppercase tracking-widest text-ui-muted-strong transition-all hover:bg-ui-surface-hover active:translate-y-[3px] md:text-[17px]"
                  aria-label="Skip question"
                >
                  Skip
                </button>
              ) : showContinueAction ? (
                <button
                  onClick={onContinue}
                  className={`flex-1 rounded-[16px] border-b-2 py-4 text-[15px] font-extrabold uppercase tracking-widest text-ui-surface transition-all active:translate-y-[4px] active:border-b-0 md:text-[17px] ${
                    isCorrect
                      ? 'border-feedback-success-edge bg-feedback-success hover:bg-feedback-success-hover'
                      : 'border-feedback-danger-edge bg-feedback-danger hover:bg-feedback-danger-hover'
                  }`}
                >
                  {isCorrect ? 'Continue' : 'Got it'}
                </button>
              ) : showCheckAction ? (
                <button
                  disabled={isCheckDisabled}
                  onClick={onCheck}
                  className={`flex-1 rounded-[16px] py-4 text-[15px] font-extrabold uppercase tracking-widest transition-all active:border-b-0 md:text-[17px] ${
                    isCheckDisabled
                      ? 'cursor-not-allowed bg-ui-border text-ui-muted'
                      : 'border-b-2 border-feedback-success-edge bg-feedback-success text-ui-surface active:translate-y-[4px] hover:bg-feedback-success-hover'
                  }`}
                >
                  Check
                </button>
              ) : null}

              {showRetryAction && onRetry && (
                <IconActionButton
                  onClick={onRetry}
                  label="Retry"
                  icon={<AppIcon name="restart" size={28} />}
                  className={`h-[56px] w-[56px] self-stretch rounded-[16px] border-2 border-b-[6px] active:translate-y-[3px] active:border-b-2 ${isCorrect ? 'border-feedback-success-edge/30 bg-feedback-success-surface text-feedback-success-edge hover:border-feedback-success-edge' : 'border-feedback-danger-edge/30 bg-feedback-danger-surface text-feedback-danger-edge hover:border-feedback-danger-edge'}`}
                />
              )}
              {isChecked && onBreakdown && (
                <IconActionButton
                  onClick={onBreakdown}
                  label="Character breakdown"
                  icon={<AppIcon name="breakdown" size={28} />}
                  className={`h-[56px] w-[56px] self-stretch rounded-[16px] border-2 border-b-[6px] active:translate-y-[3px] active:border-b-2 ${isCorrect ? 'border-feedback-success-edge/30 bg-feedback-success-surface text-feedback-success-edge hover:border-feedback-success-edge' : 'border-feedback-danger-edge/30 bg-feedback-danger-surface text-feedback-danger-edge hover:border-feedback-danger-edge'}`}
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
