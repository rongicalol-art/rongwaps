import React from 'react';
import type { PracticePreferences } from '../../../store/usePracticePreferencesStore';
import { cn } from '../../../utils/cn';
import { DetailShell, ScreenHeader, SettingsDropdownPicker } from '../../../lib/widgets';
import { SettingsToggleRow } from '../settings/PracticeSettingControls';
import { ScriptPreviewCard } from '../settings/ScriptPreviewCard';

export interface PracticeSettingsScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  preferences: PracticePreferences;
  onPreferencesChange: (preferences: Partial<PracticePreferences>) => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

export function normalizePronunciationRate(rate: number): number {
  if (rate <= 0.85) return 0.75;
  if (rate >= 1.15) return 1.25;
  return 1.0;
}

type BooleanPreferenceKey =
  | 'showPinyin'
  | 'hideExamplePinyin'
  | 'showTranslation'
  | 'autoPlayAudio'
  | 'speakDefinition'
  | 'replayAudioAfterAnswer'
  | 'autoAdvanceCorrect'
  | 'autoAdvanceWrong';

const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.75, label: 'Slow (0.75x)' },
  { value: 1.0, label: 'Normal (1.0x)' },
  { value: 1.25, label: 'Fast (1.25x)' },
];

const FLIP_DELAY_OPTIONS = [
  { value: '500', label: 'Fast' },
  { value: '1200', label: 'Normal' },
  { value: '2000', label: 'Slow' },
];
const NEXT_CARD_DELAY_OPTIONS = [
  { value: '1000', label: 'Fast' },
  { value: '2000', label: 'Normal' },
  { value: '3000', label: 'Slow' },
];

/** Duolingo-style flat section: quiet eyebrow heading + hairline, then bare control rows. */
function SettingsPageSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col', className)}>
      <h2 className="text-xs font-black uppercase tracking-widest text-ui-muted-strong">{title}</h2>
      <div className="mb-1 mt-2 h-0.5 w-full rounded-full bg-ui-divider" />
      <div className="flex flex-col gap-1 pl-4">{children}</div>
    </section>
  );
}

