import { useState, type HTMLAttributes } from 'react';
import type { GrammarSequenceLab as GrammarSequenceLabData, GrammarWordToken } from '../../../types/models';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarInteractiveSentence } from '../components/GrammarInteractiveSentence';
import { GrammarLabShell } from '../components/GrammarLabShell';
import { SegmentedControl } from '../../../lib/widgets';

interface GrammarSequenceLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarSequenceLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarSequenceLab({
  lab, characterPreference, showPinyin, showTranslation, contextTokens, onOpenWord, ...props
}: GrammarSequenceLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const focus = (text: string) => (
    <GrammarFocusText text={text} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
  );

  return (
    <GrammarLabShell eyebrow="Route builder" title={focus(lab.title)} description={focus(lab.description)} takeaway={focus(lab.takeaway)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl value={selected.id} onChange={setSelectedId} ariaLabel={lab.prompt} options={lab.choices.map(({ id, label }) => ({ value: id, label }))} className="w-full sm:max-w-3xl" />
      </div>
      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-7">
          <div className="rounded-[18px] border-2 border-brand-primary bg-brand-primary/5 p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-black text-white">1</span>
            <span className="mt-3 block font-chinese text-2xl font-black text-ui-ink-strong">{focus(`先${selected.first}`)}</span>
            <span className="mt-1 block text-xs font-black text-ui-muted">first step</span>
          </div>
          <div className="text-center text-xl font-black text-brand-primary" aria-hidden="true">···</div>
          <div className="rounded-[18px] border-2 border-feedback-success bg-feedback-success/5 p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-feedback-success text-sm font-black text-white">2</span>
            <span className="mt-3 block font-chinese text-2xl font-black text-ui-ink-strong">{focus(`再${selected.then}`)}</span>
            <span className="mt-1 block text-xs font-black text-ui-muted">next step</span>
          </div>
        </div>
        <GrammarInteractiveSentence choice={selected} characterPreference={characterPreference} showPinyin={showPinyin} showTranslation={showTranslation} contextTokens={contextTokens} onOpenWord={onOpenWord} />
      </div>
    </GrammarLabShell>
  );
}
