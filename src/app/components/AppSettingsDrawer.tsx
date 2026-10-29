import { debugLogger } from '../../utils/debug/debugLogger';
import { useEffect, useState } from 'react';
import { ConfirmationDialog, DisclosureLine, Drawer, SettingsDropdownPicker } from '../../lib/widgets';
import { isIosDevice, isStandaloneDisplay } from '../../utils/browser/pwaInstall';
import { useAppStore } from '../../store/useAppStore';
import {
  CharacterAppearanceSection,
  SPEED_OPTIONS,
  SettingsPageSection,
  SettingsToggleRow,
  normalizePronunciationRate,
} from '../../features/practice';
import { SettingsAccountSection } from './SettingsAccountSection';
import { setToneOrigin } from '../../hooks/useReviewTone';

export interface AppSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onResetProgress: () => void | Promise<void>;
}

export function AppSettingsDrawer({ isOpen, onClose, onResetProgress }: AppSettingsDrawerProps) {
  const characterFont = useAppStore((state) => state.characterFont);
  const appearance = useAppStore((state) => state.appearance);
  const showPinyin = useAppStore((state) => state.showPinyin);
  const toneColors = useAppStore((state) => state.toneColors);
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const showOnline = useAppStore((state) => state.showOnline);
  const setShowOnline = useAppStore((state) => state.setShowOnline);
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
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        tone="canvas"
        size="full"
        mdPlacement="side"
        heightClassName="max-h-[88dvh] md:max-h-full"
      >
            <div className="flex flex-col gap-8 pb-8 text-left">
              <SettingsPageSection title="Appearance">
                <SettingsToggleRow
                  checked={appearance === 'dark'}
                  onClick={(event) => {
                    setToneOrigin(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2);
                    updatePreferences({ appearance: appearance === 'dark' ? 'light' : 'dark' });
                  }}
                  label="Dark mode"
                  className="border-b-0"
                />
              </SettingsPageSection>

              <SettingsPageSection title="Characters">
                <CharacterAppearanceSection
                  characterFont={characterFont}
                  onCharacterFontChange={(font) => updatePreferences({ characterFont: font })}
                />
                <p className="mt-3 text-center font-chinese text-2xl text-ui-ink-strong">我是學生，謝謝老師。</p>
              </SettingsPageSection>

              <SettingsPageSection title="While studying">
                <SettingsToggleRow checked={showPinyin} onClick={() => updatePreferences({ showPinyin: !showPinyin })} label="Pinyin" className="border-b-0" />
                <SettingsToggleRow checked={toneColors} onClick={() => updatePreferences({ toneColors: !toneColors })} label="Tone colors" className="border-b-0" />
                <SettingsToggleRow checked={autoPlayAudio} onClick={() => updatePreferences({ autoPlayAudio: !autoPlayAudio })} label="Play audio automatically" className="border-b-0" />
                <div className="px-2 pt-2">
                  <SettingsDropdownPicker
                    label="Speech speed"
                    ariaLabel="Speech speed"
                    value={String(normalizePronunciationRate(pronunciationRate))}
                    options={SPEED_OPTIONS.map(({ value, label }) => ({ value: String(value), label }))}
                    onChange={(value) => updatePreferences({ pronunciationRate: Number(value) })}
                  />
                </div>
              </SettingsPageSection>

              <SettingsPageSection title="Study together">
                <SettingsToggleRow checked={showOnline} onClick={() => setShowOnline(!showOnline)} label="Show me online" className="border-b-0" />
              </SettingsPageSection>

              {!isStandalone && (
                <SettingsPageSection title="App">
                  <DisclosureLine title="Add to Home Screen" description="Full screen, no browser bar" className="border-y-0 px-2">
                    <p className="py-3 text-sm font-bold text-ui-ink">
                      {isIos ? 'Tap Share in Safari, then choose Add to Home Screen.' : 'Open your browser menu and choose Install app.'}
                    </p>
                  </DisclosureLine>
                </SettingsPageSection>
              )}

              <SettingsAccountSection onNavigate={onClose} onResetProgress={() => setIsConfirmResetOpen(true)} />
            </div>
      </Drawer>

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
