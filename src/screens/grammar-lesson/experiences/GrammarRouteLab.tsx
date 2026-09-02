import { useState, type HTMLAttributes } from 'react';
import { audioService } from '../../../services/audioService';
import type { GrammarRouteLab as GrammarRouteLabData, GrammarWordToken } from '../../../types/models';
import { AppIcon, ContextualChineseText, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import { GrammarFocusText } from '../components/GrammarFocusText';
import { GrammarLabShell } from '../components/GrammarLabShell';

interface GrammarRouteLabProps extends HTMLAttributes<HTMLElement> {
  lab: GrammarRouteLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

const textFor = (
  preference: 'traditional' | 'simplified',
  traditional: string,
  simplified?: string,
) => preference === 'simplified' && simplified ? simplified : traditional;

export function GrammarRouteLab({
  lab,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
  className,
  ...props
}: GrammarRouteLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const sentence = textFor(characterPreference, selected.traditional, selected.simplified);
  const usesCome = /來|来/.test(sentence);
  const directionText = usesCome ? '來' : '去';
  const direction = contextTokens.find((token) => (
    token.traditional === directionText || token.simplified === directionText
  )) ?? {
    id: `${selected.id}-direction`,
    traditional: directionText,
    simplified: directionText === '來' ? '来' : '去',
    pinyin: usesCome ? 'lái' : 'qù',
    meaning: usesCome ? 'come' : 'go',
  };
  const stops = [
    selected.origin && { label: 'From', token: selected.origin },
    selected.transport && { label: 'How', token: selected.transport },
    { label: 'To', token: selected.destination },
    { label: 'Direction', token: direction },
    selected.purpose && { label: 'Purpose', token: selected.purpose },
  ].filter(Boolean) as Array<{ label: string; token: GrammarWordToken }>;

  return (
    <GrammarLabShell
      eyebrow="Build the trip"
      title={(
        <GrammarFocusText
          text={lab.title}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      description={(
        <GrammarFocusText
          text={lab.description}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      takeaway={(
        <GrammarFocusText
          text={lab.takeaway}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      className={className}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl
          value={selected.id}
          onChange={setSelectedId}
          ariaLabel={lab.prompt}
          options={lab.choices.map((choice) => ({ value: choice.id, label: choice.label }))}
          className="w-full sm:max-w-3xl"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid grid-cols-2 px-3 py-4 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none sm:px-6 sm:py-6">
          {stops.map(({ label, token }, index) => (
            <div key={`${selected.id}-${label}`} className="relative min-w-0 px-2 py-3 text-center sm:px-3">
              {index > 0 && <span className="absolute -left-1.5 top-1/2 z-10 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-primary bg-ui-surface sm:block" aria-hidden="true" />}
              {index > 0 && <span className="absolute -left-1/2 right-1/2 top-1/2 hidden h-px bg-brand-primary/25 sm:block" aria-hidden="true" />}
              <span className="relative block text-[9px] font-black uppercase tracking-[0.1em] text-ui-muted">{label}</span>
              <ContextualChineseText
                text={textFor(characterPreference, token.traditional, token.simplified)}
                tokens={contextTokens}
                characterPreference={characterPreference}
                onOpenWord={onOpenWord}
                className="relative mt-2 block font-chinese text-[23px] font-black text-ui-ink-strong sm:text-[27px]"
              />
              {showPinyin && <span className="relative mt-1 block text-[10px] font-bold leading-tight text-brand-primary sm:text-xs">{token.pinyin}</span>}
            </div>
          ))}
        </div>

        <div className="flex items-start justify-between gap-3 border-t border-ui-divider px-5 py-5 sm:px-7 sm:py-6">
          <div className="min-w-0">
            <p className="font-chinese text-[27px] font-black leading-relaxed text-ui-ink-strong sm:text-[34px]">
              <ContextualChineseText text={sentence} tokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
            </p>
            {showPinyin && <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary sm:text-sm">{selected.pinyin}</p>}
            {showTranslation && <p className="mt-2 text-sm font-bold text-ui-ink sm:text-base">{selected.english}</p>}
          </div>
          <IconActionButton
            size="sm"
            variant="quiet"
            onClick={() => audioService.speakText(sentence, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.86)}
            icon={<AppIcon name="audio" size={17} />}
            label={`Listen to ${selected.label}`}
            className="text-ui-muted hover:text-brand-primary"
          />
        </div>
        <p className="mx-5 mb-5 rounded-[14px] bg-brand-primary/5 px-4 py-3 text-sm font-bold leading-6 text-ui-muted-strong sm:mx-7 sm:mb-6">
          <GrammarFocusText text={selected.note} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
        </p>
      </div>
    </GrammarLabShell>
  );
}
