import type { HTMLAttributes } from 'react';
import { SmartSentence } from './SmartSentence';
import type { GrammarWordToken } from '../../types/models';
import { cn } from '../../utils/cn';
import {
  getGrammarSemanticRole,
  getSemanticRoleClasses,
} from '../../utils/grammar/grammarSemanticRoles';

export interface ContextualChineseTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string;
  tokens?: GrammarWordToken[];
  focusTerms?: string[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  /** Override the study face when the surrounding activity uses a sentence font. */
  wordClassName?: string;
}

const NO_TOKENS: GrammarWordToken[] = [];
const NO_FOCUS: string[] = [];

export function ContextualChineseText({
  text,
  tokens = NO_TOKENS,
  focusTerms = NO_FOCUS,
  characterPreference = 'traditional',
  onOpenWord,
  wordClassName = 'font-chinese',
  className,
  ...props
}: ContextualChineseTextProps) {
  return (
    <span className={className} {...props}>
      <SmartSentence
        text={text}
        tokens={tokens}
        characterPreference={characterPreference}
        highlightTerms={focusTerms}
        highlightClassName={(term) => cn('font-black', getSemanticRoleClasses(getGrammarSemanticRole(term)))}
        onWordClick={onOpenWord}
        wordClassName={wordClassName}
      />
    </span>
  );
}
