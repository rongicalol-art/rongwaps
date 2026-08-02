import { PracticeSegmentedControl, PracticeSettingGroup, PracticeToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function SessionSettingsTab({
  preferences,
  onChange,
  characterPreference,
  onCharacterPreferenceChange,
}: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <PracticeSettingGroup title="Mistake recycling" description="Bring missed cards back while the memory is still fresh.">
        <PracticeSegmentedControl
          value={preferences.repeatMistakes}
          onChange={(repeatMistakes) => onChange({ repeatMistakes })}
          options={[
            { value: 'off', label: 'Off', detail: 'No repeats' },
            { value: 'soon', label: 'Soon', detail: 'After 3 cards' },
            { value: 'end', label: 'At end', detail: 'Final review' },
          ]}
        />
      </PracticeSettingGroup>

      <PracticeSettingGroup title="Character format" description="Used throughout cards and learning content.">
        <PracticeSegmentedControl
          value={characterPreference}
          columns={2}
          onChange={onCharacterPreferenceChange}
          options={[
            { value: 'traditional', label: 'Traditional 繁體' },
            { value: 'simplified', label: 'Simplified 简体' },
          ]}
        />
      </PracticeSettingGroup>

      <PracticeSettingGroup title="Difficulty & reveals" description="Choose how much help appears after you reveal an answer.">
        <div className="flex flex-col gap-3">
          <PracticeToggleRow
            checked={preferences.showPinyin}
            onClick={() => onChange({ showPinyin: !preferences.showPinyin })}
            label="Show pinyin"
            description="Keep pronunciation visible on flashcard answers and corrections."
          />
          <PracticeToggleRow
            checked={preferences.showTranslation}
            onClick={() => onChange({ showTranslation: !preferences.showTranslation })}
            label="Show English meaning"
            description="Reveal the translation on the back of flashcards."
          />
        </div>
      </PracticeSettingGroup>

    </div>
  );
}
