import { debugLogger } from '../../utils/debugLogger';
import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, BottomDrawer, ConfirmationDialog, SegmentedControl } from '../../lib/widgets';
import { isIosDevice, isStandaloneDisplay } from '../../utils/pwaInstall';

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
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());
  }, [isOpen]);

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
      debugLogger.error('Supabase', 'Learning progress reset failed:', error);
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

          <div className="rounded-feature border-2 border-ui-border bg-ui-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ui-muted">Practice controls</p>
            <p className="mt-1 text-sm font-extrabold leading-relaxed text-ui-ink">
              Adjust audio, pinyin, translations, pace, and answer timing from Session controls during practice.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ui-muted">App Experience</p>
            {isStandalone ? (
              <div className="flex items-center gap-3 rounded-feature border-2 border-feedback-success/30 bg-feedback-success/5 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-feedback-success text-white shadow-ambient-sm">
                  <AppIcon name="check" size={18} />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-black text-ui-ink-strong">Installed as Native App</p>
                  <p className="text-xs font-bold text-ui-muted-strong">Running full-screen without Safari browser bars.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-feature border-2 border-ui-border bg-ui-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-primary-soft text-brand-primary">
                    <AppIcon name="deviceMobile" size={20} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-black text-ui-ink-strong">
                      {isIos ? 'Use Full-Screen (Hide Safari Bar)' : 'Install Web App'}
                    </p>
                    <p className="text-xs font-bold text-ui-muted-strong">
                      Run RongWaps like a native app without the address bar.
                    </p>
                  </div>
                </div>

                {isIos ? (
                  <div className="flex flex-col gap-2 rounded-control border border-ui-border/60 bg-ui-canvas p-3 text-xs font-bold text-ui-ink">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-black text-white">
                        1
                      </span>
                      <span>
                        Tap the{' '}
                        <span className="inline-flex items-center gap-1 font-black text-ui-ink-strong">
                          <AppIcon name="share" size={13} className="text-brand-primary" /> Share
                        </span>{' '}
                        button in Safari.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-black text-white">
                        2
                      </span>
                      <span>
                        Select{' '}
                        <span className="inline-flex items-center gap-1 font-black text-ui-ink-strong">
                          <AppIcon name="plus" size={13} className="text-brand-primary" /> Add to Home Screen
                        </span>
                        .
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-ui-muted-strong">
                    Tap your browser menu and choose "Install App" or "Add to Home Screen".
                  </p>
                )}
              </div>
            )}
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
          description="This permanently deletes vocabulary reviews, SRS intervals, lesson progress, and daily history. Your saved words and custom cards stay intact."
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
