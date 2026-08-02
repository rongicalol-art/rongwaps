import { useState, type HTMLAttributes } from 'react';
import type { GrammarSentenceSpine, GrammarWordToken } from '../../types/models';
import { cn } from '../../utils/cn';
import { ContextualChineseText } from './ContextualChineseText';
import { GrammarFocusText } from './GrammarFocusText';
import { GrammarLabShell } from './GrammarLabShell';
import { SegmentedControl } from './SegmentedControl';

interface SentenceSpineProps extends HTMLAttributes<HTMLElement> {
  spine: GrammarSentenceSpine;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

const textFor = (
  characterPreference: 'traditional' | 'simplified',
  traditional: string,
  simplified?: string,
) => characterPreference === 'simplified' && simplified ? simplified : traditional;

export function SentenceSpine({
  spine,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
  className,
  ...props
}: SentenceSpineProps) {
  const [isNegative, setIsNegative] = useState(false);
  const slots = [spine.subject, spine.verb, spine.object] as const;

  return (
    <GrammarLabShell
      eyebrow="Build the sentence"
      title={(
        <GrammarFocusText
          text={spine.title}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      description={(
        <GrammarFocusText
          text={spine.description}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      headerAction={spine.negation && spine.negativeEnglish ? (
          <SegmentedControl
            value={isNegative ? 'negative' : 'positive'}
            onChange={(value) => setIsNegative(value === 'negative')}
            ariaLabel="Sentence meaning switch"
            className="w-full sm:min-w-[220px]"
            options={[
              { value: 'positive', label: 'Positive' },
              {
                value: 'negative',
                label: `With ${textFor(characterPreference, spine.negation.traditional, spine.negation.simplified)}`,
              },
            ]}
          />
      ) : undefined}
      className={className}
      {...props}
    >
      <div className="overflow-hidden rounded-[22px] border border-ui-border bg-ui-surface shadow-[0_3px_0_var(--color-ui-border)]">
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-stretch text-center">
          {slots.map((slot, index) => (
            <div key={slot.role} className="relative min-w-0 border-l border-ui-divider px-2 py-5 first:border-l-0 sm:px-4 sm:py-6">
              <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-ui-muted sm:text-[10px]">{slot.role}</span>
              <span className="mt-1 block text-[11px] font-black leading-tight text-ui-ink sm:text-xs">{slot.label}</span>
              <div className="mt-4 flex min-h-8 items-center justify-center font-chinese text-[22px] font-black leading-tight text-ui-ink-strong sm:text-[28px]">
                {index === 1 && spine.negation && isNegative && (
                  <ContextualChineseText
                    text={textFor(characterPreference, spine.negation.traditional, spine.negation.simplified)}
                    tokens={contextTokens}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                    className="mr-1 inline-flex bg-transparent px-0.5 py-1 leading-none text-brand-primary"
                  />
                )}
                <ContextualChineseText
                  text={textFor(characterPreference, slot.traditional, slot.simplified)}
                  tokens={contextTokens}
                  characterPreference={characterPreference}
                  onOpenWord={onOpenWord}
                />
              </div>
              {showPinyin && (
                <p className="mt-1 text-[10px] font-extrabold leading-tight text-brand-primary sm:text-xs">
                  {index === 1 && isNegative && spine.negation ? `${spine.negation.pinyin} ` : ''}{slot.pinyin}
                </p>
              )}
              <p className="mt-1 text-[10px] font-bold leading-tight text-ui-muted sm:text-xs">{slot.english}</p>
            </div>
          ))}
        </div>

        {showTranslation && (
          <p className="border-t border-ui-divider px-4 py-4 text-sm font-black text-ui-ink sm:px-6 sm:text-base">
            {isNegative && spine.negativeEnglish ? spine.negativeEnglish : spine.positiveEnglish}
          </p>
        )}
      </div>

      {spine.notes && spine.notes.length > 0 && (
        <ul className="mt-4 grid gap-2 text-xs font-bold leading-relaxed text-ui-ink sm:grid-cols-2 sm:text-sm">
          {spine.notes.map((note, index) => (
            <li key={note} className="flex items-start gap-2 rounded-[14px] bg-brand-primary/5 px-3 py-3">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', index === 0 ? 'bg-brand-primary' : 'bg-brand-primary/55')} />
              <GrammarFocusText text={note} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
            </li>
          ))}
        </ul>
      )}
    </GrammarLabShell>
  );
}
