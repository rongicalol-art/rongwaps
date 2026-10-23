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
import { PracticeFaces, RaceBar, useRaceFill } from '../../social';

interface PracticeHeaderProps
  extends Omit<ScreenHeaderProps, 'rightAction' | 'variant' | 'tone'>,
    Omit<PracticeHeaderActions, 'onLightbulbClick'> {
  settings: Omit<PracticeSettingsScreenProps, 'isOpen' | 'onClose' | 'className'>;
  /** Flow (auto-advance) is only available in flashcards sessions. */
  showFlow?: boolean;
  activeBookId?: number;
  /** Close / menu icons in the muted neutral instead of the book accent. */
  quietControls?: boolean;
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
  quietControls = false,
  ...props
}: PracticeHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const setActivityOverlayOpen = useAppStore((state) => state.setActivityOverlayOpen);
  const storeActiveBookId = useAppStore((state) => state.activeBookId);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const updatePracticePreferences = useAppStore((state) => state.updatePracticePreferences);
  const showFeedbackToast = useAppStore((state) => state.showFeedbackToast);
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

  const racing = useRaceFill();
  const iconColor = quietControls ? undefined : activeBook.accentHex;
  const iconClassName = quietControls ? 'text-ui-muted' : activeBook.accent;
  const isFlowActive = flowStatus === 'playing';
  const hasSessionControls = !racing && Boolean(onSettingsClick || onShuffleClick || onFlowClick || onRestartClick);
  const raceStatus = useAppStore(state => state.raceStatus);
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
        closeIconColor={iconColor}
        closeIconClassName={iconClassName}
        progressOverlay={<RaceBar />}
        {...(racing ? { accentBgClassName: 'bg-transparent' } : {})}
        rightAction={
          <div className="flex h-11 shrink-0 items-center pointer-events-auto">
            <PracticeFaces />
            {racing && raceStatus !== 'live' && <span role="status" className="px-2 text-sm font-bold text-ui-muted-strong">Reconnecting…</span>}
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
                          color={iconColor}
                          className={iconClassName}
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
                {onRestartClick && (
                  <DropdownMenuItem
                    icon={<AppIcon name="restart" size={19} />}
                    onClick={() => {
                      setIsMenuOpen(false);
                      restart();
                    }}
                  >
                    Restart
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  icon={<AppIcon name="sparkles" size={19} />}
                  active={Boolean(simpleDefinitions)}
                  onClick={() => {
                    const next = !simpleDefinitions;
                    updatePracticePreferences({ simpleDefinitions: next });
                    showFeedbackToast(next ? 'Simple definitions on' : 'Full definitions on');
                    setIsMenuOpen(false);
                  }}
                >
                  Simple definitions
                </DropdownMenuItem>
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
