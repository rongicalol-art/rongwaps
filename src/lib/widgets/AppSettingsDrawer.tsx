import { useEffect, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { AppIcon } from './AppIcon';
import { ActionButton } from './ActionButton';
import { SegmentedControl } from './SegmentedControl';
import { ConfirmationDialog } from './ConfirmationDialog';

export interface AppSettingsDrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onResetProgress: () => void | Promise<void>;
}

export function AppSettingsDrawer({
  isOpen,
  onClose,
  characterPreference,
  onCharacterPreferenceChange,
  onResetProgress,
  className = '',
  ...props
}: AppSettingsDrawerProps) {
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setIsConfirmResetOpen(false);
    setResetError(null);
  }, [isOpen]);

  const handleResetProgress = async () => {
    setIsResetting(true);
    setResetError(null);
    try {
      await onResetProgress();
      setIsConfirmResetOpen(false);
      onClose();
    } catch (error) {
      console.error('Learning progress reset failed:', error);
      setResetError('Your progress was not reset. Check your connection and try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <BottomDrawer isOpen={isOpen} onClose={onClose} title="Settings" ariaLabel="App settings">
        <div className={`flex flex-col gap-6 pb-6 text-left ${className}`} {...props}>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ui-muted">Chinese Character Format</p>
            <SegmentedControl
              value={characterPreference}
              onChange={onCharacterPreferenceChange}
              ariaLabel="Chinese character format"
              className="min-h-13"
              options={[
                { value: 'simplified', label: <span>Simplified <span className="font-chinese">(简体)</span></span> },
                { value: 'traditional', label: <span>Traditional <span className="font-chinese">(繁體)</span></span> },
              ]}
            />
          </div>

          <div className="rounded-[24px] border-2 border-ui-border bg-ui-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ui-muted">Practice controls</p>
            <p className="mt-1 text-[15px] font-extrabold leading-relaxed text-ui-ink">
              Adjust audio, pinyin, translations, pace, and answer timing from Session controls during practice.
            </p>
          </div>

          <div className="h-[3px] w-full bg-ui-canvas" />

          <div className="flex flex-col gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-feedback-danger">Danger Zone</p>
            <ActionButton
              variant="secondary"
              fullWidth
              onClick={() => setIsConfirmResetOpen(true)}
              className="border-feedback-danger/25 py-4 text-feedback-danger hover:bg-feedback-danger/10"
            >
              <AppIcon name="trash" size={18} />
              Reset all learning progress
            </ActionButton>
          </div>
        </div>
      </BottomDrawer>

      {isConfirmResetOpen && (
        <ConfirmationDialog
          title="Reset all learning progress?"
          description="This permanently deletes vocabulary reviews, SRS intervals, lesson progress, streaks, XP, and daily history. Your saved words and custom cards stay intact."
          confirmLabel="Reset everything"
          onConfirm={handleResetProgress}
          onCancel={() => {
            setResetError(null);
            setIsConfirmResetOpen(false);
          }}
          isConfirming={isResetting}
          errorMessage={resetError}
        />
      )}
    </>
  );
}
