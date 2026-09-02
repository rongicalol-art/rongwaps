import { useState } from 'react';
import type { GrammarDiscoveryLab as GrammarDiscoveryLabData, GrammarWordToken } from '../../../types/models';
import { audioService } from '../../../services/audioService';
import { cn } from '../../../utils/cn';
import { AppIcon, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarLabShell } from '../components/GrammarLabShell';

export interface GrammarDiscoveryLabProps extends React.HTMLAttributes<HTMLElement> {
  lab: GrammarDiscoveryLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  focusTerms?: string[];
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

function CorrectionComparison({
  value,
  contextTokens,
  characterPreference,
  onOpenWord,
}: {
  value: string;
  contextTokens?: GrammarWordToken[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
}) {
  const [incorrect, correct] = value.split('→').map((part) => part.trim());

  if (!correct || !onOpenWord) return <span className="text-feedback-danger">{value}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <GrammarFocusText className="whitespace-nowrap text-feedback-danger" text={incorrect} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
      <span className="text-ui-muted-strong" aria-hidden="true">→</span>
      <GrammarFocusText className="whitespace-nowrap text-brand-primary" text={correct} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
    </span>
  );
}

export function GrammarDiscoveryLab({
  lab,
  characterPreference,
  showPinyin,
  showTranslation,
  focusTerms,
  contextTokens,
  onOpenWord,
  className,
  ...props
}: GrammarDiscoveryLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const sentence = characterPreference === 'simplified' && selected.simplified
    ? selected.simplified
    : selected.traditional;

  return (
    <GrammarLabShell
      aria-label={lab.title}
      eyebrow="Try it"
      title={(
        <GrammarFocusText
          text={lab.title}
          terms={focusTerms}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      takeaway={(
        <GrammarFocusText
          text={lab.takeaway}
          terms={focusTerms}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      className={className}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black leading-5 text-ui-ink">{lab.prompt}</p>
        <SegmentedControl
          value={selected.id}
          onChange={setSelectedId}
          ariaLabel={lab.prompt}
          options={lab.choices.map((choice) => ({ value: choice.id, label: choice.label }))}
          className={cn(
            'w-full sm:max-w-3xl',
            lab.choices.length > 3 && 'flex-wrap [&>button]:basis-[calc(50%-0.25rem)] [&_span]:whitespace-normal [&_span]:leading-tight sm:[&>button]:basis-0',
          )}
        />
      </div>

      <div className="mt-5 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-chinese text-[27px] font-black leading-relaxed text-ui-ink-strong sm:text-[34px]">
              {selected.isCorrection
                ? <CorrectionComparison value={sentence} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
                : <GrammarFocusText text={sentence} terms={focusTerms} variant="sentence" contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />}
            </p>
            {showPinyin && (
              <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary sm:text-sm">
                {selected.isCorrection ? <CorrectionComparison value={selected.pinyin} /> : selected.pinyin}
              </p>
            )}
            {showTranslation && <p className="mt-2 text-sm font-black text-ui-ink sm:text-base">{selected.english}</p>}
          </div>
          <IconActionButton
            onClick={() => audioService.speakText(sentence, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.84)}
            variant="quiet"
            size="sm"
            icon={<AppIcon name="audio" size={16} />}
            label={`Listen to ${selected.label}`}
            className="text-ui-muted hover:text-brand-primary"
          />
        </div>
        <p className="mt-5 border-t border-ui-divider pt-4 text-sm font-bold leading-6 text-ui-muted-strong"><GrammarFocusText text={selected.note} terms={focusTerms} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} /></p>
      </div>
    </GrammarLabShell>
  );
}
