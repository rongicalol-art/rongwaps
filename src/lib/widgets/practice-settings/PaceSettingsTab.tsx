import { getPaceLabel, type PracticePreset } from '../../../store/usePracticePreferencesStore';
import { cn } from '../../../utils/cn';
import { PracticeRange } from './PracticeRange';
import { PracticeSettingGroup } from './PracticeSettingControls';
import type { PracticeSettingsTabProps } from './types';

const PRESETS: Array<{
  value: Exclude<PracticePreset, 'custom'>;
  label: string;
  description: string;
}> = [
  { value: 'comfortable', label: 'Comfortable', description: 'Manual and roomy' },
  { value: 'balanced', label: 'Balanced', description: 'Smart auto-next' },
  { value: 'sprint', label: 'Sprint', description: 'Fast and focused' },
];

const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}s`;

export function PaceSettingsTab({ preferences, onChange, onPaceChange, onApplyPreset }: PracticeSettingsTabProps) {
  return (
    <div className="flex flex-col gap-7">
      <PracticeSettingGroup title="Quick setup" description="Start with a complete rhythm, then fine-tune anything below.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => {
            const selected = preferences.preset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onApplyPreset(preset.value)}
                className={cn(
                  'rounded-[18px] border-b-[5px] px-4 py-4 text-left transition-all outline-none active:translate-y-[5px] active:border-b-0 focus-visible:ring-4 focus-visible:ring-[#BFE9FF]',
                  selected
                    ? 'border-[#1899D6] bg-[#1CB0F6] text-white'
                    : 'border-ui-border bg-ui-surface text-ui-ink',
                )}
              >
                <span className="block font-black">{preset.label}</span>
                <span className={cn('mt-0.5 block text-xs font-bold', selected ? 'text-white/80' : 'text-ui-muted')}>
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </PracticeSettingGroup>

      <PracticeSettingGroup title="Master pace" description="Drag once to tune feedback, transitions, and hands-free Flow together.">
        <PracticeRange
          label="Practice rhythm"
          min={0}
          max={100}
          value={preferences.pace}
          onChange={onPaceChange}
          valueLabel={getPaceLabel(preferences.pace)}
          startLabel="Careful"
          endLabel="Rapid"
        />
        <p className="px-1 text-xs font-bold text-ui-muted">
          Correct answers advance after a brief feedback moment when auto-next is enabled.
        </p>
      </PracticeSettingGroup>

      <details className="group rounded-[20px] border-b-2 border-ui-border bg-ui-surface px-4 py-1 open:pb-5">
        <summary className="cursor-pointer list-none py-4 font-black text-ui-ink marker:hidden">
          <span className="flex items-center justify-between">
            Advanced timing
            <span className="text-[#1CB0F6] transition-transform group-open:rotate-90">›</span>
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t-2 border-ui-divider pt-4">
          <PracticeRange label="Wrong-answer time" min={800} max={5000} step={100} value={preferences.wrongDelayMs} valueLabel={seconds(preferences.wrongDelayMs)} onChange={(wrongDelayMs) => onChange({ wrongDelayMs })} />
          <PracticeRange label="Between cards" min={0} max={1500} step={50} value={preferences.betweenCardsMs} valueLabel={seconds(preferences.betweenCardsMs)} onChange={(betweenCardsMs) => onChange({ betweenCardsMs })} />
          <PracticeRange label="Flow front side" min={250} max={2200} step={50} value={preferences.flowFrontDelayMs} valueLabel={seconds(preferences.flowFrontDelayMs)} onChange={(flowFrontDelayMs) => onChange({ flowFrontDelayMs })} />
          <PracticeRange label="Flow answer side" min={500} max={3200} step={50} value={preferences.flowBackDelayMs} valueLabel={seconds(preferences.flowBackDelayMs)} onChange={(flowBackDelayMs) => onChange({ flowBackDelayMs })} />
        </div>
      </details>
    </div>
  );
}
