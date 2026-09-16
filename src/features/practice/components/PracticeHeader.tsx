import { useEffect, useState } from 'react';
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

interface PracticeHeaderProps
  extends Omit<ScreenHeaderProps, 'rightAction' | 'variant' | 'tone'>,
    Omit<PracticeHeaderActions, 'onLightbulbClick'> {
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
  maxWidth = '2xl',
  ...props
}: PracticeHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const setActivityOverlayOpen = useAppStore((state) => state.setActivityOverlayOpen);

  useEffect(() => {
    if (flowStatus === 'playing') setIsMenuOpen(false);
  }, [flowStatus]);

  useEffect(() => {
    // The study-settings panel covers the practice dock; register it as its own
    // overlay source so closing it cannot clear another surface's overlay.
    setActivityOverlayOpen('practice-settings', isSettingsOpen);
    return () => setActivityOverlayOpen('practice-settings', false);
  }, [isSettingsOpen, setActivityOverlayOpen]);

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
      <ScreenHeader
        variant="window"
        tone="practice"
        maxWidth={maxWidth}
        {...props}
        currentIndex={currentIndex}
        totalCount={totalCount}
        progressSize="compact"
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

      <PracticeSettingsScreen isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} {...settings} />
    </>
  );
}
