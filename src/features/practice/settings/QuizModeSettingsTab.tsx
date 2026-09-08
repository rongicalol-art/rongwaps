import { SettingsControlList, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function QuizModeSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Auto-advance
        </span>
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.autoAdvanceCorrect}
            onClick={() => onChange({ autoAdvanceCorrect: !preferences.autoAdvanceCorrect })}
            label="After correct answers"
          />
          <SettingsToggleRow
            checked={preferences.autoAdvanceWrong}
            onClick={() => onChange({ autoAdvanceWrong: !preferences.autoAdvanceWrong })}
            label="After wrong answers"
          />
        </SettingsControlList>
      </div>

      <div className="space-y-1.5">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Audio feedback
        </span>
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.replayAudioAfterAnswer}
            onClick={() => onChange({ replayAudioAfterAnswer: !preferences.replayAudioAfterAnswer })}
            label="Replay audio on answer"
          />
        </SettingsControlList>
      </div>
    </div>
  );
}
