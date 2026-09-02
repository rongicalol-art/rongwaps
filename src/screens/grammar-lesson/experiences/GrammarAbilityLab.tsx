import { useState, type HTMLAttributes } from 'react';
import type { GrammarAbilityLab as GrammarAbilityLabData, GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { SegmentedControl } from '../../../lib/widgets';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarInteractiveSentence } from '../components/GrammarInteractiveSentence';
import { GrammarLabShell } from '../components/GrammarLabShell';

interface GrammarAbilityLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarAbilityLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

const gateStyle = {
  open: { label: '能 · open', className: 'border-feedback-success bg-feedback-success/5 text-feedback-success' },
  limited: { label: '只能 · limited', className: 'border-feedback-warning bg-feedback-warning/5 text-ui-ink-strong' },
  closed: { label: '不能 · closed', className: 'border-feedback-danger bg-feedback-danger/5 text-feedback-danger' },
} as const;

export function GrammarAbilityLab({
  lab, characterPreference, showPinyin, showTranslation, contextTokens, onOpenWord, ...props
}: GrammarAbilityLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const gate = gateStyle[selected.gate];
  const focus = (text: string) => (
    <GrammarFocusText text={text} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
  );

  return (
    <GrammarLabShell eyebrow="Can-do gate" title={focus(lab.title)} description={focus(lab.description)} takeaway={focus(lab.takeaway)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl value={selected.id} onChange={setSelectedId} ariaLabel={lab.prompt} options={lab.choices.map(({ id, label }) => ({ value: id, label }))} className="w-full sm:max-w-3xl" />
      </div>
      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid gap-4 p-5 sm:grid-cols-[0.7fr_1.3fr] sm:items-stretch sm:p-7">
          <div className="rounded-control bg-ui-canvas p-5">
            <span className="text-[10px] font-black uppercase text-ui-muted">Real-world factor</span>
            <span className="mt-3 block text-xl font-black capitalize text-ui-ink-strong">{selected.factor}</span>
            <span className="mt-1 block text-sm font-bold text-ui-muted">body, rules, or situation decides</span>
          </div>
          <div className={cn('flex min-h-36 flex-col items-center justify-center rounded-[18px] border-2 p-5 text-center', gate.className)}>
            <span className="text-[11px] font-black uppercase">{gate.label}</span>
            <span className="mt-3 font-chinese text-[34px] font-black">{focus(`${selected.gate === 'closed' ? '不能' : selected.gate === 'limited' ? '只能' : '能'}${selected.verb}`)}</span>
          </div>
        </div>
        <GrammarInteractiveSentence choice={selected} characterPreference={characterPreference} showPinyin={showPinyin} showTranslation={showTranslation} contextTokens={contextTokens} onOpenWord={onOpenWord} />
      </div>
    </GrammarLabShell>
  );
}
