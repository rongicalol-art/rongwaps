import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AppIcon,
  DropdownMenu,
  DropdownMenuItem,
  IconActionButton,
  ScreenHeader,
  type ScreenHeaderProps,
} from '../../../lib/widgets';
import type { PracticeSettingsScreenProps } from './PracticeSettingsScreen';
import { PracticeSettingsScreen } from './PracticeSettingsScreen';
import type { PracticeHeaderActions } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { useAppStore } from '../../../store/useAppStore';

interface PracticeHeaderProps extends Omit<ScreenHeaderProps, 'rightAction'>, Omit<PracticeHeaderActions, 'onLightbulbClick'> {
  settings: Omit<PracticeSettingsScreenProps, 'isOpen' | 'onClose' | 'className'>;
  /** Flow (auto-advance) is only available in flashcards sessions. */
  showFlow?: boolean;
}

export function PracticeHeader({
  onSettingsClick,
  onShuffleClick,
  onFlowClick,
  onRestartClick,
  isShuffled,
  flowStatus = 'idle',
  settings,
  showFlow = true,
  currentIndex,
  totalCount,
  ...props
}: PracticeHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTransientCount, setShowTransientCount] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const setIsOverlayOpen = useAppStore((state) => state.setIsOverlayOpen);

  useEffect(() => {
    if (flowStatus === 'playing') setIsMenuOpen(false);
  }, [flowStatus]);

  useEffect(() => {
    setIsOverlayOpen(isSettingsOpen);
    return () => {
      if (isSettingsOpen) setIsOverlayOpen(false);
    };
  }, [isSettingsOpen, setIsOverlayOpen]);

  useEffect(() => {
    if (currentIndex === undefined || totalCount === undefined || totalCount <= 0) return;
    setShowTransientCount(true);
    const timer = setTimeout(() => setShowTransientCount(false), 1000);
    return () => clearTimeout(timer);
  }, [currentIndex, totalCount]);

  const openSettings = () => {
    setIsMenuOpen(false);
    setIsSettingsOpen(true);
    onSettingsClick?.();
  };

  const isFlowActive = flowStatus === 'playing';
  const hasSessionControls = Boolean(onSettingsClick || onShuffleClick || onFlowClick || onRestartClick);
  const flowLabel = isFlowActive ? 'Flow' : flowStatus === 'paused' ? 'Resume' : 'Flow';

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent pb-3 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px]"
      >
        <ScreenHeader
          {...props}
          currentIndex={currentIndex}
          totalCount={totalCount}
          maxWidth="4xl"
          progressSize="compact"
          className={cn('!h-auto !min-h-0 !border-0 !bg-transparent !px-4 !py-1 !shadow-none sm:!px-6 lg:!px-10')}
          rightAction={
            <div className="flex h-10 shrink-0 items-center gap-2 pointer-events-auto">
              {hasSessionControls && (
                <DropdownMenu
                  label="Session controls"
                  open={isMenuOpen}
                  onOpenChange={setIsMenuOpen}
                  align="end"
                  renderTrigger={(triggerProps) => (
                    <IconActionButton
                      {...triggerProps}
                      size="md"
                      className={cn((isMenuOpen || isFlowActive) && 'text-brand-primary hover:text-brand-primary')}
                      label="Session controls"
                      title="Practice controls"
                      icon={(
                        <>
                          {isFlowActive && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-feedback-success ring-2 ring-ui-surface animate-pulse" />}
                          <motion.span
                            animate={{ rotate: isMenuOpen ? 180 : 0 }}
                            transition={reduceMotion ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
                          >
                            <AppIcon name="expand" size={20} />
                          </motion.span>
                        </>
                      )}
                    />
                  )}
                >
                  <DropdownMenuItem
                    icon={<AppIcon name="shuffle" size={19} />}
                    active={Boolean(isShuffled)}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onShuffleClick?.();
                    }}
                  >
                    Shuffle
                  </DropdownMenuItem>
                  {showFlow && (
                    <DropdownMenuItem
                      icon={<AppIcon name={isFlowActive ? "pause" : "flow"} size={19} />}
                      active={isFlowActive}
                      onClick={() => {
                        onFlowClick?.();
                        if (flowStatus === 'playing') setIsMenuOpen(false);
                      }}
                    >
                      {flowLabel}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    icon={<AppIcon name="restart" size={19} />}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRestartClick?.();
                    }}
                  >
                    Restart
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    icon={<AppIcon name="settings" size={19} />}
                    onClick={openSettings}
                  >
                    Study settings
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          }
        />

        <motion.div
          animate={{ opacity: showTransientCount ? 1 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          aria-live="polite"
          className="pointer-events-none select-none sm:hidden"
        >
          {currentIndex !== undefined && totalCount !== undefined && totalCount > 0 && (
            <p className="mt-1 text-center text-xs font-extrabold tabular-nums text-ui-muted">
              {Math.min(currentIndex + 1, totalCount)} / {totalCount}
            </p>
          )}
        </motion.div>
      </div>

      <PracticeSettingsScreen isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} {...settings} />
    </>
  );
}
