import { useState, type HTMLAttributes } from 'react';
import type { GrammarTimeRangeLab as GrammarTimeRangeLabData, GrammarWordToken } from '../../../types/models';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarInteractiveSentence } from '../components/GrammarInteractiveSentence';
import { GrammarLabShell } from '../components/GrammarLabShell';
import { SegmentedControl } from '../../../lib/widgets';

interface GrammarTimeRangeLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarTimeRangeLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarTimeRangeLab({
  lab, characterPreference, showPinyin, showTranslation, contextTokens, onOpenWord, ...props
}: GrammarTimeRangeLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const focus = (text: string) => (
    <GrammarFocusText text={text} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
  );

  return (
    <GrammarLabShell eyebrow="Time-range ruler" title={focus(lab.title)} description={focus(lab.description)} takeaway={focus(lab.takeaway)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl value={selected.id} onChange={setSelectedId} ariaLabel={lab.prompt} options={lab.choices.map(({ id, label }) => ({ value: id, label }))} className="w-full sm:max-w-3xl" />
      </div>
      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface">
        <div className="px-5 py-7 sm:px-9 sm:py-9">
          <div className="grid grid-cols-[auto_minmax(80px,1fr)_auto] items-center gap-3">
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase text-brand-primary">從 · Start</span>
              <span className="mt-2 block font-chinese text-xl font-black text-ui-ink-strong sm:text-2xl">{focus(selected.start)}</span>
            </div>
            <div className="relative h-12">
              <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand-primary/20" />
              <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand-primary" />
              <span className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-primary bg-ui-surface" />
              <span className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-primary bg-ui-surface" />
              <span className="absolute inset-x-0 top-8 text-center text-xs font-black text-ui-muted">{selected.spanLabel}</span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase text-brand-primary">到 · Finish</span>
              <span className="mt-2 block font-chinese text-xl font-black text-ui-ink-strong sm:text-2xl">{focus(selected.end)}</span>
            </div>
          </div>
        </div>
        <GrammarInteractiveSentence choice={selected} characterPreference={characterPreference} showPinyin={showPinyin} showTranslation={showTranslation} contextTokens={contextTokens} onOpenWord={onOpenWord} />
      </div>
    </GrammarLabShell>
  );
}
