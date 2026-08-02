import { useState, type HTMLAttributes } from 'react';
import type { GrammarTimelineLab as GrammarTimelineLabData, GrammarWordToken } from '../../types/models';
import { cn } from '../../utils/cn';
import { GrammarFocusText } from './GrammarFocusText';
import { GrammarInteractiveSentence } from './GrammarInteractiveSentence';
import { GrammarLabShell } from './GrammarLabShell';
import { SegmentedControl } from './SegmentedControl';

interface GrammarTimelineLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarTimelineLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarTimelineLab({
  lab,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
  ...props
}: GrammarTimelineLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const focus = (text: string) => (
    <GrammarFocusText
      text={text}
      contextTokens={contextTokens}
      characterPreference={characterPreference}
      onOpenWord={onOpenWord}
    />
  );

  return (
    <GrammarLabShell
      eyebrow="Meaning timeline"
      title={focus(lab.title)}
      description={focus(lab.description)}
      takeaway={focus(lab.takeaway)}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl
          value={selected.id}
          onChange={setSelectedId}
          ariaLabel={lab.prompt}
          options={lab.choices.map(({ id, label }) => ({ value: id, label }))}
          className="w-full sm:max-w-3xl"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-ui-border bg-ui-surface shadow-[0_3px_0_var(--color-ui-border)]">
        <div className="px-5 py-7 sm:px-9 sm:py-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.05em] text-ui-muted">Start</span>
              <p className="mt-1 font-chinese text-lg font-black text-ui-ink-strong">{focus(selected.start)}</p>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-[10px] font-black uppercase tracking-[0.05em]',
                selected.reachesNow ? 'text-brand-primary' : 'text-ui-muted',
              )}>
                {selected.reachesNow ? 'Now' : 'Finished'}
              </span>
              <p className="mt-1 font-chinese text-lg font-black text-ui-ink-strong">{focus(selected.endLabel)}</p>
            </div>
          </div>

          <div className="relative mt-5 h-14">
            <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-ui-border" />
            <div
              className={cn(
                'absolute left-0 top-3 h-2 rounded-full',
                selected.reachesNow ? 'right-0 bg-brand-primary' : 'w-[68%] bg-brand-secondary',
              )}
            />
            <span className="absolute left-0 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-ui-border bg-ui-surface" />
            <span className={cn(
              'absolute top-0 h-8 w-8 rounded-full border-2 bg-ui-surface',
              selected.reachesNow
                ? 'right-0 translate-x-1/2 border-brand-primary'
                : 'left-[68%] -translate-x-1/2 border-brand-secondary',
            )} />
            <span className="absolute inset-x-0 top-8 text-center text-xs font-black text-ui-muted-strong">
              {selected.duration}
            </span>
          </div>
        </div>

        <GrammarInteractiveSentence
          choice={selected}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          contextTokens={contextTokens}
          onOpenWord={onOpenWord}
        />
      </div>
    </GrammarLabShell>
  );
}
