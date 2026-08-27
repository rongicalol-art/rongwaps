import { useState } from 'react';
import { ContextualChineseText } from '../../../lib/widgets';
import { GrammarFocusText } from './GrammarFocusText';
import type { GrammarContrastItem, GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface GrammarParticleWorkshopProps {
  items: GrammarContrastItem[];
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

const displayText = (
  characterPreference: 'traditional' | 'simplified',
  traditional: string,
  simplified?: string,
) => characterPreference === 'simplified' && simplified ? simplified : traditional;

export function GrammarParticleWorkshop({
  items,
  characterPreference,
  contextTokens,
  onOpenWord,
}: GrammarParticleWorkshopProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) return null;

  return (
    <div className="overflow-hidden rounded-[20px] border-2 border-ui-border bg-ui-surface">
      <div className="border-b border-ui-divider px-4 py-4 sm:px-5">
        <p className="text-base font-black text-ui-ink-strong">See the difference</p>
        <p className="mt-1 text-sm font-bold leading-6 text-ui-muted-strong">
          Choose an example, then notice what the grammar changes.
        </p>
      </div>

      <div className="grid md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.6fr)]">
        <div className="flex gap-2 overflow-x-auto border-b border-ui-divider bg-ui-canvas p-3 md:flex-col md:border-b-0 md:border-r">
          {items.map((item) => {
            const isSelected = item.id === selected.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'min-w-max rounded-[11px] border-2 px-3 py-2 text-left text-sm font-black outline-none transition focus-visible:ring-4 focus-visible:ring-brand-primary/20 md:min-w-0',
                  isSelected
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-ui-border bg-ui-surface text-ui-ink hover:border-brand-primary',
                )}
              >
                <GrammarFocusText
                  text={item.label}
                  contextTokens={contextTokens}
                  characterPreference={characterPreference}
                  onOpenWord={onOpenWord}
                />
              </button>
            );
          })}
        </div>

        <article className="p-5 sm:p-6">
          <p className="text-xs font-black uppercase text-brand-primary">Meaning in context</p>
          <p className="mt-3 font-chinese text-xl font-black leading-relaxed text-ui-ink-strong sm:text-2xl">
            <ContextualChineseText
              text={displayText(characterPreference, selected.traditional, selected.simplified)}
              tokens={contextTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </p>
          <p className="mt-2 text-xs font-bold text-brand-primary sm:text-[13px]">{selected.pinyin}</p>
          <p className="mt-1 text-base font-black text-ui-ink">{selected.english}</p>
          <div className="mt-4 rounded-r-[12px] border-l-4 border-brand-primary bg-brand-primary/8 px-4 py-3">
            <p className="text-sm font-black text-ui-ink-strong">Why it works</p>
            <p className="mt-1 text-sm font-bold leading-6 text-ui-muted-strong">
              <GrammarFocusText
                text={selected.note}
                contextTokens={contextTokens}
                characterPreference={characterPreference}
                onOpenWord={onOpenWord}
              />
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
