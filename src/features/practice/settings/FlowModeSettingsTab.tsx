import { SettingsControlList, SettingsSection, SettingsSliderRow, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}s`;

export function FlowModeSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title="What Flow speaks" icon="pronounce">
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.autoPlayAudio}
            onClick={() => onChange({ autoPlayAudio: !preferences.autoPlayAudio })}
            label="Speak Chinese"
            description="Pronounces the Chinese prompt on the front, and on practice cards."
          />
          <SettingsToggleRow
            checked={preferences.speakDefinition}
            onClick={() => onChange({ speakDefinition: !preferences.speakDefinition })}
            label="Speak definition"
            description="Reads the English definition after the card flips."
          />
          <SettingsToggleRow
            checked={false}
            disabled
            label="Speak sentence"
            description="Coming soon."
          />
        </SettingsControlList>
      </SettingsSection>

      <SettingsSection title="Flow pacing" icon="flow">
        <SettingsControlList>
          <SettingsSliderRow
            label="Next speed"
            min={250}
            max={2200}
            step={50}
            value={preferences.flowFrontDelayMs}
            valueLabel={seconds(preferences.flowFrontDelayMs)}
            startLabel="Fast"
            endLabel="Slow"
            hint="Delay before the definition (or sentence) follows the Chinese."
            onChange={(flowFrontDelayMs) => onChange({ flowFrontDelayMs })}
          />
          <SettingsSliderRow
            label="Next card speed"
            min={500}
            max={3200}
            step={50}
            value={preferences.flowBackDelayMs}
            valueLabel={seconds(preferences.flowBackDelayMs)}
            startLabel="Fast"
            endLabel="Slow"
            hint="Delay before the next card appears."
            onChange={(flowBackDelayMs) => onChange({ flowBackDelayMs })}
          />
        </SettingsControlList>
      </SettingsSection>
    </div>
  );
}
