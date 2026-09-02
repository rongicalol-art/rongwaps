import { useState, type HTMLAttributes } from 'react';
import type { GrammarLiveSceneLab as GrammarLiveSceneLabData, GrammarWordToken } from '../../../types/models';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarInteractiveSentence } from '../components/GrammarInteractiveSentence';
import { GrammarLabShell } from '../components/GrammarLabShell';
import { SegmentedControl } from '../../../lib/widgets';

interface GrammarLiveSceneLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarLiveSceneLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarLiveSceneLab({
  lab, characterPreference, showPinyin, showTranslation, contextTokens, onOpenWord, ...props
}: GrammarLiveSceneLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const focus = (text: string) => (
    <GrammarFocusText text={text} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
  );

  return (
    <GrammarLabShell eyebrow="Live classroom" title={focus(lab.title)} description={focus(lab.description)} takeaway={focus(lab.takeaway)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl value={selected.id} onChange={setSelectedId} ariaLabel={lab.prompt} options={lab.choices.map(({ id, label }) => ({ value: id, label }))} className="w-full sm:max-w-3xl" />
      </div>
      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid gap-3 p-5 sm:grid-cols-[0.8fr_1.2fr_0.8fr] sm:items-stretch sm:p-7">
          <div className="flex min-h-24 flex-col justify-center rounded-[16px] bg-ui-canvas px-4 py-3 text-center">
            <span className="text-[10px] font-black uppercase text-ui-muted">Who</span>
            <span className="mt-2 font-chinese text-2xl font-black text-ui-ink-strong">{focus(selected.subject)}</span>
          </div>
          <div className="relative flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-[16px] border-2 border-brand-primary bg-brand-primary/5 px-4 py-4 text-center">
            <span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-black uppercase text-brand-primary">
              <span className="h-2 w-2 rounded-full bg-feedback-success" /> Now
            </span>
            <span className="font-chinese text-[34px] font-black text-brand-primary">{focus(`在${selected.action}`)}</span>
            <span className="mt-1 text-xs font-black text-ui-muted">action happening now</span>
          </div>
          <div className="flex min-h-24 flex-col justify-center rounded-[16px] bg-ui-canvas px-4 py-3 text-center">
            <span className="text-[10px] font-black uppercase text-ui-muted">{selected.place ? 'Where' : 'Action'}</span>
            <span className="mt-2 font-chinese text-xl font-black text-ui-ink-strong">{focus(selected.place ?? selected.action)}</span>
          </div>
        </div>
        <GrammarInteractiveSentence choice={selected} characterPreference={characterPreference} showPinyin={showPinyin} showTranslation={showTranslation} contextTokens={contextTokens} onOpenWord={onOpenWord} />
      </div>
    </GrammarLabShell>
  );
}
