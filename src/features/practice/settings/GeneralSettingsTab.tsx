import { SettingsControlList, SettingsRadioRow, SettingsSection, SettingsSliderRow, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

const CharacterLabel = ({ label, chinese }: { label: string; chinese: string }) => (
  <span className="block font-extrabold text-ui-ink">
    {label} <span className="font-chinese">{chinese}</span>
  </span>
);

export function GeneralSettingsTab({
  preferences,
  onChange,
  characterPreference,
  onCharacterPreferenceChange,
}: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title="Cards" icon="cards">
        <SettingsControlList>
          <SettingsRadioRow
            checked={characterPreference === 'traditional'}
            onClick={() => onCharacterPreferenceChange('traditional')}
            label={<CharacterLabel label="Traditional" chinese="繁體" />}
          />
          <SettingsRadioRow
            checked={characterPreference === 'simplified'}
            onClick={() => onCharacterPreferenceChange('simplified')}
            label={<CharacterLabel label="Simplified" chinese="简体" />}
          />
          <SettingsToggleRow
            checked={preferences.showPinyin}
            onClick={() => onChange({ showPinyin: !preferences.showPinyin })}
            label="Show pinyin"
            description="Keep pronunciation visible on flashcard answers and corrections."
          />
          <SettingsToggleRow
            checked={preferences.showTranslation}
            onClick={() => onChange({ showTranslation: !preferences.showTranslation })}
            label="Show English meaning"
            description="Reveal the translation on the back of flashcards."
          />
        </SettingsControlList>
      </SettingsSection>

      <SettingsSection title="Audio" icon="audio">
        <SettingsControlList>
          <SettingsSliderRow
            label="Playback speed"
            min={0.6}
            max={1.5}
            step={0.1}
            value={preferences.pronunciationRate}
            valueLabel={`${preferences.pronunciationRate.toFixed(1)}×`}
            startLabel="Clear"
            endLabel="Fast"
            onChange={(pronunciationRate) => onChange({ pronunciationRate })}
          />
        </SettingsControlList>
      </SettingsSection>

      <SettingsSection title="Mistake recycling" icon="restart">
        <SettingsControlList>
          <SettingsRadioRow
            checked={preferences.repeatMistakes === 'off'}
            onClick={() => onChange({ repeatMistakes: 'off' })}
            label="Off"
            detail="No repeats"
          />
          <SettingsRadioRow
            checked={preferences.repeatMistakes === 'soon'}
            onClick={() => onChange({ repeatMistakes: 'soon' })}
            label="Soon"
            detail="After 3 cards"
          />
          <SettingsRadioRow
            checked={preferences.repeatMistakes === 'end'}
            onClick={() => onChange({ repeatMistakes: 'end' })}
            label="At end"
            detail="Final review"
          />
        </SettingsControlList>
      </SettingsSection>
    </div>
  );
}
