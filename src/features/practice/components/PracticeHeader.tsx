import { useEffect, useState } from 'react';
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
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';

interface PracticeHeaderProps
  extends Omit<ScreenHeaderProps, 'rightAction' | 'variant' | 'tone'>,
    Omit<PracticeHeaderActions, 'onLightbulbClick'> {
  settings: Omit<PracticeSettingsScreenProps, 'isOpen' | 'onClose' | 'className'>;
  /** Flow (auto-advance) is only available in flashcards sessions. */
  showFlow?: boolean;
  activeBookId?: number;
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
  maxWidth = 'none',
  activeBookId: propActiveBookId,
  ...props
}: PracticeHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const setActivityOverlayOpen = useAppStore((state) => state.setActivityOverlayOpen);
  const storeActiveBookId = useAppStore((state) => state.activeBookId);
  const activeBookId = propActiveBookId ?? storeActiveBookId;
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];

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

  const restart = () => {
    onRestartClick?.();
    useAppStore.getState().showFeedbackToast('Restarted');
  };

  const isFlowActive = flowStatus === 'playing';
  const hasSessionControls = Boolean(onSettingsClick || onShuffleClick || onFlowClick);
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
        closeIconColor={activeBook.accentHex}
        closeIconClassName={activeBook.accent}
        rightAction={
          <div className="flex h-11 shrink-0 items-center pointer-events-auto">
            {onRestartClick && (
              <IconActionButton
                size="lg"
                label="Restart"
                title="Restart"
                onClick={restart}
                icon={<AppIcon name="restart" size={22} color={activeBook.accentHex} className={activeBook.accent} />}
              />
            )}
            {hasSessionControls && (
              <DropdownMenu
                label="Session controls"
                open={isMenuOpen}
                onOpenChange={setIsMenuOpen}
                align="end"
                renderTrigger={(triggerProps) => (
                  <IconActionButton
                    {...triggerProps}
                    size="lg"
                    label="Session controls"
                    title="Practice controls"
                    className={isMenuOpen ? 'bg-ui-hover' : undefined}
                    icon={(
                      <>
                        {isFlowActive && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-feedback-success ring-2 ring-ui-surface animate-pulse" />}
                        <AppIcon
                          name="menu"
                          size={24}
                          color={activeBook.accentHex}
                          className={activeBook.accent}
                        />
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
                  icon={<AppIcon name="gear" size={19} />}
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