export function PracticeSettingsScreen({
  isOpen,
  onClose,
  preferences,
  onPreferencesChange,
  characterPreference,
  onCharacterPreferenceChange,
  ...props
}: PracticeSettingsScreenProps) {
  if (!isOpen) return null;

  const toggle = (key: BooleanPreferenceKey) => () => {
    const patch: Partial<PracticePreferences> = {};
    patch[key] = !preferences[key];
    onPreferencesChange(patch);
  };

  const fontSample = characterPreference === 'simplified' ? '听说读写' : '聽說讀寫';

  return (
    <DetailShell.Root
      ariaLabel="Practice settings"
      tone="practice"
      position="fixed"
      workspaceOffset={true}
      zIndexClassName="z-dialog"
      portalTarget={typeof document !== 'undefined' ? document.body : null}
      onEscape={onClose}
    >
      <DetailShell.Scroller className="overscroll-contain">
        <ScreenHeader
          variant="panel"
          tone="practice"
          onClose={onClose}
          title="Study settings"
          maxWidth="2xl"
        />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-5 pb-16 pt-2 sm:px-8" {...props}>
              <SettingsPageSection title="Character script">
                <div
                  role="radiogroup"
                  aria-label="Character script format"
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                >
                  <ScriptPreviewCard
                    selected={characterPreference === 'traditional'}
                    heading="Traditional"
                    sample="聽說讀寫"
                    label="Traditional characters"
                    onClick={() => onCharacterPreferenceChange('traditional')}
                  />
                  <ScriptPreviewCard
                    selected={characterPreference === 'simplified'}
                    heading="Simplified"
                    sample="听说读写"
                    label="Simplified characters"
                    onClick={() => onCharacterPreferenceChange('simplified')}
                  />
                </div>
              </SettingsPageSection>

              <SettingsPageSection title="Character font">
                <div
                  role="radiogroup"
                  aria-label="Character font style"
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                >
                  <ScriptPreviewCard
                    selected={preferences.characterFont === 'huninn'}
                    heading="Rounded"
                    sample={fontSample}
                    label="Rounded characters"
                    sampleClassName={characterPreference === 'simplified' ? 'font-chinese-rounded-sc font-normal' : 'font-chinese-huninn font-normal'}
                    onClick={() => onPreferencesChange({ characterFont: 'huninn' })}
                  />
                  <ScriptPreviewCard
                    selected={preferences.characterFont === 'kai'}
                    heading="Kai"
                    sample={fontSample}
                    label="Calligraphy kai characters"
                    sampleClassName={
                      characterPreference === 'simplified'
                        ? 'font-kaiti-sc'
                        : 'font-kaiti-tc'
                    }
                    onClick={() => onPreferencesChange({ characterFont: 'kai' })}
                  />
                </div>
              </SettingsPageSection>

              <SettingsPageSection title="Card display">
                <SettingsToggleRow
                  checked={preferences.showPinyin}
                  onClick={toggle('showPinyin')}
                  label="Pinyin"
                  className="border-b-0"
                />
                <SettingsToggleRow
                  checked={preferences.hideExamplePinyin}
                  onClick={toggle('hideExamplePinyin')}
                  label="Hide pinyin on example sentences"
                  className="border-b-0"
                />
                <SettingsToggleRow
                  checked={preferences.showTranslation}
                  onClick={toggle('showTranslation')}
                  label="English meaning"
                  className="border-b-0"
                />
              </SettingsPageSection>

              <SettingsPageSection title="Audio">
                <SettingsToggleRow
                  checked={preferences.autoPlayAudio}
                  onClick={toggle('autoPlayAudio')}
                  label="Speak Chinese"
                  className="border-b-0"
                />
                <SettingsToggleRow
                  checked={preferences.speakDefinition}
                  onClick={toggle('speakDefinition')}
                  label="Speak English meaning"
                  className="border-b-0"
                />
                <SettingsToggleRow
                  checked={preferences.replayAudioAfterAnswer}
                  onClick={toggle('replayAudioAfterAnswer')}
                  label="Replay audio after answering"
                  className="border-b-0"
                />
                <div className="pt-2.5">
                  <SettingsDropdownPicker
                    label="Speech speed"
                    ariaLabel="Speech speed"
                    value={String(normalizePronunciationRate(preferences.pronunciationRate))}
                    options={SPEED_OPTIONS.map(({ value, label }) => ({ value: String(value), label }))}
                    onChange={(value) => onPreferencesChange({ pronunciationRate: Number(value) })}
                  />
                </div>
              </SettingsPageSection>

              <SettingsPageSection title="Flow pacing">
                <div className="flex flex-col gap-4">
                  <SettingsDropdownPicker
                    label="Flip delay"
                    ariaLabel="Flip delay"
                    value={String(preferences.flowFrontDelayMs)}
                    options={FLIP_DELAY_OPTIONS}
                    onChange={(value) => onPreferencesChange({ flowFrontDelayMs: Number(value) })}
                  />
                  <SettingsDropdownPicker
                    label="Next card delay"
                    ariaLabel="Next card delay"
                    value={String(preferences.flowBackDelayMs)}
                    options={NEXT_CARD_DELAY_OPTIONS}
                    onChange={(value) => onPreferencesChange({ flowBackDelayMs: Number(value) })}
                  />
                </div>
              </SettingsPageSection>

              <SettingsPageSection title="Quiz">
                <SettingsToggleRow
                  checked={preferences.autoAdvanceCorrect}
                  onClick={toggle('autoAdvanceCorrect')}
                  label="Auto-advance after correct answers"
                  className="border-b-0"
                />
                <SettingsToggleRow
                  checked={preferences.autoAdvanceWrong}
                  onClick={toggle('autoAdvanceWrong')}
                  label="Auto-advance after wrong answers"
                  className="border-b-0"
                />
              </SettingsPageSection>

              <SettingsPageSection title="Mistake repeats">
                <SettingsDropdownPicker
                  label="Mistake repeats"
                  ariaLabel="Mistake recycling preference"
                  value={preferences.repeatMistakes}
                  options={[
                    { value: 'off', label: 'Off' },
                    { value: 'soon', label: 'Soon (3 cards)' },
                    { value: 'end', label: 'At end' },
                  ]}
                  onChange={(value) => onPreferencesChange({ repeatMistakes: value as PracticePreferences['repeatMistakes'] })}
                />
              </SettingsPageSection>
            </div>
      </DetailShell.Scroller>
    </DetailShell.Root>
  );
}
