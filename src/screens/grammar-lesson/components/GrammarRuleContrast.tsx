import type { HTMLAttributes } from 'react';
import { useId } from 'react';
import type { GrammarRuleContrast as GrammarRuleContrastData, GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { AppIcon, ContextualChineseText } from '../../../lib/widgets';

export interface GrammarRuleContrastProps extends HTMLAttributes<HTMLElement> {
  contrast: GrammarRuleContrastData;
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarRuleContrast({
  contrast,
  characterPreference,
  contextTokens,
  onOpenWord,
  className,
  ...props
}: GrammarRuleContrastProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn('mt-7', className)}
      {...props}
    >
      <h2 id={headingId} className="text-lg font-black text-ui-ink-strong">
        {contrast.title}
      </h2>
      {contrast.description && (
        <p className="mt-1 text-sm font-bold leading-6 text-ui-muted-strong">{contrast.description}</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contrast.examples.map((example) => {
          const isCorrect = example.status === 'correct';
          const text = characterPreference === 'simplified' && example.simplified
            ? example.simplified
            : example.traditional;
          return (
            <article
              key={example.id}
              className={cn(
                'rounded-[18px] border-2 bg-ui-surface px-4 py-4',
                isCorrect ? 'border-feedback-success' : 'border-feedback-danger',
              )}
            >
              <p className={cn(
                'flex items-center gap-2 text-xs font-black uppercase tracking-[0.04em]',
                isCorrect ? 'text-feedback-success' : 'text-feedback-danger',
              )}>
                <AppIcon name={isCorrect ? 'check' : 'error'} size={18} />
                {example.label}
              </p>
              <p className="mt-3 font-chinese text-xl font-black text-ui-ink-strong sm:text-2xl">
                <ContextualChineseText
                  text={text}
                  tokens={contextTokens}
                  characterPreference={characterPreference}
                  onOpenWord={onOpenWord}
                />
              </p>
              <p className="mt-2 text-sm font-bold leading-5 text-ui-muted-strong">{example.explanation}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
