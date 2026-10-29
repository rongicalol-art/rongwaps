import React from 'react';
import type { PracticePreferences } from '../../../store/useAppStore';
import { DetailShell, ScreenHeader, SettingsDropdownPicker } from '../../../lib/widgets';
import { SettingsPageSection, SettingsToggleRow } from '../settings/PracticeSettingControls';
import { PRACTICE_DOCK_STYLE_OPTIONS } from '../../../store/slices/practicePreferencesSlice';
import { CharacterAppearanceSection } from '../settings/CharacterAppearanceSection';

export interface PracticeSettingsScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  preferences: PracticePreferences;
  onPreferencesChange: (preferences: Partial<PracticePreferences>) => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

/** Snaps any stored rate to the nearest preset (ties go to the slower one). */
export function normalizePronunciationRate(rate: number): number {
  return SPEED_PRESETS.reduce((best, preset) =>
    Math.abs(preset - rate) < Math.abs(best - rate) ? preset : best,
  );
}

type BooleanPreferenceKey =
  | 'showPinyin'
  | 'toneColors'
  | 'hideExamplePinyin'
  | 'showTranslation'
  | 'simpleDefinitions'
  | 'autoPlayAudio'
  | 'speakDefinition'
  | 'replayAudioAfterAnswer'
  | 'autoAdvanceCorrect'
  | 'autoAdvanceWrong'
  | 'dockAutoHide'
  | 'flowExamples'
  | 'flowSpeakTranslation'
  | 'flowRepeatPause'
  | 'sentencesIncludeReadings';

export const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: 'Slowest (0.5x)' },
  { value: 0.75, label: 'Slow (0.75x)' },
  { value: 1.0, label: 'Normal (1.0x)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: 'Fast (1.5x)' },
  { value: 1.75, label: '1.75x' },
  { value: 2.0, label: 'Fastest (2.0x)' },
];

// Slowest first.
const FLIP_DELAY_OPTIONS = [
  { value: '2000', label: 'Slow' },
  { value: '1200', label: 'Normal' },
  { value: '500', label: 'Fast' },
  { value: '200', label: 'Fastest' },
];
const NEXT_CARD_DELAY_OPTIONS = [
  { value: '3000', label: 'Slow' },
  { value: '2000', label: 'Normal' },
  { value: '1000', label: 'Fast' },
  { value: '300', label: 'Fastest' },
];

export function PracticeSettingsScreen({
  isOpen,
  onClose,
  preferences,
  onPreferencesChange,
  ...props
}: PracticeSettingsScreenProps) {
  if (!isOpen) return null;

  const toggle = (key: BooleanPreferenceKey) => () => {
    const patch: Partial<PracticePreferences> = {};
    patch[key] = !preferences[key];
    onPreferencesChange(patch);
  };

  return (
    <DetailShell.Root
      ariaLabel="Practice settings"
      tone="practice"
      windowed
      onEscape={onClose}
    >
      <DetailShell.Scroller className="overscroll-contain">
        <ScreenHeader
          variant="panel"
          tone="practice"
          onClose={onClose}
          title="Study settings"
          maxWidth="none"
        />
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-16 pt-3 sm:px-8 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-9" {...props}>
          {/* Column 1: Characters, Card display, Quiz */}
          <div className="flex flex-col gap-8 sm:gap-9">
            <SettingsPageSection title="Characters">
              <CharacterAppearanceSection
                characterFont={preferences.characterFont}
                onCharacterFontChange={(font) => onPreferencesChange({ characterFont: font })}
              />
            </SettingsPageSection>

            <SettingsPageSection title="Card display">
              <SettingsToggleRow
                checked={preferences.showPinyin}
                onClick={toggle('showPinyin')}
                label="Pinyin"
                className="border-b-0"
              />
              <SettingsToggleRow
                checked={preferences.toneColors}
                onClick={toggle('toneColors')}
                label="Tone colors"
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
              <SettingsToggleRow
                checked={preferences.simpleDefinitions}
                onClick={toggle('simpleDefinitions')}
                label="Simple definitions"
                description="Short, 1-line definitions without synonyms"
                className="border-b-0"
              />
            </SettingsPageSection>

            <SettingsPageSection title="Quiz">
              <SettingsToggleRow
                checked={preferences.quizFormat === 'mixed'}
                onClick={() => onPreferencesChange({ quizFormat: preferences.quizFormat === 'mixed' ? 'fixed' : 'mixed' })}
                label="Mix question types"
                className="border-b-0"
              />
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
          </div>

          {/* Column 2: Audio, Flow pacing, Mistake repeats */}
          <div className="flex flex-col gap-8 sm:gap-9">
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
              <div className="px-2 pt-2">
                <SettingsDropdownPicker
                  label="Speech speed"
                  ariaLabel="Speech speed"
                  value={String(normalizePronunciationRate(preferences.pronunciationRate))}
                  options={SPEED_OPTIONS.map(({ value, label }) => ({ value: String(value), label }))}
                  onChange={(value) => onPreferencesChange({ pronunciationRate: Number(value) })}
                />
              </div>
            </SettingsPageSection>

            <SettingsPageSection title="Flow">
              <div className="flex flex-col gap-4 px-2">
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
              <SettingsToggleRow
                checked={preferences.flowExamples}
                onClick={toggle('flowExamples')}
                label="Play example sentence"
                className="border-b-0"
              />
              <SettingsToggleRow
                checked={preferences.flowSpeakTranslation}
                onClick={toggle('flowSpeakTranslation')}
                label="Speak sentence translation"
                className="border-b-0"
              />
              <SettingsToggleRow
                checked={preferences.flowRepeatPause}
                onClick={toggle('flowRepeatPause')}
                label="Pause to repeat"
                className="border-b-0"
              />
            </SettingsPageSection>

            <SettingsPageSection title="Sentences">
              <SettingsToggleRow
                checked={preferences.sentencesIncludeReadings}
                onClick={toggle('sentencesIncludeReadings')}
                label="Include reading sentences"
                description="Also practise the dialogue, reading and essay lines, not only the lessons' examples."
                className="border-b-0"
              />
            </SettingsPageSection>

            <SettingsPageSection title="Practice dock">
              <div className="px-2">
                <SettingsDropdownPicker
                  label="Dock style"
                  ariaLabel="Practice dock style"
                  value={preferences.dockStyle}
                  options={PRACTICE_DOCK_STYLE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  onChange={(value) => onPreferencesChange({ dockStyle: value as PracticePreferences['dockStyle'] })}
                />
              </div>
              <SettingsToggleRow
                checked={preferences.dockAutoHide}
                onClick={toggle('dockAutoHide')}
                label="Auto Hide"
                className="border-b-0"
              />
            </SettingsPageSection>

            <SettingsPageSection title="Mistake repeats">
              <div className="px-2">
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
              </div>
            </SettingsPageSection>
          </div>
        </div>
      </DetailShell.Scroller>
    </DetailShell.Root>
  );
}
