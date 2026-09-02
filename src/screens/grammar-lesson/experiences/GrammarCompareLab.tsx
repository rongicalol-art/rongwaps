import { useState, type HTMLAttributes } from 'react';
import type { GrammarCompareLab as GrammarCompareLabData, GrammarWordToken } from '../../../types/models';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarInteractiveSentence } from '../components/GrammarInteractiveSentence';
import { GrammarLabShell } from '../components/GrammarLabShell';
import { SegmentedControl } from '../../../lib/widgets';

interface GrammarCompareLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarCompareLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarCompareLab({
  lab, characterPreference, showPinyin, showTranslation, contextTokens, onOpenWord, ...props
}: GrammarCompareLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const focus = (text: string) => (
    <GrammarFocusText text={text} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
  );

  return (
    <GrammarLabShell eyebrow="Compare lens" title={focus(lab.title)} description={focus(lab.description)} takeaway={focus(lab.takeaway)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl value={selected.id} onChange={setSelectedId} ariaLabel={lab.prompt} options={lab.choices.map(({ id, label }) => ({ value: id, label }))} className="w-full sm:max-w-3xl" />
      </div>
      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          {[
            { label: selected.leftLabel, value: selected.leftValue, accent: false },
            { label: selected.rightLabel, value: selected.rightValue, accent: true },
          ].map((item) => (
            <div key={item.label} className="rounded-[16px] bg-ui-canvas p-4">
              <div className="flex items-end justify-between gap-2">
                <span className="font-chinese text-lg font-black text-ui-ink-strong">{focus(item.label)}</span>
                <span className="text-xs font-black text-ui-muted">{selected.quality}</span>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-brand-primary-track">
                <div className={`h-full rounded-full ${item.accent ? 'bg-brand-primary' : 'bg-warning'}`} style={{ width: `${item.value}%` }} />
              </div>
              {item.accent && <p className="mt-3 font-chinese text-lg font-black text-brand-primary">{focus(`比較${selected.quality}`)}</p>}
            </div>
          ))}
        </div>
        <GrammarInteractiveSentence choice={selected} characterPreference={characterPreference} showPinyin={showPinyin} showTranslation={showTranslation} contextTokens={contextTokens} onOpenWord={onOpenWord} />
      </div>
    </GrammarLabShell>
  );
}
