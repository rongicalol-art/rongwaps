import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ScreenHeaderProps } from './ScreenHeader';
import { ScreenHeader } from './ScreenHeader';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { PracticeControlPanel } from './PracticeControlPanel';
import type { PracticeSettingsScreenProps } from './PracticeSettingsScreen';
import { PracticeSettingsScreen } from './PracticeSettingsScreen';
import type { PracticeHeaderActions } from '../../types/models';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/useAppStore';

interface PracticeHeaderProps extends Omit<ScreenHeaderProps, 'rightAction'>, Omit<PracticeHeaderActions, 'onLightbulbClick'> {
  settings: Omit<PracticeSettingsScreenProps, 'isOpen' | 'onClose' | 'className'>;
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const;

export function PracticeHeader({
  onSettingsClick,
  onShuffleClick,
  onFlowClick,
  onRestartClick,
  isShuffled,
  flowStatus = 'idle',
  settings,
  ...props
}: PracticeHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const setIsOverlayOpen = useAppStore((state) => state.setIsOverlayOpen);

  useEffect(() => {
    if (flowStatus === 'playing') setIsExpanded(false);
  }, [flowStatus]);

  useEffect(() => {
    setIsOverlayOpen(isSettingsOpen);
    return () => {
      if (isSettingsOpen) setIsOverlayOpen(false);
    };
  }, [isSettingsOpen, setIsOverlayOpen]);

  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const openSettings = () => {
    setIsExpanded(false);
    setIsSettingsOpen(true);
    onSettingsClick?.();
  };

  const isFlowActive = flowStatus === 'playing';
  const hasSessionControls = Boolean(
    onSettingsClick || onShuffleClick || onFlowClick || onRestartClick,
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative mx-auto mt-[calc(0.75rem+env(safe-area-inset-top,0px))] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-[18px] border-b-4 border-ui-border bg-ui-surface md:w-[calc(100%-2rem)]"
      >
        <ScreenHeader
          {...props}
          maxWidth="xl"
          progressSize="compact"
          className={cn(
            '!h-auto !min-h-0 rounded-none !border-0 !bg-transparent !py-1.5 !shadow-none',
            isExpanded && 'border-b-0 shadow-none',
          )}
          rightAction={hasSessionControls ? (
            <div className="flex items-center gap-1 pointer-events-auto">
              {hasSessionControls && (
                <IconActionButton
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  className={cn(
                    'relative',
                    (isExpanded || isFlowActive) && 'text-brand-primary hover:text-brand-primary',
                  )}
                  label="Session controls"
                  title="Practice controls"
                  size="md"
                  aria-expanded={isExpanded}
                  aria-controls="practice-session-controls"
                  icon={(
                    <>
                      {isFlowActive && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-feedback-success ring-2 ring-ui-surface animate-pulse" />}
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.34, ease: IOS_EASE }}
                      >
                        <AppIcon name="expand" size={20} />
                      </motion.span>
                    </>
                  )}
                />
              )}
            </div>
          ) : undefined}
        />

        <motion.div
          id="practice-session-controls"
          initial={false}
          animate={isExpanded
            ? { height: 'auto', opacity: 1, y: 0 }
            : { height: 0, opacity: 0, y: -4 }}
          transition={{
            height: { duration: reduceMotion ? 0 : 0.34, ease: IOS_EASE },
            y: { duration: reduceMotion ? 0 : 0.34, ease: IOS_EASE },
            opacity: {
              duration: reduceMotion ? 0 : isExpanded ? 0.22 : 0.14,
              delay: reduceMotion || !isExpanded ? 0 : 0.035,
              ease: 'easeOut',
            },
          }}
          aria-hidden={!isExpanded}
          inert={!isExpanded}
          className="relative left-0 right-0 top-auto overflow-hidden rounded-none border-0 bg-transparent will-change-[height,opacity,transform]"
        >
          <div className="mx-auto w-full max-w-lg px-4 pb-2.5 pt-0 md:px-6">
            <PracticeControlPanel
              isShuffled={isShuffled}
              flowStatus={flowStatus}
              onToggleShuffle={onShuffleClick}
              onToggleFlow={onFlowClick}
              onOpenSettings={openSettings}
              onRestart={onRestartClick}
            />
          </div>
        </motion.div>
      </div>

      <PracticeSettingsScreen isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} {...settings} />
    </>
  );
}
