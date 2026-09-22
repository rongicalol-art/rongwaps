import type { HTMLAttributes } from 'react';
import type { GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { ContextualChineseText } from '../../../lib/widgets';

export interface GrammarFocusTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string;
  terms?: string[];
  variant?: 'title' | 'body' | 'sentence';
  contextTokens?: GrammarWordToken[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CJK_REGEX = /[\u3400-\u9FFF\uF900-\uFAFF]/;

export function GrammarFocusText({
  text,
  terms = [],
  className,
  contextTokens,
  characterPreference,
  onOpenWord,
  ...props
}: GrammarFocusTextProps) {
  if (onOpenWord) {
    return (
      <ContextualChineseText
        text={text}
        tokens={contextTokens}
        focusTerms={terms}
        characterPreference={characterPreference}
        onOpenWord={onOpenWord}
        className={className}
        {...props}
      />
    );
  }
  const uniqueTerms = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (uniqueTerms.length === 0) return <span className={className} {...props}>{text}</span>;

  const focusSet = new Set(uniqueTerms);
  const parts = text.split(new RegExp(`(${uniqueTerms.map(escapeRegExp).join('|')})`, 'g'));

  return (
    <span className={className} {...props}>
      {parts.map((part, index) => focusSet.has(part) ? (
        <mark
          key={`${part}-${index}`}
          className={cn(
            'box-decoration-clone font-black text-brand-primary',
            CJK_REGEX.test(part) ? 'font-chinese' : 'font-sans',
          )}
        >
          {part}
        </mark>
      ) : part)}
    </span>
  );
}
