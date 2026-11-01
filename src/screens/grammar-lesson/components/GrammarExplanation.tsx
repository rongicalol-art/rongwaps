import { useMemo, type ReactNode } from 'react';
import type { GrammarWordToken } from '../../../types/models';
import { layoutExplanation, type ExplanationExample } from '../../../utils/grammar/explanationLayout';
import { cn } from '../../../utils/cn';
import { GrammarFocusText } from './GrammarFocusText';

interface GrammarExplanationProps {
  text: string;
  terms?: string[];
  contextTokens?: GrammarWordToken[];
  characterPreference: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  className?: string;
}

const BODY = 'text-base font-bold leading-7 text-ui-ink sm:text-lg sm:leading-8';

/** The book's explanation in its own words, laid out: numbered points, and examples on their own lines. */
export function GrammarExplanation({ text, terms, contextTokens, characterPreference, onOpenWord, className }: GrammarExplanationProps) {
  const blocks = useMemo(() => layoutExplanation(text), [text]);
  const focus = (value: string) => (
    <GrammarFocusText
      text={value}
      terms={terms}
      contextTokens={contextTokens}
      characterPreference={characterPreference}
      onOpenWord={onOpenWord}
    />
  );

  return (
    <div className={cn('prose-chinese max-w-none space-y-4 sm:space-y-5', BODY, className)}>
      {blocks.map((block, index) => {
        const body = (
          <>
            {block.text && <p>{focus(block.text)}</p>}
            {block.examples.length > 0 && (
              <ul className={cn('space-y-2 border-l-2 border-ui-divider pl-4', block.text && 'mt-2')}>
                {block.examples.map((example, exampleIndex) => (
                  <ExampleLine key={exampleIndex} example={example}>{focus(example.text)}</ExampleLine>
                ))}
              </ul>
            )}
          </>
        );
        return block.label ? (
          <div key={index} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-xs border-2 border-ui-border font-sans text-xs font-black leading-none text-ui-muted-strong sm:mt-1"
            >
              {block.label}
            </span>
            <span className="sr-only">{block.label}.</span>
            <div className="min-w-0 flex-1">{body}</div>
          </div>
        ) : (
          // Text under a numbered point lines up with the point's words, not its number.
          <div key={index} className={cn(block.continues && '-mt-2 pl-9 sm:-mt-3')}>{body}</div>
        );
      })}
    </div>
  );
}

function ExampleLine({ example, children }: { example: ExplanationExample; children: ReactNode }) {
  return (
    <li className="list-none">
      <p className={cn('font-semibold text-ui-ink-strong', example.wrong && 'text-ui-muted-strong')}>
        {example.wrong && (
          <span className="mr-2 inline-flex size-5 -translate-y-px items-center justify-center rounded-xs border-2 border-ui-border align-middle font-sans text-[11px] font-black leading-none text-ui-muted-strong" aria-label="Wrong:">
            ✗
          </span>
        )}
        {children}
      </p>
      {example.translation && (
        <p className="mt-0.5 text-sm font-semibold leading-6 text-ui-muted-strong sm:text-base">{example.translation}</p>
      )}
    </li>
  );
}
