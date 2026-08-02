import { PracticeRange } from './PracticeRange';
import { PracticeSettingGroup, PracticeToggleRow } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

export function AudioSettingsTab({ preferences, onChange }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <PracticeSettingGroup title="Chinese pronunciation" description="Audio speed changes independently from the practice pace.">
        <PracticeRange
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
      </PracticeSettingGroup>

      <PracticeSettingGroup title="Audio timing" description="Choose when RongWaps speaks during interactive practice and Flow.">
        <div className="flex flex-col gap-3">
          <PracticeToggleRow checked={preferences.autoPlayAudio} onClick={() => onChange({ autoPlayAudio: !preferences.autoPlayAudio })} label="Play Chinese on each card" description="Pronounces the prompt automatically when it appears." />
          <PracticeToggleRow checked={preferences.replayAudioAfterAnswer} onClick={() => onChange({ replayAudioAfterAnswer: !preferences.replayAudioAfterAnswer })} label="Replay after answering" description="Connects the correction with the spoken word." />
          <PracticeToggleRow checked={preferences.speakDefinition} onClick={() => onChange({ speakDefinition: !preferences.speakDefinition })} label="Speak English in Flow" description="Reads the definition after the card flips." />
        </div>
      </PracticeSettingGroup>
    </div>
  );
}
