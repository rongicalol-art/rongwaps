import { PracticeSettingGroup, PracticeToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function AnswerSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <PracticeSettingGroup title="Listening choices" description="Control whether listening answers are graded immediately.">
        <PracticeToggleRow
          checked={preferences.instantChoiceCheck}
          onClick={() => onChange({ instantChoiceCheck: !preferences.instantChoiceCheck })}
          label="Check listening answers as soon as I choose"
          description="Tapping an option immediately shows whether it was right."
        />
      </PracticeSettingGroup>

      <PracticeSettingGroup title="Auto-next" description="Decide when the Continue button can be skipped.">
        <div className="flex flex-col gap-3">
          <PracticeToggleRow
            checked={preferences.autoAdvanceCorrect}
            onClick={() => onChange({ autoAdvanceCorrect: !preferences.autoAdvanceCorrect })}
            label="Continue after correct answers"
            description="Moves on after the correct-feedback timer finishes."
          />
          <PracticeToggleRow
            checked={preferences.autoAdvanceWrong}
            onClick={() => onChange({ autoAdvanceWrong: !preferences.autoAdvanceWrong })}
            label="Continue after wrong answers"
            description="Keeps the correction visible for the longer mistake timer."
          />
        </div>
        <p className="rounded-[16px] bg-[#FFF7D6] px-4 py-3 text-xs font-bold leading-snug text-ui-ink">
          Auto-next pauses whenever you open settings, a mnemonic, or a character breakdown.
        </p>
      </PracticeSettingGroup>
    </div>
  );
}
