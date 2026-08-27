import { AppIcon } from '../../../lib/widgets';
import { SettingsControlList, SettingsSection, SettingsToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function QuizModeSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title="Auto-next" icon="forward">
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.autoAdvanceCorrect}
            onClick={() => onChange({ autoAdvanceCorrect: !preferences.autoAdvanceCorrect })}
            label="Continue after correct answers"
            description="Moves on after the correct-feedback timer finishes. On by default."
          />
          <SettingsToggleRow
            checked={preferences.autoAdvanceWrong}
            onClick={() => onChange({ autoAdvanceWrong: !preferences.autoAdvanceWrong })}
            label="Continue after wrong answers"
            description="Keeps the correction visible for the longer mistake timer."
          />
        </SettingsControlList>
        <p className="flex items-start gap-1.5 px-1 text-xs font-bold leading-snug text-ui-muted">
          <AppIcon name="lightbulb" size={14} className="mt-0.5 shrink-0" />
          Auto-next keeps going while you adjust settings — it only pauses while a character breakdown is open.
        </p>
      </SettingsSection>

      <SettingsSection title="After answering" icon="check">
        <SettingsControlList>
          <SettingsToggleRow
            checked={preferences.replayAudioAfterAnswer}
            onClick={() => onChange({ replayAudioAfterAnswer: !preferences.replayAudioAfterAnswer })}
            label="Replay after answering"
            description="Connects the correction with the spoken word."
          />
        </SettingsControlList>
      </SettingsSection>
    </div>
  );
}
