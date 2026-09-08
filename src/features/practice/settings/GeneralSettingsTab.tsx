import { SegmentedControl } from '../../../lib/widgets';
import { SettingsControlList, SettingsSliderRow, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function GeneralSettingsTab({
  preferences,
  onChange,
  characterPreference,
  onCharacterPreferenceChange,
}: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Script Selection */}
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Character Script
        </span>
        <SegmentedControl
          value={characterPreference}
          onChange={onCharacterPreferenceChange}
          ariaLabel="Character script format"
          options={[
            { value: 'traditional', label: <span>Traditional (繁體)</span> },
            { value: 'simplified', label: <span>Simplified (简体)</span> },
          ]}
        />
      </div>

      {/* Card Display Toggles */}
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Display
        </span>
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.showPinyin}
            onClick={() => onChange({ showPinyin: !preferences.showPinyin })}
            label="Pinyin"
          />
          <SettingsToggleRow
            checked={preferences.showTranslation}
            onClick={() => onChange({ showTranslation: !preferences.showTranslation })}
            label="English meaning"
          />
        </SettingsControlList>
      </div>

      {/* Audio Speed */}
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Audio Speed
        </span>
        <SettingsControlList>
          <SettingsSliderRow
            label="Speech speed"
            min={0.6}
            max={1.5}
            step={0.1}
            value={preferences.pronunciationRate}
            valueLabel={`${preferences.pronunciationRate.toFixed(1)}×`}
            startLabel="Slow"
            endLabel="Fast"
            onChange={(pronunciationRate) => onChange({ pronunciationRate })}
          />
        </SettingsControlList>
      </div>

      {/* Mistake Recycling */}
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Mistake Repeats
        </span>
        <SegmentedControl
          value={preferences.repeatMistakes}
          onChange={(repeatMistakes) => onChange({ repeatMistakes })}
          ariaLabel="Mistake recycling preference"
          options={[
            { value: 'off', label: <span>Off</span> },
            { value: 'soon', label: <span>Soon (3 cards)</span> },
            { value: 'end', label: <span>At end</span> },
          ]}
        />
      </div>
    </div>
  );
}
