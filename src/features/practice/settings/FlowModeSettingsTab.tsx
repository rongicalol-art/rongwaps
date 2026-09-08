import { SettingsControlList, SettingsSliderRow, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}s`;

export function FlowModeSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Audio playback
        </span>
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.autoPlayAudio}
            onClick={() => onChange({ autoPlayAudio: !preferences.autoPlayAudio })}
            label="Speak Chinese"
          />
          <SettingsToggleRow
            checked={preferences.speakDefinition}
            onClick={() => onChange({ speakDefinition: !preferences.speakDefinition })}
            label="Speak English meaning"
          />
        </SettingsControlList>
      </div>

      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Pacing
        </span>
        <SettingsControlList>
          <SettingsSliderRow
            label="Flip delay"
            min={250}
            max={2200}
            step={50}
            value={preferences.flowFrontDelayMs}
            valueLabel={seconds(preferences.flowFrontDelayMs)}
            startLabel="Fast"
            endLabel="Slow"
            onChange={(flowFrontDelayMs) => onChange({ flowFrontDelayMs })}
          />
          <SettingsSliderRow
            label="Next card delay"
            min={500}
            max={3200}
            step={50}
            value={preferences.flowBackDelayMs}
            valueLabel={seconds(preferences.flowBackDelayMs)}
            startLabel="Fast"
            endLabel="Slow"
            onChange={(flowBackDelayMs) => onChange({ flowBackDelayMs })}
          />
        </SettingsControlList>
      </div>
    </div>
  );
}
