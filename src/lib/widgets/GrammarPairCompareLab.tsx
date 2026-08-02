import { useState, type HTMLAttributes, type ReactNode } from 'react';
import type { GrammarPairCompareLab as GrammarPairCompareLabData, GrammarWordToken } from '../../types/models';
import { GrammarFocusText } from './GrammarFocusText';
import { GrammarInteractiveSentence } from './GrammarInteractiveSentence';
import { GrammarLabShell } from './GrammarLabShell';
import { SegmentedControl } from './SegmentedControl';

interface GrammarPairCompareLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarPairCompareLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarPairCompareLab({
  lab,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
  ...props
}: GrammarPairCompareLabProps) {
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
      eyebrow="Side-by-side comparison"
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
        <div className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:p-7">
          {[
            { label: selected.leftLabel, value: selected.leftValue, tone: 'bg-brand-primary' },
            { label: selected.rightLabel, value: selected.rightValue, tone: 'bg-brand-secondary' },
          ].map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-[18px] bg-ui-canvas p-4">
              <div className="flex items-end justify-between gap-3">
                <span className="font-chinese text-lg font-black text-ui-ink-strong">{focus(item.label)}</span>
                <span className="text-xs font-black text-ui-muted-strong">{selected.quality}</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-ui-border">
                <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          )).reduce<ReactNode[]>((items, item, index) => (
            index === 0
              ? [item]
              : [
                  ...items,
                  <span key="compare-marker" className="text-center font-chinese text-xl font-black text-brand-primary">比</span>,
                  item,
                ]
          ), [])}
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
